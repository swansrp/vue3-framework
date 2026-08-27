/**
 * 智能问数 SSE 流式客户端
 *
 * axios 不支持流式读取响应体，这里用原生 fetch + ReadableStream 手动解析 SSE 帧；
 * 鉴权头与 request.ts 拦截器保持一致（Bearer + localStorage 带前缀取值）。
 *
 * 事件协议（与后端 SseEventSender 对齐）：
 * - conv：对话标识（先于 delta 下发；新对话由后端创建，前端续问按它续接）
 * - delta：token 增量片段
 * - spec：chart-spec JSON 全文（done 之前至多一次）
 * - msgid：助手消息标识（补写对话后、done 之前下发，前端评价定位用）
 * - done：剔除 chart-spec 代码块后的完整正文
 * - error：生成失败原因
 */
import { ref } from 'vue'

import type { ChatBiAskReq, ChatBiSpec } from './types'

import { name } from '@/../package.json'
import { postSse, readSseStream } from '@/framework/utils/sse'


const ASK_URL = import.meta.env.VITE_baseURL + '/' + name + '/web/insight/chatbi/ask'

// 15 位以上数字 id 转字符串，避免 JSON.parse 精度丢失（与 request.ts parseBigInt 同思路）
const BIG_ID_PATTERN = /"(\w*[Ii]d)"\s*:\s*(\d{15,})/g

export interface ChatBiStreamHandlers {
  onConversation?: (conversationId: string) => void
  onDelta?: (text: string) => void
  onSpec?: (spec: ChatBiSpec) => void
  onMessageId?: (messageId: string) => void
  onDone?: (content: string) => void
  onError?: (message: string) => void
}

export function useChatBiStream() {
  const loading = ref(false)
  let controller: AbortController | null = null

  const ask = async (req: ChatBiAskReq, handlers: ChatBiStreamHandlers = {}): Promise<void> => {
    // 单会话串行提问，忽略流式期间的重复发起
    if (loading.value) return
    controller = new AbortController()
    loading.value = true
    try {
      const resp = await postSse(ASK_URL, req, controller.signal)
      if (!resp.ok || !resp.body) {
        handlers.onError?.(resp.status === 401 ? '登录状态已失效，请重新登录' : `请求失败（HTTP ${resp.status}）`)
        return
      }
      await readSseStream(resp.body, (event, data) => dispatchSseEvent(event, data, handlers))
    } catch (e) {
      // 用户主动停止（stop 触发 abort）不算错误，由调用方按 stopped 状态收口
      if ((e as Error)?.name !== 'AbortError') {
        handlers.onError?.((e as Error)?.message || '网络异常，请稍后重试')
      }
    } finally {
      loading.value = false
      controller = null
    }
  }

  const stop = (): void => {
    controller?.abort()
  }

  return { loading, ask, stop }
}

// ===== SSE 事件分发（帧解析已上提 framework/utils/sse，此处只管 chatbi 事件语义） =====

function dispatchSseEvent(event: string, data: string, handlers: ChatBiStreamHandlers): void {
  switch (event) {
    case 'conv':
      if (data) handlers.onConversation?.(data)
      break
    case 'delta':
      handlers.onDelta?.(data)
      break
    case 'spec':
      try {
        handlers.onSpec?.(JSON.parse(data.replace(BIG_ID_PATTERN, '"$1":"$2"')) as ChatBiSpec)
      } catch {
        // spec 解析失败仅丢弃生成物，不影响正文渲染
      }
      break
    case 'msgid':
      if (data) handlers.onMessageId?.(data)
      break
    case 'done':
      handlers.onDone?.(data)
      break
    case 'error':
      handlers.onError?.(data || '生成失败')
      break
    default:
      break
  }
}
