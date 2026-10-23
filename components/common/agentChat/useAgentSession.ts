/**
 * agent 会话数据源 hook（AgentChat 双通道：SSE 优先＋轮询兜底）
 *
 * SSE 通道（优先）：GET /web/api/agent/session/<id>/stream?sinceSeq=<n> 常连接，
 * live/events/status 帧约 300ms 级实时上屏；25s 一次 sessionStatus 保活
 * （刷新 status 快照＋维持后端在场信号 touchView）。
 * 轮询通道（兜底）：SSE 建连失败/断流窗口期 2s 增量拉取（events(sinceSeq)+status）；
 * 断流 10s 后重连（连续失败退避至 30s；重连带当前 sinceSeq，建连回放自动补齐断档，
 * 成功即停轮询）；永久回落轮询不再试 SSE 的两类形态：真 HTTP 401/404
 * （未登录/会话不存在，resp.ok=false），与平台错误信封——平台错误全返 HTTP 200＋
 * JSON 信封 body（status.code：401=登录态失效、101=系统错误如会话不存在），
 * 没有 4xx 形态，建连后按 content-type 嗅探发现非 text/event-stream 即信封
 * （详见 startStream 内注释）。
 * 终态收口（done 帧，或 status 帧/保活响应兜底判定）：关流＋清保活/重连定时器＋
 * 停轮询，不再重连；会话切换（reset）/组件卸载（onScopeDispose）做同样清理。
 * 轮询/保活失败静默（下轮重试），错误提示由 request 层按信封统一处理。
 */
import { onScopeDispose, ref, watch, type Ref } from 'vue'


import type { AgentEventX, AgentSessionStateT } from './types'
import { isTerminalStatus } from './types'

import { sessionEvents, sessionStatus } from '@/framework/apis/agent'
import { getSseStream, readSseStream } from '@/framework/utils/sse'
import { name } from '@/../package.json'

const POLL_INTERVAL = 2000
/** SSE 保活间隔（刷新 status＋兼作后端 touchView 在场信号） */
const KEEPALIVE_INTERVAL = 25000
/** 断流重连基准间隔；连续失败逐级退避（+BASE）至 RECONNECT_MAX，重连成功复位 */
const RECONNECT_BASE = 10000
const RECONNECT_MAX = 30000

