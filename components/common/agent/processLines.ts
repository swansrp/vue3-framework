/**
 * 过程行词汇正源（两套 agent 栈共用：本目录 events 归约与 agentChat 过程流归约同词汇）
 *
 * 词汇与后端发射文案同源，此处为镜像：
 * - 【LLM 思考归档】：轮末思考全文归档行（StreamingProgressChatModel.onComplete 发射），
 *   消费方拉出折叠区承载，不与普通过程日志同列；
 * - 噪声过程行：后端两栈各自发射一部分（report 回显「└」前缀族 / 工具收发与计量流水），
 *   此处取并集——漏一边就漏降噪；与专属步骤行重复或纯计量流水，渲染层降噪跳过（数据不动）。
 * 后端改 push() 文案前缀时同步改这里（仅此一处）。
 * 轮次圈数字（isRoundMarker）与 LLM 转述噪声（NARRATION_NOISE_RES）不是纯前缀词汇，留在 events.ts。
 */

/** 轮末思考全文归档行前缀（StreamingProgressChatModel.onComplete 发射） */
export const THINK_ARCHIVE_PREFIX = '【LLM 思考归档】'

/** 判定是否轮末思考归档行 */
export const isThinkArchiveLine = (line: string): boolean => line.startsWith(THINK_ARCHIVE_PREFIX)

/** 噪声过程行前缀词汇（两栈并集）：report 回显（「└」前缀族/响应回执）与工具收发/计量流水 */
const NOISE_LINE_PREFIXES = [
  '└ 工具调用：',
  '└ LLM 输出：',
  'LLM 响应已收到',
  '调用工具 ',
  '上下文计量：',
  '工具结果入场卸载：',
  'token 预算触发驱逐：'
]

/** 噪声过程行正则词汇（「工具 X 返回：」名称可变，纯前缀表达不了） */
const NOISE_LINE_RES = [/^工具\s*\S+\s*返回[:：]/]

/** 判定是否应从过程呈现里降噪跳过的日志行 */
export const isNoiseLogLine = (line: string): boolean =>
  NOISE_LINE_PREFIXES.some(p => line.startsWith(p)) || NOISE_LINE_RES.some(re => re.test(line))
