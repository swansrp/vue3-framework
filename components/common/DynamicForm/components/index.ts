/**
 * 表单模板配置组件
 * 用于动态表单模板的配置页面
 */
export { default as SchemaConfigPanel } from './SchemaConfigPanel.vue'
export { default as SectionBlock } from './SectionBlock.vue'
export { default as AttributeGroupBlock } from './AttributeGroupBlock.vue'
export { default as ModuleSteps } from './ModuleSteps.vue'
export { default as ModuleFormModal } from './ModuleFormModal.vue'
export { default as SectionFormModal } from './SectionFormModal.vue'
export { default as AttributeFormModal } from './AttributeFormModal.vue'
export { default as AttributeGroupFormModal } from './AttributeGroupFormModal.vue'
export { default as FormLayoutConfig } from './FormLayoutConfig.vue'
export { default as ProductTree } from './ProductTree.vue'

/**
 * 评估表单填写组件（从 EvalForm 迁移）
 * 用于动态表单填写、查看功能
 */
export { default as EvalFormViewer } from './FormViewer.vue'
export { default as EvalGroupForm } from './GroupForm.vue'
export { default as SectionNavTree } from './SectionNavTree.vue'
export { useEvalFormData } from './useEvalFormData'

// 导出类型
export type { 
  SectionInstance, 
  GroupInstanceData, 
  GroupProgress, 
  SectionProgress, 
  RequiredParseResult, 
  MutualExclusiveGroup 
} from './useEvalFormData'
