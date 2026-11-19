/**
 * 框架 AI 会话状态机（自持数据源，不依赖旧对话组件的 hook）
 *
 * 通道：SSE 优先（/session/<id>/stream：status 全量帧＋events 增量帧＋live 帧＋done 收口，
 * 300ms 级实时；25s 保活），SSE 建连失败/断流时回落 2s 轮询（status + events(sinceSeq)），
 * 断流 10s 起退避重连（带 sinceSeq，回放自动补齐断档；成功即停轮询）。
 * 永久回落轮询的两类形态同旧对话栈：真 HTTP 401/404 与 200＋错误信封（非 text/event-stream）。
 * 职责：
 * - sessionStart：发起自主会话（业务页面也可自持 sessionStart，本 hook 同样支持）；
 * - upload：多附件顺序上传（multipart 字段 file），进度回写 chips；成功后立即补拉一次，
 *   让 file_attached 文件卡尽快上屏（正常也在下一轮轮询到达）；
 * - poll：轮询兜底通道；终态收口（不空转）；会话切换/卸载清理定时器与在途流；
 * - answer/resume/stop：作答 ask_user、暂停后补指导语恢复、停止会话。
 *
 * 状态归属：sessionId 由调用方持有（ref 传入）；hooks 只消费与清理，不改写父级句柄。
 */
import { computed, onScopeDispose, reactive, ref, watch, type Ref } from 'vue'


import { buildAgentViewItems, payloadText } from './events'
import {
  isTerminalStatus,
  type AgentEventFrame,
  type AgentFileRef,
  type AgentQuestionT,
  type AgentSessionSnapshot,
  type AgentViewItem,
  type AttachmentItem
} from './types'

import { name } from '@/../package.json'
import {
  sessionAnswer as apiSessionAnswer,
  sessionEvents as apiSessionEvents,
  sessionFiles as apiSessionFiles,
  sessionPause as apiSessionPause,
  sessionResume as apiSessionResume,
  sessionStart as apiSessionStart,
  sessionStatus as apiSessionStatus,
  sessionStop as apiSessionStop,
  sessionUpload
} from '@/framework/apis/agent'
import { getSseStream, readSseStream } from '@/framework/utils/sse'

const POLL_INTERVAL = 2000

/** SSE 保活间隔（刷新 status 快照＋兼作后端 touchView 在场信号） */
const KEEPALIVE_INTERVAL = 25000

/** 断流重连基准间隔；连续失败逐级退避至上限，重连成功复位 */
const RECONNECT_BASE = 10000
const RECONNECT_MAX = 30000

/** SSE 终态兜底收口延后：给 done 帧与建连回放的历史 events 帧留出处理窗（见 scheduleTerminalFallback） */
const TERMINAL_FALLBACK_DELAY = 2000

export interface UseAgentConversationOptions {
  /** 轮询间隔（毫秒），缺省 2000 */
  pollInterval?: number
}