export const useAgentSession = (sessionId: Ref<string | null>) => {
  const status = ref<AgentSessionStateT | null>(null)
  const events = ref<AgentEventX[]>([])
  const polling = ref(false)
  /** SSE 通道是否活跃（建连成功起、终态收口/断流回落止；活跃期 polling=false） */
  const sse = ref(false)

  let sinceSeq = 0
  let timer: ReturnType<typeof setInterval> | null = null
  let ticking = false
  let keepaliveTimer: ReturnType<typeof setInterval> | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let reconnectDelay = RECONNECT_BASE
  let controller: AbortController | null = null
  /** 401/404 后永久停 SSE（本次会话生命周期内只走轮询；reset 重开时复位） */
  let sseDisabled = false
  /** 流代际：每次建连/收口/reset 递增，在途流协程据此识别自身已被作废（abort 异常静默不重连） */
  let gen = 0

  // ==================== 轮询通道（兜底） ====================

  const tick = async () => {
    const myGen = gen
    const id = sessionId.value
    if (!id || ticking) return
    ticking = true
    try {
      const [evResp, stResp] = await Promise.all([
        sessionEvents(id, sinceSeq),
        sessionStatus(id)
      ])
      if (myGen !== gen) return // 代际守卫：reset 切会话后旧响应不落新会话
      // seq 去重（与 SSE 侧同判据）：SSE 重连/轮询交替窗口内后端回放与在途响应
      // 可能交叠，只收 sinceSeq 之后的增量，防重复/乱序/游标回退
      const list = ((evResp?.payload as AgentEventX[] | undefined) || []).filter(ev => ev.seq > sinceSeq)
      if (list.length > 0) {
        events.value.push(...list)
        sinceSeq = list[list.length - 1].seq
      }
      status.value = (stResp?.payload as AgentSessionStateT | undefined) || null
      if (isTerminalStatus(status.value?.status)) {
        stopPolling()
      }
    } catch {
      // 轮询失败静默，下轮重试（网络抖动/实例滚动）
    } finally {
      ticking = false
    }
  }

  const startPolling = () => {
    if (timer) return
    polling.value = true
    tick()
    timer = setInterval(() => tick(), POLL_INTERVAL)
  }

  const stopPolling = () => {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
    polling.value = false
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
    if (controller) {
      controller.abort()
      controller = null
    }
  }

  /** 全停（终态收口/会话清空/卸载共用）：作废在途流协程、关流、清保活/重连定时器、停轮询 */
  const shutdown = () => {
    gen++
    abortStream()
    stopKeepalive()
    clearReconnect()
    stopPolling()
    sse.value = false
  }

  /** SSE 保活：25s 一次 sessionStatus——刷新 status＋维持后端在场信号（touchView）；
   *  终态兜底判定（防 done 帧丢失时拖到下一保活才收口） */
  const startKeepalive = (id: string) => {
    stopKeepalive()
    keepaliveTimer = setInterval(async () => {
      try {
        const stResp = await sessionStatus(id)
        if (sessionId.value !== id) return
        let st = (stResp?.payload as AgentSessionStateT | undefined) || null
        // SSE 活跃期 live 帧由流通道实时维护（300ms 级），保活整包覆写会把 live
        // 回退成快照里的节流旧值（25s 周期性闪烁）——非终态且当前有 live 时保留之
        if (st && sse.value && status.value?.live != null && !isTerminalStatus(st.status)) {
          st = { ...st, live: status.value.live }
        }
        status.value = st
        if (isTerminalStatus(status.value?.status)) shutdown()
      } catch {
        // 保活失败静默（下轮重试；断流感知由 SSE 读循环负责）
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
      startStream()
    }, delay)
  }

  /** 通道回落：先起轮询兜底拿数据；永久停 SSE 只走轮询的形态＝真 HTTP 401/404
   *  （未登录/会话不存在，resp.ok=false）或平台错误信封（调用方已置 sseDisabled，
   *  见 startStream 嗅探），其余安排重连 */
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
    const myGen = ++gen
    const myController = new AbortController()
    controller = myController
    try {
      const resp = await getSseStream(
        import.meta.env.VITE_baseURL + '/' + name + '/web/api/agent/session/' + id + '/stream?sinceSeq=' + sinceSeq,
        myController.signal
      )
      if (myGen !== gen) {
        // 已被 reset/收口作废：取消响应体防连接悬漏（cancel 失败亦静默）
        resp.body?.cancel().catch(() => { })
        return
      }
      if (!resp.ok || !resp.body) {
        fallbackToPolling(resp.status)
        return
      }
      // 信封嗅探：平台错误不走 HTTP 状态码（全返 200＋JSON 信封 body，status.code：
      // 401=登录态失效、101=系统错误如会话不存在）——resp.ok 为真但 content-type
      // 非 text/event-stream 即错误信封。读 body 取 status.code 后永久回落轮询
      // （不重连：过期会话重连只会无限循环）；parse 失败/形态不符同样按信封
      // 永久回落处理（真 SSE 通道必是 text/event-stream，不存在误伤面）
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
      let gotDone = false
      await readSseStream(resp.body, (event, data) => {
        if (myGen !== gen) return
        // 逐帧 parse 保护：坏帧（截断/非 JSON）跳过不穿透——单帧畸形不断整条流
        if (event === 'live') {
          let f: { text?: string } | null = null
          try {
            f = JSON.parse(data)
          } catch {
            return
          }
          // 建连首帧必有 status，status 未就绪时丢弃亦可
          if (status.value && f) status.value = { ...status.value, live: f.text }
        } else if (event === 'events') {
          let ev: AgentEventX | null = null
          try {
            ev = JSON.parse(data) as AgentEventX
          } catch {
            return
          }
          // 按 seq 去重（轮询/SSE 交替窗口防重），只收增量
          if (ev && ev.seq > sinceSeq) {
            events.value.push(ev)
            sinceSeq = ev.seq
          }
        } else if (event === 'status') {
          try {
            status.value = JSON.parse(data)
          } catch {
            return
          }
          // 终态兜底收口（防 done 帧丢失）
          if (isTerminalStatus(status.value?.status)) shutdown()
        } else if (event === 'done') {
          gotDone = true
          try {
            status.value = JSON.parse(data)
          } catch {
            // done 帧已到即收口，坏 body 不影响关流
          }
          shutdown()
        }
      })
      if (myGen !== gen) return
      // 流自然结束但未收到 done：视为断流，轮询兜底＋安排重连
      if (!gotDone) fallbackToPolling()
    } catch {
      if (myGen !== gen) return // 主动 abort（终态收口/reset/卸载）不算异常
      // 网络异常断流：轮询兜底＋重连
      fallbackToPolling()
    }
  }

  /** 会话切换：关旧流清全部定时器、清流重置游标，SSE 优先重开（失败路径自然回落轮询） */
  const reset = () => {
    shutdown()
    sseDisabled = false
    reconnectDelay = RECONNECT_BASE
    events.value = []
    status.value = null
    sinceSeq = 0
    if (sessionId.value) startStream()
  }

  watch(sessionId, v => {
    if (v) reset()
    else shutdown()
  }, { immediate: true })

  // 组件卸载：关流停全部定时器（后端按断开即停策略处置）
  onScopeDispose(shutdown)

  return { status, events, polling, sse, reset }
}
