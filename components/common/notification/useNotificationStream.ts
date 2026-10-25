/**
 * 站内信 SSE 通道 composable（M22 状态机下沉框架）：把宿主铃铛的「SSE 建连判定＋断流
 * 降级轮询」状态机从各宿主（store/壳件）收拢为框架通用件，语义逐条对齐 biz/erp 已验证
 * 的 NotificationBellEntry.vue 修复版，仅做泛化：静默窗键名/时长、轮询周期、鉴权例外
 * 码表参数化；状态以 live/polling 两个 Ref 暴露；路由 watch 与 scope 清理内化。
 *
 * 契约（调用方只需三件事）：streamUrl＝SSE 直连地址（baseURL 拼好传入，不走 request
 * 封装）；isSignedIn＝登录态探针（false 时不探不连，防跨过登出时点）；refresh＝
 * notification 事件/降级轮询到达时的取数回调（宿主既有通道，本件不取数）。
 *
 * 显隐/降级纪律：resp.ok 且 content-type 含 text/event-stream 且有 body 才算传输层建连
 * （收到 connected 事件后 live=true）；首连失败记静默窗（localStorage，12h）自隐且不降级
 * 轮询——401/403 瞬态鉴权失败例外：只跳过本次不记窗不降级，下次路由切换自然重试；
 * 曾连上（everConnected）后断流/异常＝降级 pollMs 轮询并保持 live=true，下次路由切换重试。
 * 生命周期：composable 初始化即自动首连（等价宿主 onMounted 首连），路由切换重试
 * （已连接/静默窗内为 no-op），scope 销毁（onScopeDispose）abort＋停轮询兜底防泄漏。
 * 本件零宿主依赖：只 import vue / vue-router / @/framework/utils/sse。
 */
import { onScopeDispose, ref, watch, type Ref } from 'vue'
import { useRoute } from 'vue-router'

import { getSseStream, readSseStream } from '@/framework/utils/sse'

/** 首连失败静默窗默认键名（localStorage，值＝截止时间戳毫秒数） */
const DEFAULT_MUTE_KEY = 'notification-sse-muted-until'
/** 首连失败静默窗默认时长：12h */
const DEFAULT_MUTE_MS = 12 * 60 * 60 * 1000
/** 断流降级轮询默认周期：30s */
const DEFAULT_POLL_MS = 30 * 1000
/** 鉴权例外码表默认值：瞬态鉴权失败只跳过本次（不记窗不降级） */
const DEFAULT_AUTH_SKIP_CODES = [401, 403]

export interface NotificationStreamOptions {
  /** SSE 直连地址（同 agentChat 先例：绝对地址直连，不走 request 封装） */
  streamUrl: string
  /** 登录态探针：false 时 connect 直返（登录页/会话过期不探，防跨过登出时点） */
  isSignedIn: () => boolean
  /** 取数回调：SSE notification 事件与降级轮询到达时调用（宿主既有刷新通道） */
  refresh: () => void | Promise<void>
  /** 首连失败静默窗 localStorage 键名（默认 notification-sse-muted-until） */
  muteKey?: string
  /** 首连失败静默窗时长毫秒（默认 12h） */
  muteMs?: number
  /** 断流降级轮询周期毫秒（默认 30s） */
  pollMs?: number
  /** 鉴权例外码表：命中只跳过本次，不记窗不降级（默认 [401, 403]） */
  authSkipCodes?: number[]
}

export interface NotificationStreamState {
  /** SSE 通道是否就绪（收到 connected 事件起；断流降级后保持 true＝宿主保持显示） */
  live: Ref<boolean>
  /** 是否处于断流降级轮询态（曾连上后断流才可能为 true；首连失败不降级恒 false） */
  polling: Ref<boolean>
  /** 尝试建连（幂等：已连接/在途/静默窗内/未登录均 no-op；路由切换重试即调它） */
  connect: () => void
  /** 断流＋停轮询（scope 销毁已自动调用；宿主提前下线时可显式调） */
  dispose: () => void
}

