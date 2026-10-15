/**
 * 过程行词汇表（与后端 core/llm StreamingProgressChatModel 的发射文案同源，此处为镜像）：
 * live 状态行（思考中/应答中/等待/降级）由后端 isLiveStatusLine 分流进 status.live，
 * 前端经替换式 live 块读到，不经事件流；这里只承载事件流侧的两类判别——
 * - 【LLM 思考归档】：轮末思考全文归档行，消费方拉出折叠区承载，不与普通过程日志同列；
 * - 噪声过程行：工具收发/上下文计量类日志与专属步骤行重复，渲染层降噪跳过（数据不动）。
 * 后端改 push() 文案前缀时同步改这里。
 */

/** 轮末思考全文归档行前缀（StreamingProgressChatModel.onComplete 发射） */
export const THINK_ARCHIVE_PREFIX = '【LLM 思考归档】'

/** 判定是否轮末思考归档行 */
export const isThinkArchiveLine = (line: string): boolean => line.startsWith(THINK_ARCHIVE_PREFIX)

/** 噪声过程行：与工具步骤行重复（调用收发）或纯计量流水 */
const AGENT_LOG_NOISE_RE = /^(调用工具 |工具 .+ 返回：|上下文计量：|工具结果入场卸载：|token 预算触发驱逐：)/

/** 判定是否应从过程呈现里降噪跳过的日志行 */
export const isNoiseLogLine = (line: string): boolean => AGENT_LOG_NOISE_RE.test(line)
