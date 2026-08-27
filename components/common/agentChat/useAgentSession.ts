/**
 * agent 会话轮询 hook（AgentChat 数据源）
 *
 * 2s 增量拉取事件流（sinceSeq 游标）+ 状态快照（阶段清单/终态判定）；
 * 终态自动停轮询。轮询即后端存活信号（断开即停策略据此判定），页面隐藏不暂停；
 * 组件卸载（刷新/关页）轮询自然终止，后端按策略处置。
 * 轮询失败静默（下轮重试），会话不存在等 4xx 由 request 层提示。
 */
import { ref, watch, type Ref } from 'vue'


import type { AgentEventX, AgentSessionStateT } from './types'
import { isTerminalStatus } from './types'

import { sessionEvents, sessionStatus } from '@/framework/apis/agent'

const POLL_INTERVAL = 2000

export const useAgentSession = (sessionId: Ref<string | null>) => {
  const status = ref<AgentSessionStateT | null>(null)
  const events = ref<AgentEventX[]>([])
  const polling = ref(false)

  let sinceSeq = 0
  let timer: ReturnType<typeof setInterval> | null = null
  let ticking = false

  const tick = async () => {
    const id = sessionId.value
    if (!id || ticking) return
    ticking = true
    try {
      const [evResp, stResp] = await Promise.all([
        sessionEvents(id, sinceSeq),
        sessionStatus(id)
      ])
      const list = (evResp?.payload as AgentEventX[] | undefined) || []
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

  /** 会话切换：清流重置游标重新轮询 */
  const reset = () => {
    events.value = []
    status.value = null
    sinceSeq = 0
    stopPolling()
    if (sessionId.value) startPolling()
  }

  watch(sessionId, v => {
    if (v) reset()
    else stopPolling()
  }, { immediate: true })

  return { status, events, polling, reset }
}
