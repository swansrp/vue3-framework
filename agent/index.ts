/**
 * 🔴 兼容 shim（勿在此新增代码）——旧路径 `@/framework/agent` 已于 2026-11-19 物理迁移：
 * 正源＝`@/framework/components/common/agent`（framework 双 agent 栈融合 P1，搬家保历史）。
 *
 * 新代码一律从新路径引入：
 *   import { AgentPane } from '@/framework/components/common/agent'
 *
 * 本文件只做全量转发，导出面与正源 index.ts 完全一致；待全部宿主切换到新路径后
 * 由后续棒统一退役（届时删除本目录即可）。
 */
export * from '../components/common/agent'
