/**
 * 智能问数 SSE 流式客户端
 *
 * axios 不支持流式读取响应体，这里用原生 fetch + ReadableStream 手动解析 SSE 帧；
 * 鉴权头与 request.ts 拦截器保持一致（Bearer + localStorage 带前缀取值）。
 *
 * 事件协议（与后端 ChatBiSseSender 对齐）：
 * - conv：对话标识（先于 delta 下发；新对话由后端创建，前端续问按它续接）
 * - delta：token 增量片段
 * - spec：chart-spec JSON 全文（done 之前至多一次）
 * - msgid：助手消息标识（补写对话后、done 之前下发，前端评价定位用）
 * - done：剔除 chart-spec 代码块后的完整正文
 * - error：生成失败原因
 */
import { ref } from 'vue'

import { name } from '@/../package.json'
import { localStorageMethods } from '@/framework/utils/common'
import { AUTHORIZATION_TOKEN } from '@/framework/utils/constant'

import type { ChatBiAskReq, ChatBiSpec } from './types'

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
      const token = localStorageMethods.getLocalStorage(AUTHORIZATION_TOKEN)
      const resp = await fetch(ASK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: 'Bearer ' + token } : {})
        },
        body: JSON.stringify(req),
        signal: controller.signal
      })
      if (!resp.ok || !resp.body) {
        handlers.onError?.(resp.status === 401 ? '登录状态已失效，请重新登录' : `请求失败（HTTP ${resp.status}）`)
        return
      }
      await readSseStream(resp.body, handlers)
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

// ===== SSE 帧解析 =====

async function readSseStream(body: ReadableStream<Uint8Array>, handlers: ChatBiStreamHandlers): Promise<void> {
  const reader = body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''
  // 事件块以空行分隔，逐块解析分发；流结束后补分发残留（无尾随空行的末块）
  const pump = () => {
    let sep = buffer.indexOf('\n\n')
    while (sep >= 0) {
      dispatchSseBlock(buffer.slice(0, sep), handlers)
      buffer = buffer.slice(sep + 2)
      sep = buffer.indexOf('\n\n')
    }
  }
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    pump()
  }
  buffer += decoder.decode()
  pump()
  if (buffer.trim()) dispatchSseBlock(buffer, handlers)
}

function dispatchSseBlock(block: string, handlers: ChatBiStreamHandlers): void {
  let event = 'message'
  const dataLines: string[] = []
  for (const rawLine of block.split('\n')) {
    const line = rawLine.endsWith('\r') ? rawLine.slice(0, -1) : rawLine
    if (line.startsWith('event:')) {
      event = line.slice(6).trim()
    } else if (line.startsWith('data:')) {
      // 后端多行内容逐行拆成多条 data 行，客户端按 SSE 规范用 \n 拼回原文
      dataLines.push(line.slice(5).replace(/^ /, ''))
    }
  }
  const data = dataLines.join('\n')
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
