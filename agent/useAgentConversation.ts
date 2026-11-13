/**
 * 框架 AI 会话状态机（自持数据源，不依赖旧对话组件的 hook）
 *
 * 通道：2s 轮询 status + events(sinceSeq) 增量（P0 面板够用；SSE 不是本棒范围）。
 * 职责：
 * - sessionStart：发起自主会话（业务页面也可自持 sessionStart，本 hook 同样支持）；
 * - upload：多附件顺序上传（multipart 字段 file），进度回写 chips；成功后立即补拉一次，
 *   让 file_attached 文件卡尽快上屏（正常也在下一轮轮询到达）；
 * - poll：状态快照 + 事件增量；终态停轮询（不空转）；会话切换/卸载清理定时器；
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

const POLL_INTERVAL = 2000

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
        const snapshot = (stResp?.payload as AgentSessionSnapshot | undefined) || null
        // 终态事件先到时，不让并发的旧 status 快照把结论回退成“执行中”
        if (!(terminalFromEvents && !isTerminalStatus(snapshot?.status))) {
          status.value = snapshot
          // 轮询追平（或终态）后解除控制动作的乐观状态，之后以服务端快照为准
          if (controlStatus.value
            && (isTerminalStatus(snapshot?.status) || snapshot?.status === controlStatus.value)) {
            controlStatus.value = null
          }
        }
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

  const reset = () => {
    gen++
    stopPolling()
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
    if (v) startPolling()
  }, { immediate: true })

  onScopeDispose(() => {
    gen++
    stopPolling()
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
  const upload = async (file: File): Promise<AgentFileRef | null> => {
    const myGen = gen
    const id = sessionId.value
    if (!id) throw new Error('会话尚未开始，无法上传附件')
    const item = reactive<AttachmentItem>({
      uid: newUploadUid(),
      name: file.name,
      size: file.size,
      progress: 0,
      status: 'uploading'
    })
    attachments.value.push(item)
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
    refreshFiles,
    removeAttachment,
    answer,
    pause,
    resume,
    stop,
    refresh: tick
  }
}