/** 本地上传条目唯一键（时间戳+随机尾，避免同名文件冲突） */
const newUploadUid = () => `upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

/** 终态事件 → 状态快照状态（status 接口持续失败时的事件兜底口径） */
const TERMINAL_EVENT_STATUS: Record<string, 'FINISHED' | 'FAILED' | 'STOPPED'> = {
  finish: 'FINISHED',
  error: 'FAILED',
  stopped: 'STOPPED'
}

/** 连续轮询失败达到该次数后在面板内提示（单次抖动不打扰） */
const POLL_FAILURE_NOTICE = 3

export const useAgentConversation = (
  sessionId: Ref<string | null>,
  options: UseAgentConversationOptions = {}
) => {
  const pollInterval = options.pollInterval || POLL_INTERVAL

  const status = ref<AgentSessionSnapshot | null>(null)
  const events = ref<AgentEventFrame[]>([])
  const attachments = ref<AttachmentItem[]>([])
  const polling = ref(false)
  /** 连续轮询失败次数（status/events 任一失败即累计；成功一轮清零） */
  const pollFailureCount = ref(0)
  /**
   * 在途上传数按代记账（G4）：切会话 reset 丢弃旧代计数，旧上传的 finally 只减发起代，
   * 不会把新会话的在途计数抹零。
   */
  const uploadingGenCounts = new Map<number, number>()
  const uploadingCount = ref(0)
  /** 控制动作成功后的本地乐观状态（轮询尚未追上时收敛 UI，防窗口内二次 resume 覆盖指导语） */
  const controlStatus = ref<'PAUSED' | 'RUNNING' | null>(null)

  let sinceSeq = 0
  let timer: ReturnType<typeof setInterval> | null = null
  let ticking = false
  /** 代际守卫：会话切换/卸载后，在途响应不落新会话 */
  let gen = 0

  // ==================== SSE 通道状态 ====================

  /** SSE 通道是否活跃（建连成功起、终态收口/断流回落止；活跃期轮询已停） */
  const sse = ref(false)
  /** 流代际：每次建连/收口/reset 递增，在途流协程据此识别自身已被作废 */
  let streamGen = 0
  let streamController: AbortController | null = null
  let keepaliveTimer: ReturnType<typeof setInterval> | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let reconnectDelay = RECONNECT_BASE
  /** 401/404 或错误信封后永久停 SSE（本次会话生命周期内只走轮询；reset 复位） */
  let sseDisabled = false

  /** 按代增减在途上传数；只有当前代的计数投影到 uploadingCount */
  const bumpUploading = (myGen: number, delta: number) => {
    const next = Math.max(0, (uploadingGenCounts.get(myGen) || 0) + delta)
    if (next === 0) uploadingGenCounts.delete(myGen)
    else uploadingGenCounts.set(myGen, next)
    uploadingCount.value = uploadingGenCounts.get(gen) || 0
  }

  const items = computed<AgentViewItem[]>(() => buildAgentViewItems(events.value))
  const sessionStatus = computed(() => controlStatus.value || status.value?.status || 'RUNNING')
  const isTerminal = computed(() => isTerminalStatus(sessionStatus.value))
  const liveText = computed(() => (isTerminal.value ? '' : status.value?.live || ''))
  const waitingQuestion = computed<AgentQuestionT | null>(
    () => (status.value?.questions || []).find(q => q.status === 'waiting') || null
  )
  /** 轮询连续失败达阈值：面板内提示并提供手动刷新 */
  const pollError = computed(() => pollFailureCount.value >= POLL_FAILURE_NOTICE)
  /** 是否有上传在途（附件按钮/拖拽落区禁用依据） */
  const isUploading = computed(() => uploadingCount.value > 0)

  // ==================== 轮询 ====================

  /**
   * 事件流终态兜底：status 接口持续失败时，用 finish/error/stopped 事件直接收口，
   * 避免面板永久停在“执行中”。返回是否已据事件置终态。
   */
  const applyTerminalEventFallback = (id: string, list: AgentEventFrame[]): boolean => {
    for (const ev of list) {
      const terminal = TERMINAL_EVENT_STATUS[ev.type]
      if (!terminal) continue
      const text = payloadText(ev.payload)
      status.value = {
        ...(status.value || {}),
        sessionId: id,
        status: terminal,
        summary: terminal === 'FINISHED' ? text : null,
        error: terminal === 'FINISHED' ? null : text
      }
      // 终态优先：解除控制动作的乐观状态，避免结论卡被本地覆盖挡住
      controlStatus.value = null
      pollFailureCount.value = 0
      stopPolling()
      return true
    }
    return false
  }

  /**
   * 应用服务端状态快照（轮询/保活/SSE status 帧共用）：终态事件先到时，不让并发的旧快照
   * 把结论回退成“执行中”；快照追平（或终态）后解除控制动作的乐观状态。
   */
  const applySnapshot = (snapshot: AgentSessionSnapshot | null, terminalFromEvents = false) => {
    if (terminalFromEvents && !isTerminalStatus(snapshot?.status)) return
    status.value = snapshot
    if (controlStatus.value
      && (isTerminalStatus(snapshot?.status) || snapshot?.status === controlStatus.value)) {
      controlStatus.value = null
    }
  }

  const tick = async () => {
    const myGen = gen
    const id = sessionId.value
    if (!id || ticking) return
    ticking = true
    try {
      // 两路独立结算：status 失败不丢已到手的事件，事件失败也不挡状态刷新
      const [evResult, stResult] = await Promise.allSettled([
        apiSessionEvents(id, sinceSeq),
        apiSessionStatus(id)
      ])
      if (myGen !== gen || id !== sessionId.value) return
      let failed = false
      let terminalFromEvents = false
      if (evResult.status === 'fulfilled') {
        const evResp: any = evResult.value
        const list = ((evResp?.payload as AgentEventFrame[] | undefined) || [])
          .filter(ev => ev && typeof ev.seq === 'number' && ev.seq > sinceSeq)
        if (list.length > 0) {
          events.value.push(...list)
          sinceSeq = list[list.length - 1].seq
          terminalFromEvents = applyTerminalEventFallback(id, list)
        }
      } else {
        failed = true
      }
      if (stResult.status === 'fulfilled') {
        const stResp: any = stResult.value
        applySnapshot((stResp?.payload as AgentSessionSnapshot | undefined) || null, terminalFromEvents)
        if (isTerminalStatus(status.value?.status)) stopPolling()
      } else {
        failed = true
      }
      pollFailureCount.value = failed ? pollFailureCount.value + 1 : 0
    } catch {
      // 非预期异常同样计入连续失败；下一轮重试（错误提示由 request 层统一按信封处理）
      pollFailureCount.value += 1
    } finally {
      if (myGen === gen) ticking = false
    }
  }

  const stopPolling = () => {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
    polling.value = false
  }

  const startPolling = () => {
    if (timer || !sessionId.value) return
    polling.value = true
    void tick()
    timer = setInterval(() => void tick(), pollInterval)
  }

  // ==================== SSE 通道（优先） ====================

  const stopKeepalive = () => {
    if (keepaliveTimer) {
      clearInterval(keepaliveTimer)
      keepaliveTimer = null
    }
  }

  const clearReconnect = () => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
  }

  const abortStream = () => {
    if (streamController) {
      streamController.abort()
      streamController = null
    }
  }

  /**
   * 终态兜底收口的延后闸（防 done 帧丢失的面板挂死）：🔴 建连回放里 status 帧先于全量
   * events 帧到达（hub.open 先发 status 再逐条回放事件），终态会话若在 status 帧当场
   * shutdown，会把紧随其后的历史事件回放整段 abort 掉——回放只剩结论卡的元凶。故终态
   * 先起 2s 延后闸：期间任何 events/done 帧都取消它（done 正常必到）；真丢了 done 帧
   * （断流且未重连）才由闸收口，轮询兜底照样能补拉。
   */
  let terminalFallbackTimer: ReturnType<typeof setTimeout> | null = null
  const clearTerminalFallback = () => {
    if (terminalFallbackTimer) {
      clearTimeout(terminalFallbackTimer)
      terminalFallbackTimer = null
    }
  }
  const scheduleTerminalFallback = () => {
    const myGen = gen
    if (terminalFallbackTimer) return
    terminalFallbackTimer = setTimeout(() => {
      terminalFallbackTimer = null
      if (myGen === gen && sessionId.value && isTerminalStatus(status.value?.status)) shutdown()
    }, TERMINAL_FALLBACK_DELAY)
  }

  /** 全停（终态收口/会话清空/卸载共用）：作废在途流协程、关流、清保活/重连定时器、停轮询 */
  const shutdown = () => {
    streamGen++
    abortStream()
    stopKeepalive()
    clearReconnect()
    stopPolling()
    clearTerminalFallback()
    sse.value = false
  }

  /** SSE 保活：25s 一次 status 快照（兼作后端 touchView 在场信号）＋终态兜底收口；
   *  活跃期 live 由流帧实时维护，保活整包覆写前保留之（防 live 回退成快照里的旧值） */
  const startKeepalive = (id: string) => {
    stopKeepalive()
    keepaliveTimer = setInterval(async () => {
      try {
        const stResp: any = await apiSessionStatus(id)
        if (sessionId.value !== id) return
        let snapshot = (stResp?.payload as AgentSessionSnapshot | undefined) || null
        if (snapshot && sse.value && status.value?.live != null && !isTerminalStatus(snapshot.status)) {
          snapshot = { ...snapshot, live: status.value.live }
        }
        applySnapshot(snapshot)
        if (isTerminalStatus(status.value?.status)) shutdown()
      } catch {
        // 保活失败静默（下轮重试；断流感知由读循环负责）
      }
    }, KEEPALIVE_INTERVAL)
  }

  /** 安排断流重连（带当前 sinceSeq，建连回放自动补齐断档）；已终态/已禁用/已安排则跳过 */
  const scheduleReconnect = () => {
    if (sseDisabled || reconnectTimer) return
    if (!sessionId.value || isTerminalStatus(status.value?.status)) return
    const delay = reconnectDelay
    reconnectDelay = Math.min(reconnectDelay + RECONNECT_BASE, RECONNECT_MAX)
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null
      void startStream()
    }, delay)
  }

  /** 通道回落：先起轮询兜底；401/404 与错误信封永久停 SSE，其余安排退避重连 */
  const fallbackToPolling = (httpStatus?: number) => {
    if (httpStatus === 401 || httpStatus === 404) sseDisabled = true
    abortStream()
    stopKeepalive()
    sse.value = false
    startPolling()
    if (sseDisabled) clearReconnect()
    else scheduleReconnect()
  }

  /** SSE 建连＋逐帧分发：live→status.live 局部更新、events→按 seq 去重增量、
   *  status→快照（终态兜底收口）、done→终态快照＋收口（不再重连） */
  const startStream = async () => {
    const id = sessionId.value
    if (!id) return
    if (sseDisabled) {
      startPolling()
      return
    }
    const myGen = ++streamGen
    const myController = new AbortController()
    streamController = myController
    try {
      const resp = await getSseStream(
        `${import.meta.env.VITE_baseURL}/${name}/web/api/agent/session/${id}/stream?sinceSeq=${sinceSeq}`,
        myController.signal
      )
      if (myGen !== streamGen) {
        // 已被 reset/收口作废：取消响应体防连接悬漏（cancel 失败亦静默）
        resp.body?.cancel().catch(() => { })
        return
      }
      if (!resp.ok || !resp.body) {
        fallbackToPolling(resp.status)
        return
      }
      // 信封嗅探：SYSTEM/BIZ 型业务错误实返 200＋JSON 信封（非 text/event-stream）——
      // 取 status.code 后永久回落轮询（过期会话重连只会无限循环）
      const ct = resp.headers.get('content-type') || ''
      if (!ct.includes('text/event-stream')) {
        let code: number | undefined
        try {
          code = JSON.parse(await resp.text())?.status?.code
        } catch {
          // 非 JSON body（网关异常页等）：同样按错误信封永久回落
        }
        console.warn('[agent-sse] 建连收到非 SSE 响应，永久回落轮询（status.code=' + code + '）')
        sseDisabled = true
        fallbackToPolling()
        return
      }
      // 建连成功：停轮询（若在兜底）、复位退避、起保活
      stopPolling()
      reconnectDelay = RECONNECT_BASE
      startKeepalive(id)
      sse.value = true
      pollFailureCount.value = 0
      let gotDone = false
      await readSseStream(resp.body, (event, data) => {
        if (myGen !== streamGen) return
        if (event === 'live') {
          let frame: { text?: string } | null = null
          try {
            frame = JSON.parse(data)
          } catch {
            return
          }
          if (status.value && frame) status.value = { ...status.value, live: frame.text }
        } else if (event === 'events') {
          let ev: AgentEventFrame | null = null
          try {
            ev = JSON.parse(data) as AgentEventFrame
          } catch {
            return
          }
          // 按 seq 去重（轮询/SSE 交替窗口防重），只收增量
          if (ev && typeof ev.seq === 'number' && ev.seq > sinceSeq) {
            events.value.push(ev)
            sinceSeq = ev.seq
            // 回放仍在推进＝流没死：终态兜底闸继续等 done 帧（若有挂起的闸则解除）
            clearTerminalFallback()
            if (applyTerminalEventFallback(id, [ev])) scheduleTerminalFallback()
          }
        } else if (event === 'status') {
          let snapshot: AgentSessionSnapshot | null = null
          try {
            snapshot = JSON.parse(data)
          } catch {
            return
          }
          applySnapshot(snapshot)
          // 终态兜底收口（防 done 帧丢失）：🔴 不能当场 shutdown——建连回放里 status 帧
          // 先于全量 events 帧，终态会话当场收口会把后面的历史回放整段 abort 掉
          // （回放只剩结论卡的元凶）；延后 2s，期间 done/events 帧照常处理
          if (isTerminalStatus(status.value?.status)) scheduleTerminalFallback()
        } else if (event === 'done') {
          gotDone = true
          try {
            applySnapshot(JSON.parse(data))
          } catch {
            // done 帧已到即收口，坏 body 不影响关流
          }
          shutdown()
        }
      })
      if (myGen !== streamGen) return
      // 流自然结束但未收到 done：视为断流，轮询兜底＋安排重连
      if (!gotDone) fallbackToPolling()
    } catch {
      if (myGen !== streamGen) return // 主动 abort（终态收口/reset/卸载）不算异常
      fallbackToPolling()
    }
  }

  const reset = () => {
    gen++
    shutdown()
    sseDisabled = false
    reconnectDelay = RECONNECT_BASE
    sinceSeq = 0
    events.value = []
    status.value = null
    attachments.value = []
    pollFailureCount.value = 0
    uploadingGenCounts.clear()
    uploadingCount.value = 0
    controlStatus.value = null
    ticking = false
  }

  watch(sessionId, v => {
    reset()
    // SSE 优先：建连失败/断流由 startStream 内部回落轮询，不会无数据源
    if (v) void startStream()
  }, { immediate: true })

  onScopeDispose(() => {
    gen++
    shutdown()
  })

  // ==================== 附件 ====================

  /** 合并服务端已传清单（刷新恢复用）：按 fileId 去重，已存在的保持本地上传态 */
  const refreshFiles = async () => {
    const myGen = gen
    const id = sessionId.value
    if (!id) return
    try {
      const resp = await apiSessionFiles(id)
      // 代际/会话双守卫：切会话后旧会话的清单响应不得落入新会话
      if (myGen !== gen || id !== sessionId.value) return
      const list = (resp?.payload as AgentFileRef[] | undefined) || []
      const known = new Set(attachments.value.map(a => a.fileId).filter(Boolean))
      for (const ref of list) {
        if (!ref || !ref.fileId || known.has(ref.fileId)) continue
        known.add(ref.fileId)
        attachments.value.push(reactive<AttachmentItem>({
          uid: `srv-${ref.fileId}`,
          name: ref.name || ref.fileId,
          size: ref.size || 0,
          progress: 100,
          status: 'done',
          fileId: ref.fileId
        }))
      }
    } catch {
      // 清单回显是增强项：失败不阻塞面板（事件流文件卡仍会显示）
    }
  }

  /**
   * 上传单个附件（顺序调用由调用方控制）：进度回写 chips，成功后补拉一次事件。
   * 服务端大小/数量上限由后端配置校验，前端不硬编码阈值，失败信息原样透出。
   * 绑定发起时会话：切会话后不再对当前会话触发补拉，条目随 reset 的数组替换自然丢弃。
   */
  const upload = async (file: File, existing?: AttachmentItem): Promise<AgentFileRef | null> => {
    const myGen = gen
    const id = sessionId.value
    if (!id) throw new Error('会话尚未开始，无法上传附件')
    // 重试传既有条目（保留 uid/原始文件），新选文件则新建条目入队
    const item = existing ?? reactive<AttachmentItem>({
      uid: newUploadUid(),
      name: file.name,
      size: file.size,
      progress: 0,
      status: 'uploading'
    })
    item.file = file
    item.name = file.name
    item.size = file.size
    item.status = 'uploading'
    item.progress = 0
    item.error = undefined
    if (!existing) attachments.value.push(item)
    bumpUploading(myGen, 1)
    try {
      const resp: any = await sessionUpload(id, file, ev => {
        if (myGen !== gen) return
        // 留 1% 给服务端收尾（axios 进度到 100 时后端可能仍在落存储）
        item.progress = ev.total ? Math.min(99, Math.round((ev.loaded / ev.total) * 100)) : 0
      })
      const ref = (resp?.payload as AgentFileRef | undefined) || null
      item.status = 'done'
      item.progress = 100
      item.fileId = ref?.fileId
      if (ref?.name) item.name = ref.name
      if (typeof ref?.size === 'number') item.size = ref.size
      if (myGen === gen && id === sessionId.value) void tick()
      return ref
    } catch (e: any) {
      item.status = 'error'
      item.error = e?.message || '上传失败'
      throw e
    } finally {
      // 只减发起代：切会话后旧代完成不得清零新会话在途计数
      bumpUploading(myGen, -1)
    }
  }

  /** 失败重试：原文件还在队列里才可重传（成功即恢复已上传态） */
  const retryUpload = async (uid: string): Promise<void> => {
    const target = attachments.value.find(a => a.uid === uid)
    if (!target || !target.file || target.status === 'uploading') return
    await upload(target.file, target)
  }

  /**
   * 发送后清空「待发队列」：已上传（done）条目不再显示——它们已随本轮进入会话上下文，
   * 下一条消息不会再携带（2026-11-16 口径：发出去就别再占着输入区）。
   * 上传中/失败条目保留（还需要用户处理）。
   */
  const clearAttachments = () => {
    attachments.value = attachments.value.filter(a => a.status !== 'done')
  }

  /**
   * 移除队列条目（仅本地队列，P0 无服务端删除端点；已传文件仍留在会话上下文）。
   * 上传中条目不可移除：请求无法中止，移除只会让用户误以为取消成功。
   */
  const removeAttachment = (uid: string) => {
    const target = attachments.value.find(a => a.uid === uid)
    if (!target || target.status === 'uploading') return
    attachments.value = attachments.value.filter(a => a.uid !== uid)
  }

  // ==================== 控制 ====================

  /** 发起会话：返回 sessionId 供调用方写入自己的句柄（本 hook 不改父级 ref） */
  const start = async (agentKey: string, payload?: Record<string, any>, detachPolicy?: string) => {
    const resp: any = await apiSessionStart(agentKey, payload, detachPolicy)
    return (resp?.payload?.sessionId as string | undefined) || null
  }

  /** 作答 ask_user（answer 与 skipped 至少其一，后端校验） */
  const answer = (questionId: number, text?: string, skipped?: boolean) => {
    const id = sessionId.value
    if (!id) return Promise.reject(new Error('会话尚未开始'))
    return apiSessionAnswer(id, questionId, text, skipped)
  }

  /**
   * 暂停会话（note 暂停说明进事件流；run 线程在下一检查点阻塞）。
   * 成功后本地乐观置 PAUSED：轮询未追上的窗口内暂停键立即收起，避免重复触发。
   */
  const pause = (note?: string) => {
    const myGen = gen
    const id = sessionId.value
    if (!id) return Promise.reject(new Error('会话尚未开始'))
    return apiSessionPause(id, note).then(resp => {
      if (myGen === gen) controlStatus.value = 'PAUSED'
      return resp
    })
  }

  /**
   * 暂停后恢复（guidance 注入下一轮上下文；running 时后端会拒）。
   * 成功后本地乐观置 RUNNING：轮询窗口内不再显示恢复语义，防二次 resume 覆盖单槽指导语。
   */
  const resume = (guidance?: string) => {
    const myGen = gen
    const id = sessionId.value
    if (!id) return Promise.reject(new Error('会话尚未开始'))
    return apiSessionResume(id, guidance).then(resp => {
      if (myGen === gen) controlStatus.value = 'RUNNING'
      return resp
    })
  }

  /** 停止会话（幂等） */
  const stop = () => {
    const id = sessionId.value
    if (!id) return Promise.reject(new Error('会话尚未开始'))
    return apiSessionStop(id)
  }

  return {
    status,
    events,
    items,
    attachments,
    polling,
    sse,
    pollFailureCount,
    pollError,
    uploadingCount,
    isUploading,
    sessionStatus,
    isTerminal,
    liveText,
    waitingQuestion,
    start,
    upload,
    retryUpload,
    clearAttachments,
    refreshFiles,
    removeAttachment,
    answer,
    pause,
    resume,
    stop,
    reset,
    refresh: tick
  }
}