/**
 * LLM 提示词抽屉 tab 清单（tip 说明生效环节与可用占位符）。
 * 默认模板单一源在后端 classpath 资源 smartquery/prompts.yml（随版本演进）：
 * 抽屉回显走 /admin/prompts（默认+已保存覆盖），「恢复默认」走 /admin/prompts/defaults，
 * 前端不再内置模板副本，避免多处漂移
 */
export const PROMPT_TABS = [
  {
    key: 'pairPrompt',
    label: '码值配对推断',
    tip: '全体生成前置环节：逐表推断编码↔名称配对（后端采样）与备注枚举值域（不采样）补齐码值域。占位符：{entities_json}/{sensitive_fields}。'
  },
  {
    key: 'metricsPrompt',
    label: '指标',
    tip: '全体生成逐类环节与「指标」tab AI 重生成共用。占位符：{entities_json}/{dimensions_json}/{domain_keys}/{current_content}。'
  },
  {
    key: 'relationsPrompt',
    label: '关系',
    tip: '全体生成逐类环节与「关系」tab AI 重生成共用。占位符：{entities_json}/{current_content}。'
  },
  {
    key: 'conceptsPrompt',
    label: '业务概念',
    tip: '全体生成逐类环节与「业务概念」tab AI 重生成共用。占位符：{entities_json}/{dimensions_json}/{domain_keys}/{current_content}。'
  },
  {
    key: 'autonomousPrompt',
    label: 'AI 自主模式',
    tip: '「AI 自主模式」生成入口的任务提示词：LLM 持探索+落库工具自主决定顺序与拆分。占位符：{entities_json}/{dimensions_json}/{domain_keys}/{sensitive_fields}。'
  }
]
