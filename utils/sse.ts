/**
 * 通用 SSE 帧解析工具（fetch + ReadableStream 手动解析，axios 不支持流式读取响应体）
 *
 * 事件块以空行分隔，data 多行按 SSE 规范用 \n 拼回原文；流结束后补分发残留
 * （无尾随空行的末块）。各流式端点（chatbi /ask 等；maintain /ask/stream 已废弃仅后端遗留）共用，
 * 事件语义由各调用方按 event 名分发。
 */
import { localStorageMethods } from '@/framework/utils/common'
import { AUTHORIZATION_TOKEN } from '@/framework/utils/constant'

/** 读取 SSE 流并逐块回调（onEvent 收到解析后的 event 名与 data 全文） */
export async function readSseStream(
  body: ReadableStream<Uint8Array>,
  onEvent: (event: string, data: string) => void
): Promise<void> {
  const reader = body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''
  const pump = () => {
    let sep = buffer.indexOf('\n\n')
    while (sep >= 0) {
      const block = parseSseBlock(buffer.slice(0, sep))
      if (block) onEvent(block.event, block.data)
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
  if (buffer.trim()) {
    const block = parseSseBlock(buffer)
    if (block) onEvent(block.event, block.data)
  }
}

/** 单个 SSE 事件块解析：event: 行定事件名（缺省 message），data: 多行拼回原文 */
export function parseSseBlock(block: string): { event: string; data: string } | null {
  let event = 'message'
  const dataLines: string[] = []
  for (const rawLine of block.split('\n')) {
    const line = rawLine.endsWith('\r') ? rawLine.slice(0, -1) : rawLine
    if (line.startsWith('event:')) {
      event = line.slice(6).trim()
    } else if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).replace(/^ /, ''))
    }
  }
  if (!dataLines.length && event === 'message') return null
  return { event, data: dataLines.join('\n') }
}

/** 发起带鉴权的 SSE POST 请求（鉴权头与 request.ts 拦截器同口径）；返回响应供调用方读流 */
export async function postSse(url: string, bodyObj: unknown, signal?: AbortSignal): Promise<Response> {
  const token = localStorageMethods.getLocalStorage(AUTHORIZATION_TOKEN)
  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {})
    },
    body: JSON.stringify(bodyObj),
    signal
  })
}
