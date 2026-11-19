/**
 * 过程行词汇表——正源已上移 `../agent/processLines.ts`（两套 agent 栈的降噪词汇并集，
 * 漏一边就漏降噪），此处薄 re-export 保持三符号名与 import 路径不变（消费方零改动）。
 */
export { THINK_ARCHIVE_PREFIX, isThinkArchiveLine, isNoiseLogLine } from '../agent/processLines'