export function useNotificationStream(options: NotificationStreamOptions): NotificationStreamState {
  const route = useRoute()

  // ==================== 暴露状态 ====================
  const live = ref(false)
  const polling = ref(false)

  // ==================== 参数收敛（缺省值见各常量注释） ====================
  const muteKey = options.muteKey ?? DEFAULT_MUTE_KEY
  const muteMs = options.muteMs ?? DEFAULT_MUTE_MS
  const pollMs = options.pollMs ?? DEFAULT_POLL_MS
  const authSkipCodes = options.authSkipCodes ?? DEFAULT_AUTH_SKIP_CODES

  // ==================== SSE 机器局部状态（照 erp 修复版原样） ====================
  let abortController: AbortController | undefined
  /** SSE 流是否在读（路由切换重试时防重复建连） */
  let streamOpen = false
  /** connect 在途标志：补齐「进入 connect 到 streamOpen 置位」的建连窗口——该窗口内路由
   *  切换重入会用新 AbortController 覆盖旧控制器，旧 fetch signal 失联永不 abort（双流
   *  并存）；进闸即置位、finally 复位，与 streamOpen 合成完整重入闸 */
  let connecting = false
  /** 是否曾建连成功（区分首连失败＝记静默窗自隐 / 断流＝降级轮询保持 live） */
  let everConnected = false
  let pollTimer: number | undefined
  let disposed = false

  // ==================== 静默窗（localStorage 读写全部 try/catch 防隐私模式） ====================
  const sseMutedUntil = (): number => {
    try {
      const raw = localStorage.getItem(muteKey)
      const ts = raw ? Number(raw) : 0
      return Number.isFinite(ts) ? ts : 0
    } catch {
      return 0
    }
  }

  const markSseMuted = () => {
    try {
      localStorage.setItem(muteKey, String(Date.now() + muteMs))
    } catch {
      // localStorage 不可用（隐私模式等）：放弃记窗，下次路由切换会再试一次
    }
  }

  // ==================== 降级轮询（仅曾连上时启用；首连失败按纪律不降级） ====================
  const startPolling = () => {
    if (pollTimer === undefined) {
      polling.value = true
      pollTimer = window.setInterval(() => {
        void options.refresh()
      }, pollMs)
    }
  }

  const stopPolling = () => {
    if (pollTimer !== undefined) {
      window.clearInterval(pollTimer)
      pollTimer = undefined
      polling.value = false
    }
  }

  /**
   * 首连失败＝记静默窗自隐（live=false）；断流重试失败＝保持 live 降级轮询。
   * 例外：status 命中 authSkipCodes（token 过期等瞬态鉴权失败）只跳过本次——不写静默窗
   * （瞬态鉴权失败不该被跨会话的静默窗放大成重登录后长期不可见且无恢复路径）、不降级
   * 轮询，下次路由切换自然重试；fetch 异常路径无响应码（status 传 undefined）走常规分支。
   */
  const onConnectFailure = (status?: number) => {
    if (status !== undefined && authSkipCodes.includes(status)) {
      return
    }
    if (everConnected) {
      startPolling()
    } else {
      markSseMuted()
      live.value = false
    }
  }

  // ==================== SSE 建连与分发 ====================
  const trySse = async () => {
    // 重入闸（connecting＋streamOpen 双旗）＋终态闸＋登录态闸＋静默窗闸
    if (disposed || streamOpen || connecting) {
      return
    }
    if (!options.isSignedIn()) {
      return
    }
    // 静默窗内不再尝试（首连失败后的自隐期；窗过＝时间戳过期自然放行）
    if (Date.now() < sseMutedUntil()) {
      return
    }
    connecting = true
    abortController = new AbortController()
    try {
      const resp = await getSseStream(options.streamUrl, abortController.signal)
      // 传输层嗅探：ok＋事件流 content-type＋有 body 三条件齐才算建连
      // （平台错误信封实返 200＋JSON＝不满足，404 等也在这分支）
      const contentType = resp.headers.get('content-type') || ''
      if (!resp.ok || !contentType.includes('text/event-stream') || !resp.body) {
        // 带 resp.status：401/403 瞬态鉴权失败由 onConnectFailure 跳过本次不记窗
        onConnectFailure(resp.status)
        return
      }
      // 传输层建连成功：此后断流按「曾连上」处理（降级轮询＋路由切换重试）
      everConnected = true
      streamOpen = true
      stopPolling()
      // 心跳 ":ping" 注释行由 parseSseBlock 天然返回 null 忽略，无需特判
      await readSseStream(resp.body, (event) => {
        if (event === 'connected') {
          // 通道就绪：置 live（宿主据它显示铃铛）
          live.value = true
        } else if (event === 'notification') {
          // 有新消息/状态变化：刷新走宿主既有取数通道
          void options.refresh()
        }
      })
      // 读流循环正常退出＝断流：降级轮询（live 保持 true）＋下次路由切换重试 SSE
      streamOpen = false
      if (!disposed) {
        startPolling()
      }
    } catch {
      // fetch/读流异常（含本件销毁的 abort——静默返回；异常路径无响应码，不传 status）
      streamOpen = false
      if (disposed || abortController?.signal.aborted) {
        return
      }
      onConnectFailure()
    } finally {
      // 复位在途标志：非 ok 返回/异常/断流全部出口都覆盖；流存续期间由 streamOpen 挡重入
      connecting = false
    }
  }

  // ==================== 对外入口 ====================
  const connect = (): void => {
    void trySse()
  }

  const dispose = () => {
    disposed = true
    abortController?.abort()
    stopPolling()
  }

  // 路由切换：重试 SSE（已连接 no-op；静默窗内跳过；窗过后自隐件可复活）
  watch(
    () => route.fullPath,
    () => {
      connect()
    }
  )

  // scope 销毁兜底（组件卸载/composable 脱离 scope 都会触发）：断流＋停轮询防泄漏
  onScopeDispose(dispose)

  // 初始化即首连（等价宿主现行 onMounted 首连）
  connect()

  return { live, polling, connect, dispose }
}
