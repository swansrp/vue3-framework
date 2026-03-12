<script setup lang="ts">
/**
 * 动态表单填写组件
 * 支持两种使用方式：
 * 1. 作为页面使用：从URL获取 formId 和 historyId 参数
 * 2. 作为组件使用：通过 props 传入 formId 和 historyId
 */
import { CheckOutlined, CloseOutlined, SaveOutlined, SendOutlined } from '@ant-design/icons-vue'
import { message, Modal } from 'ant-design-vue'
import { ref, onMounted, computed, watch, nextTick, useSlots, h } from 'vue'
import { useRoute } from 'vue-router'

import {
  formDataGroupInstanceAdd,
  formDataGroupInstanceDeleteItem,
  formDataGroupInstanceAddList
} from './apis/formDataGroupInstancePortalController'
import {
  formDataHistoryApprove,
  formDataHistoryReject
} from './apis/formDataHistoryPortalController'
import {
  formDataGeneralSelect,
  formDataAddList,
  formDataUpdateList
} from './apis/formDataPortalController'
import {
  formDataSectionInstanceGeneralSelect,
  formDataSectionInstanceAdd,
  formDataSectionInstanceUpdate,
  formDataSectionInstanceDeleteItem
} from './apis/formDataSectionInstancePortalController'
import EvalFormViewer from './components/FormViewer.vue'
import { useEvalFormData } from './components/useEvalFormData'

import { FILTER_TYPE } from '@/framework/components/common/Portal/type'

// Props 定义
interface Props {
  /** 表单模板ID (schemaProductionId)，优先于URL参数 */
  formId?: string
  /** 表单模板编码，优先于 formId */
  formCode?: string
  /** 上报记录ID，优先于URL参数 */
  historyId?: string
  /** 是否强制只读模式 */
  readonly?: boolean
  /** 是否显示提交按钮（已废弃，由 mode 和 status 自动控制） */
  showSubmit?: boolean
  /** 是否自动初始化 */
  autoInit?: boolean
  /** 延迟创建模式：不立即创建 historyId，保存时才创建 */
  lazyCreate?: boolean
  /** 是否显示左侧导航树 */
  showNavTree?: boolean
  /** 是否有访问权限（由调用端控制） */
  hasPermission?: boolean
  /** 记录是否不存在（由调用端控制） */
  recordNotFound?: boolean
  /** 字段默认值，key=fieldName, value=默认值 */
  defaultValues?: Record<string, any>
  /** 企业ID，用于 dict 组件的 entity-id */
  enterpriseId?: string
  /** 模式：fill=填报模式，approve=审核模式 */
  mode?: 'fill' | 'approve'
  /** 业务状态（可选，覆盖 historyInfo.status）：0=未提交，1=待审核，2=未通过，3=已通过 */
  status?: '0' | '1' | '2' | '3'
  /** 拒绝理由（拒绝状态时显示） */
  rejectReason?: string
}

/**
 * 状态说明：
 * '0' = 未提交 (UNKNOWN)
 * '1' = 待审核 (APPLY)
 * '2' = 未通过 (REJECT)
 * '3' = 已通过 (APPROVAL)
 *
 * 填报模式(fill)下：
 * - 未提交(0)：可编辑，显示提交按钮
 * - 待审核(1)：只读
 * - 未通过(2)：可编辑，显示提交按钮
 * - 已通过(3)：只读
 *
 * 审核模式(approve)下：
 * - 未提交(0)：只读
 * - 待审核(1)：只读，显示通过和拒绝按钮
 * - 未通过(2)：只读
 * - 已通过(3)：只读
 */

const props = withDefaults(defineProps<Props>(), {
  formId: undefined,
  formCode: undefined,
  historyId: undefined,
  readonly: false,
  showSubmit: true,
  autoInit: true,
  lazyCreate: false,
  showNavTree: true,
  hasPermission: true,
  recordNotFound: false,
  defaultValues: undefined,
  enterpriseId: undefined,
  mode: 'fill',
  status: undefined,
  rejectReason: undefined
})

// Emits
const emit = defineEmits<{
  /** 提交事件：框架保存完成后触发，业务端在此执行业务提交逻辑 */
  (e: 'submit', historyId: string): void
  /** 提交完成事件：业务端处理完成后触发 */
  (e: 'submitted', historyId: string): void
  /** 保存完成事件 */
  (e: 'saved'): void
  /** 初始化完成事件 */
  (e: 'init:complete', success: boolean): void
  /** 审批通过事件：框架内部处理完成后触发，业务端在此执行业务审批逻辑 */
  (e: 'approve', historyId: string): void
  /** 审批拒绝事件：框架内部处理完成后触发，业务端在此执行业务拒绝逻辑 */
  (e: 'reject', historyId: string, reason: string): void
}>()

const route = useRoute()
const slots = useSlots()

// 获取所有 field: 开头的 slot 名称
const fieldSlotNames = computed(() => {
  return Object.keys(slots).filter(name => name.startsWith('field:'))
})

// 使用 composable
const {
  canEdit: originalCanEdit,
  loading,
  historyId: composableHistoryId,
  historyInfo,
  formInfo,
  modules,
  currentModuleIndex,
  currentModule,
  availableSections,
  sectionInstances,
  savedSectionData,
  sectionGroups,
  sectionAttributes,
  groupInstances,
  isMultiSection,
  pageTitle,
  currentSectionInstanceId,
  getGroupRows,
  getGroupAttributes,
  handleModuleChange: originalHandleModuleChange,
  translateDictValue,
  initData: originalInitData,
  loadGroupInstances,
  getSectionProgress,
  getMutualExclusiveGroups,
  setMutualOption,
  shouldShowGroup,
  getGroupTree,
  // 延迟创建模式
  lazyCreate,
  createHistoryId
} = useEvalFormData()

// 当前状态（优先使用 props.status，否则使用 historyInfo.status）
const currentStatus = computed(() => props.status ?? historyInfo.value?.status ?? '')

// 计算是否可编辑（根据模式和状态）
const canEdit = computed(() => {
  // 强制只读
  if (props.readonly) return false
  // 原始权限
  if (!originalCanEdit.value) return false

  const status = currentStatus.value

  if (props.mode === 'fill') {
    // 填报模式：未提交(0)和未通过(2)可编辑
    return status === '0' || status === '2'
  } else {
    // 审核模式：全部只读
    return false
  }
})

// 是否显示提交按钮
const showSubmitButton = computed(() => {
  if (props.mode === 'fill') {
    // 填报模式：未提交(0)和未通过(2)显示提交按钮
    return currentStatus.value === '0' || currentStatus.value === '2'
  }
  return false
})

// 是否显示通过按钮
const showApproveButton = computed(() => {
  // 审核模式 + 待审核(1)状态
  return props.mode === 'approve' && currentStatus.value === '1'
})

// 是否显示拒绝按钮
const showRejectButton = computed(() => {
  // 审核模式 + 待审核(1)状态
  return props.mode === 'approve' && currentStatus.value === '1'
})

// 状态提示信息
const statusAlert = computed(() => {
  const status = currentStatus.value
  const mode = props.mode

  // 草稿状态 + 审核员 → 显示"未提交"
  if (status === '0' && mode === 'approve') {
    return {
      type: 'warning' as const,
      message: '该记录尚未提交，无法审核',
      showReason: false
    }
  }

  // 待审核状态 + 填报员 → 显示"审核中"
  if (status === '1' && mode === 'fill') {
    return {
      type: 'info' as const,
      message: '该记录正在审核中，请耐心等待',
      showReason: false
    }
  }

  // 拒绝状态 + 填报员 → 显示"已拒绝" + 理由
  if (status === '2' && mode === 'fill') {
    return {
      type: 'error' as const,
      message: '该记录已被拒绝',
      showReason: true,
      reason: props.rejectReason || historyInfo.value?.rejectReason || ''
    }
  }

  // 已通过状态 → 显示"已通过"
  if (status === '3') {
    return {
      type: 'success' as const,
      message: '该记录已通过审核',
      showReason: false
    }
  }

  return null
})

// 从 props 或 URL 获取参数
const formIdValue = computed(() => props.formId || route.query.formId as string || '')
const formCodeValue = computed(() => props.formCode || route.query.formCode as string || '')
const historyIdValue = computed(() => props.historyId || route.query.historyId as string || '')

// 组件 ref
const viewerRef = ref()

// 区块选择弹框
const sectionSelectModalVisible = ref(false)
const selectedSectionForModal = ref<string | undefined>(undefined)



// lazyCreate 模式下显示保存按钮（复用提交按钮位置）
const showLazySaveButton = computed(() => {
  return lazyCreate.value && canEdit.value && !composableHistoryId.value
})

// 防抖计时器
const formContentUpdateTimers = new Map<string, any>()

// 初始化中标志（阻止初始化期间的字段变化触发保存）
const isInitializing = ref(false)

// 包装模块切换方法
const handleModuleChange = async (index: number) => {
  await originalHandleModuleChange(index)
  
  if (availableSections.value.length === 1 && sectionInstances.value.length === 0 && canEdit.value) {
    const singleSection = availableSections.value[0]
    await handleAddSection(singleSection.id)
  } else if (availableSections.value.length > 1 && sectionInstances.value.length === 0 && canEdit.value) {
    sectionSelectModalVisible.value = true
    selectedSectionForModal.value = undefined
  }
}

// 处理互斥选项切换
const handleMutualOptionChange = (flag: string, groupId: string) => {
  setMutualOption(flag, groupId)
}

// 处理选中 Section Instance
const handleSelectSection = (instanceId: string) => {
  currentSectionInstanceId.value = instanceId
}

// 监听区块实例变化
watch(sectionInstances, (newVal) => {
  if (newVal.length > 0 && sectionSelectModalVisible.value) {
    sectionSelectModalVisible.value = false
  }
})

// 确认添加区块
const handleConfirmAddSection = async () => {
  if (!selectedSectionForModal.value) {
    message.warning('请选择一个区块')
    return
  }
  await handleAddSection(selectedSectionForModal.value)
  sectionSelectModalVisible.value = false
}

// 取消弹框
const handleCancelSelectModal = () => {
  sectionSelectModalVisible.value = false
  selectedSectionForModal.value = undefined
}

// 创建默认的 Group Instances
const createDefaultGroupInstances = async (sectionInstanceId: string, sectionId: string) => {
  try {
    const groups = sectionGroups.value[sectionId] || []
    if (groups.length === 0) return

    const instance = savedSectionData.value[sectionInstanceId]
    if (!instance) return

    const groupInstancesToCreate: any[] = []
    for (const group of groups) {
      groupInstancesToCreate.push({
        historyId: instance.historyId,
        sectionInstanceId: sectionInstanceId,
        groupId: group.id,
        rowIndex: 0,
        valid: '1'
      })
    }

    if (groupInstancesToCreate.length > 0) {
      await formDataGroupInstanceAddList(groupInstancesToCreate, false, false, true)
      await loadGroupInstances(sectionInstanceId)
    }
  } catch (error) {
    console.error('创建默认 Group Instances 失败:', error)
  }
}

// 添加section实例
const handleAddSection = async (sectionId: string) => {
  // 只读模式下不执行操作
  if (!canEdit.value) return
  
  const section = availableSections.value.find(s => s.id === sectionId)
  if (!section) return

  // 延迟创建模式：本地暂存，不调用后端 API
  if (lazyCreate.value && !composableHistoryId.value) {
    // 生成临时 ID
    const tempInstanceId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // 创建本地 section instance
    const localInstance = {
      id: tempInstanceId,
      sectionId: sectionId,
      moduleId: currentModule.value.id,
      valid: '1'
    }
    
    savedSectionData.value[tempInstanceId] = localInstance
    sectionInstances.value.push({ sectionId, instanceId: tempInstanceId, section })
    
    // 为该 section 创建默认的 group instances（本地）
    const groupTree = getGroupTree(sectionId)
    
    if (!groupInstances.value[tempInstanceId]) {
      groupInstances.value[tempInstanceId] = []
    }
    
    // 递归创建 group instances
    const createGroupInstancesRecursively = (groups: any[]) => {
      for (const group of groups) {
        // 只为非多行 group 创建默认行
        if (group.multi !== '1') {
          const tempGroupInstanceId = `temp_gi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          groupInstances.value[tempInstanceId].push({
            groupInstanceId: tempGroupInstanceId,
            groupId: String(group.id),
            rowIndex: 0,
            data: {}
          })
        }
        // 递归处理子 group
        if (group.children && group.children.length > 0) {
          createGroupInstancesRecursively(group.children)
        }
      }
    }
    
    createGroupInstancesRecursively(groupTree)
    return
  }

  try {
    await formDataSectionInstanceAdd(
      {
        historyId: composableHistoryId.value,
        moduleId: currentModule.value.id,
        sectionId: sectionId,
        valid: '1'
      } as any,
      true, true, true
    )

    const queryRes = await formDataSectionInstanceGeneralSelect({
      conditionList: [
        { property: 'historyId', relation: FILTER_TYPE.EQUAL, value: [composableHistoryId.value] },
        { property: 'sectionId', relation: FILTER_TYPE.EQUAL, value: [sectionId] }
      ],
      sortList: [{ property: 'id', type: 1 }]
    } as any, false, false, true)

    const records = queryRes?.payload || []
    if (records.length > 0) {
      const instance = records[0]
      const instanceId = String(instance.id)
      savedSectionData.value[instanceId] = instance
      sectionInstances.value.push({ sectionId, instanceId, section })
      await createDefaultGroupInstances(instanceId, sectionId)
    }
  } catch (error) {
    console.error('添加区块实例失败:', error)
    message.error('添加区块失败')
  }
}

// 删除section实例
const handleRemoveSection = async (instanceId: string) => {
  // 只读模式下不执行操作
  if (!canEdit.value) return
  
  const instance = savedSectionData.value[instanceId]
  if (instance) {
    try {
      await formDataSectionInstanceDeleteItem({ id: instance.id }, true, false, true)
      sectionInstances.value = sectionInstances.value.filter(s => s.instanceId !== instanceId)
      delete groupInstances.value[instanceId]
      delete savedSectionData.value[instanceId]
    } catch (error) {
      console.error('删除区块失败:', error)
    }
  }
}

// 更新 Section 的 formContent
const updateSectionFormContent = async (sectionInstanceId: string) => {
  // 只读模式下不执行更新操作
  if (!canEdit.value) return
  
  try {
    const instance = savedSectionData.value[sectionInstanceId]
    if (!instance) return

    const sectionId = String(instance.sectionId)
    const groups = sectionGroups.value[sectionId] || []
    const attributes = sectionAttributes.value[sectionId] || []
    const instances = groupInstances.value[sectionInstanceId] || []

    const formContent: Record<string, any> = { groups: [] as any[] }

    for (const group of groups) {
      const groupId = String(group.id)
      const groupAttrs = attributes.filter(attr => String(attr.groupId) === groupId)
      const groupRows = instances.filter(gi => gi.groupId === groupId).sort((a, b) => a.rowIndex - b.rowIndex)

      const groupData: any = {
        groupId, groupTitle: group.title, multi: group.multi, sort: group.sort,
        rows: [] as any[]
      }

      for (const row of groupRows) {
        const rowData: Record<string, any> = {}
        for (const attr of groupAttrs) {
          rowData[attr.name] = row.data[String(attr.id)] ?? ''
        }
        groupData.rows.push({ groupInstanceId: row.groupInstanceId, rowIndex: row.rowIndex, data: rowData })
      }
      formContent.groups.push(groupData)
    }

    await formDataSectionInstanceUpdate({}, { ...instance, formContent: JSON.stringify(formContent) }, false, false, true)
    savedSectionData.value[sectionInstanceId] = { ...instance, formContent: JSON.stringify(formContent) }
  } catch (error) {
    console.error('更新 formContent 失败:', error)
  }
}

// 保存字段数据
const handleUpdateGroupData = async (sectionInstanceId: string, groupInstanceId: string, attributeId: string, value: any) => {
  // 只读模式下不执行更新操作
  if (!canEdit.value) return

  // 初始化中，跳过保存（避免重新加载数据时触发重复保存）
  if (isInitializing.value) {
    // 但仍然更新本地数据
    const instances = groupInstances.value[sectionInstanceId] || []
    const instance = instances.find(gi => gi.groupInstanceId === groupInstanceId)
    if (instance) instance.data[attributeId] = value
    return
  }
  
  try {
    // 更新本地数据
    const instances = groupInstances.value[sectionInstanceId] || []
    const instance = instances.find(gi => gi.groupInstanceId === groupInstanceId)
    if (instance) instance.data[attributeId] = value

    // 延迟创建模式：只更新本地数据，不调用后端 API
    if (lazyCreate.value && !composableHistoryId.value) {
      return
    }

    const existingDataRes = await formDataGeneralSelect({
      conditionList: [
        { property: 'groupInstanceId', relation: FILTER_TYPE.EQUAL, value: [groupInstanceId] },
        { property: 'attributeId', relation: FILTER_TYPE.EQUAL, value: [attributeId] },
        { property: 'valid', relation: FILTER_TYPE.EQUAL, value: ['1'] }
      ]
    } as any, false, false)

    const dataItem = {
      historyId: composableHistoryId.value,
      sectionInstanceId, groupInstanceId, attributeId,
      value: value ?? '', valid: '1'
    }

    if (existingDataRes?.payload && existingDataRes.payload.length > 0) {
      await formDataUpdateList(undefined, [{ id: existingDataRes.payload[0].id, ...dataItem }], false, false, true)
    } else {
      await formDataAddList([dataItem], false, false, true)
    }

    if (formContentUpdateTimers.has(sectionInstanceId)) {
      clearTimeout(formContentUpdateTimers.get(sectionInstanceId))
    }
    const timer = setTimeout(() => {
      updateSectionFormContent(sectionInstanceId)
      formContentUpdateTimers.delete(sectionInstanceId)
    }, 2000)
    formContentUpdateTimers.set(sectionInstanceId, timer)
  } catch (error) {
    console.error('保存字段数据失败:', error)
  }
}

// 添加多行子表的一行
const handleAddGroupRow = async (sectionInstanceId: string, groupId: string|number) => {
  // 只读模式下不执行操作
  if (!canEdit.value) return
  
  try {
    const instances = groupInstances.value[sectionInstanceId] || []
    const newRowIndex = instances.filter(gi => gi.groupId === groupId).length

    // 延迟创建模式：本地暂存
    if (lazyCreate.value && !composableHistoryId.value) {
      const tempGroupInstanceId = `temp_gi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      if (!groupInstances.value[sectionInstanceId]) {
        groupInstances.value[sectionInstanceId] = []
      }
      groupInstances.value[sectionInstanceId].push({
        groupInstanceId: tempGroupInstanceId,
        groupId: String(groupId),
        rowIndex: newRowIndex,
        data: {}
      })
      message.success('添加成功')
      return
    }

    const sectionInstance = savedSectionData.value[sectionInstanceId]
    if (!sectionInstance) return

    await formDataGroupInstanceAdd({
      historyId: sectionInstance.historyId,
      sectionInstanceId, groupId, rowIndex: newRowIndex, valid: '1'
    }, false, false, true)

    await loadGroupInstances(sectionInstanceId)
    message.success('添加成功')
  } catch (error) {
    console.error('添加行失败:', error)
    message.error('添加失败')
  }
}

// 删除多行子表的一行
const handleDeleteGroupRow = async (sectionInstanceId: string, groupId: string, rowIndex: number) => {
  // 只读模式下不执行操作
  if (!canEdit.value) return
  
  const instances = groupInstances.value[sectionInstanceId] || []
  const targetInstance = instances.find(gi => gi.groupId === groupId && gi.rowIndex === rowIndex)

  if (targetInstance) {
    try {
      // 延迟创建模式：只删除本地数据
      if (lazyCreate.value && !composableHistoryId.value) {
        groupInstances.value[sectionInstanceId] = instances.filter(gi => gi.groupInstanceId !== targetInstance.groupInstanceId)
        message.success('删除成功')
        return
      }

      await formDataGroupInstanceDeleteItem({ id: targetInstance.groupInstanceId }, false, false, true)
      groupInstances.value[sectionInstanceId] = instances.filter(gi => gi.groupInstanceId !== targetInstance.groupInstanceId)
      message.success('删除成功')
    } catch (error) {
      console.error('删除行失败:', error)
      message.error('删除失败')
    }
  }
}

// 解析 required 字段
const parseRequired = (required?: string): { type: 'none' | 'simple' | 'flag'; flag?: string; min?: number; max?: number } => {
  if (!required || required === '0') return { type: 'none' }
  if (required === '1') return { type: 'simple' }
  if (required.includes('###')) {
    const parts = required.split('###')
    return { type: 'flag', flag: parts[0] || '', min: parseInt(parts[1]) || 1, max: parts[2] ? parseInt(parts[2]) : undefined }
  }
  return { type: 'none' }
}

// 检查是否有数据
const isSectionFilled = (sectionInstanceId: string): boolean => {
  const instances = groupInstances.value[sectionInstanceId] || []
  return instances.some(gi => Object.values(gi.data).some(v => v !== null && v !== undefined && v !== ''))
}

const isGroupFilled = (sectionInstanceId: string, groupId: string): boolean => {
  const instances = groupInstances.value[sectionInstanceId] || []
  const groupInsts = instances.filter(gi => String(gi.groupId) === groupId)
  if (groupInsts.some(gi => Object.values(gi.data).some(v => v !== null && v !== undefined && v !== ''))) return true

  const sectionInstance = savedSectionData.value[sectionInstanceId]
  if (!sectionInstance) return false
  const groupTree = getGroupTree(String(sectionInstance.sectionId))
  
  const findGroup = (groups: any[], targetId: string): any | null => {
    for (const g of groups) {
      if (String(g.id) === targetId) return g
      if (g.children?.length) { const found = findGroup(g.children, targetId); if (found) return found }
    }
    return null
  }
  
  const currentGroup = findGroup(groupTree, groupId)
  if (!currentGroup?.children?.length) return false
  
  const checkChildGroups = (group: any): boolean => {
    for (const child of group.children || []) {
      const childInsts = instances.filter(gi => String(gi.groupId) === String(child.id))
      if (childInsts.some(gi => Object.values(gi.data).some(v => v !== null && v !== undefined && v !== ''))) return true
      if (checkChildGroups(child)) return true
    }
    return false
  }
  return checkChildGroups(currentGroup)
}

// 验证 flag 规则
const validateFlagRules = (): { valid: boolean; message: string } => {
  const sectionFlagRules = new Map<string, { min: number; max?: number; sections: Array<{ id: string; instanceId: string; title: string; filled: boolean }> }>()
  
  for (const instance of sectionInstances.value) {
    const section = availableSections.value.find(s => String(s.id) === instance.sectionId)
    if (!section) continue
    const parsed = parseRequired(section.required)
    if (parsed.type === 'flag' && parsed.flag) {
      if (!sectionFlagRules.has(parsed.flag)) {
        sectionFlagRules.set(parsed.flag, { min: parsed.min || 1, max: parsed.max, sections: [] })
      }
      sectionFlagRules.get(parsed.flag)!.sections.push({
        id: instance.sectionId, instanceId: instance.instanceId, title: section.title, filled: isSectionFilled(instance.instanceId)
      })
    }
  }
  
  for (const [, rule] of sectionFlagRules) {
    const filledCount = rule.sections.filter(s => s.filled).length
    const sectionNames = rule.sections.map(s => `「${s.title}」`).join('、')
    if (filledCount < rule.min) return { valid: false, message: `${sectionNames} 中至少需要填写 ${rule.min} 个，当前已填写 ${filledCount} 个` }
    if (rule.max !== undefined && filledCount > rule.max) return { valid: false, message: `${sectionNames} 中最多只能填写 ${rule.max} 个，当前已填写 ${filledCount} 个` }
  }
  
  const groupFlagRules = new Map<string, { min: number; max?: number; groups: Array<{ id: string; sectionInstanceId: string; title: string; filled: boolean }> }>()
  
  for (const instance of sectionInstances.value) {
    const groups = sectionGroups.value[instance.sectionId] || []
    for (const group of groups) {
      const parsed = parseRequired(group.required)
      if (parsed.type === 'flag' && parsed.flag) {
        if (!groupFlagRules.has(parsed.flag)) groupFlagRules.set(parsed.flag, { min: parsed.min || 1, max: parsed.max, groups: [] })
        groupFlagRules.get(parsed.flag)!.groups.push({
          id: String(group.id), sectionInstanceId: instance.instanceId, title: group.title, filled: isGroupFilled(instance.instanceId, String(group.id))
        })
      }
    }
  }
  
  for (const [, rule] of groupFlagRules) {
    const filledCount = rule.groups.filter(g => g.filled).length
    const groupNames = rule.groups.map(g => `「${g.title}」`).join('、')
    if (filledCount < rule.min) return { valid: false, message: `${groupNames} 中至少需要填写 ${rule.min} 个，当前已填写 ${filledCount} 个` }
    if (rule.max !== undefined && filledCount > rule.max) return { valid: false, message: `${groupNames} 中最多只能填写 ${rule.max} 个，当前已填写 ${filledCount} 个` }
  }
  
  return { valid: true, message: '' }
}

// 验证必填字段
const validateRequiredFields = (sectionInstanceId: string): { valid: boolean; message: string; groupId?: string; attributeId?: string } => {
  const instance = savedSectionData.value[sectionInstanceId]
  if (!instance) return { valid: false, message: '区块实例不存在' }

  const sectionId = String(instance.sectionId)
  const section = availableSections.value.find(s => String(s.id) === sectionId)
  const parsed = parseRequired(section?.required)
  const instances = groupInstances.value[sectionInstanceId] || []

  if (parsed.type === 'simple') {
    const hasAnyData = instances.some(gi => Object.values(gi.data).some(v => v !== null && v !== undefined && v !== ''))
    if (!hasAnyData) return { valid: false, message: `区块「${section?.title}」为必填项，请至少填写一个字段` }
  }

  const attributes = sectionAttributes.value[sectionId] || []

  const validateGroupRecursively = (group: any): { valid: boolean; message: string; groupId?: string; attributeId?: string } => {
    const groupParsed = parseRequired(group.required)
    const groupId = String(group.id)

    if (groupParsed.type === 'simple') {
      const groupInsts = instances.filter(gi => String(gi.groupId) === groupId)
      if (!groupInsts.length) return { valid: false, message: `分组「${group.title}」为必填项，请至少添加一行数据`, groupId }
      if (!groupInsts.some(gi => Object.values(gi.data).some(v => v !== null && v !== undefined && v !== ''))) {
        return { valid: false, message: `分组「${group.title}」为必填项，请填写至少一个字段`, groupId }
      }
      const groupAttrs = attributes.filter(attr => String(attr.groupId) === groupId && attr.isRequired === '1')
      for (const attr of groupAttrs) {
        if (!groupInsts.some(gi => gi.data[String(attr.id)] !== null && gi.data[String(attr.id)] !== undefined && gi.data[String(attr.id)] !== '')) {
          return { valid: false, message: `字段「${attr.label}」为必填项，请填写`, groupId, attributeId: String(attr.id) }
        }
      }
    }

    for (const childGroup of group.children || []) {
      const childResult = validateGroupRecursively(childGroup)
      if (!childResult.valid) return childResult
    }
    return { valid: true, message: '' }
  }

  for (const group of getGroupTree(sectionId)) {
    const result = validateGroupRecursively(group)
    if (!result.valid) return { ...result, sectionInstanceId }
  }

  return { valid: true, message: '' }
}

// 验证单个 Group 及其子 Group 的必填字段
const validateGroupRequiredFields = (sectionInstanceId: string, groupId: string): { valid: boolean; message: string; groupId?: string; attributeId?: string } => {
  const instance = savedSectionData.value[sectionInstanceId]
  if (!instance) return { valid: false, message: '区块实例不存在' }

  const sectionId = String(instance.sectionId)
  const instances = groupInstances.value[sectionInstanceId] || []
  const attributes = sectionAttributes.value[sectionId] || []

  const findGroupById = (groups: any[], targetId: string): any | null => {
    for (const group of groups) {
      if (String(group.id) === targetId) return group
      if (group.children?.length) {
        const found = findGroupById(group.children, targetId)
        if (found) return found
      }
    }
    return null
  }

  const validateGroupRecursively = (group: any): { valid: boolean; message: string; groupId?: string; attributeId?: string } => {
    const gId = String(group.id)
    const groupParsed = parseRequired(group.required)

    if (groupParsed.type === 'simple') {
      const groupInsts = instances.filter(gi => String(gi.groupId) === gId)
      if (!groupInsts.length) return { valid: false, message: `分组「${group.title}」为必填项，请至少添加一行数据`, groupId: gId }
      if (!groupInsts.some(gi => Object.values(gi.data).some(v => v !== null && v !== undefined && v !== ''))) {
        return { valid: false, message: `分组「${group.title}」为必填项，请填写至少一个字段`, groupId: gId }
      }
      const groupAttrs = attributes.filter(attr => String(attr.groupId) === gId && attr.isRequired === '1')
      for (const attr of groupAttrs) {
        if (!groupInsts.some(gi => gi.data[String(attr.id)] !== null && gi.data[String(attr.id)] !== undefined && gi.data[String(attr.id)] !== '')) {
          return { valid: false, message: `字段「${attr.label}」为必填项，请填写`, groupId: gId, attributeId: String(attr.id) }
        }
      }
    }

    for (const childGroup of group.children || []) {
      const childResult = validateGroupRecursively(childGroup)
      if (!childResult.valid) return childResult
    }
    return { valid: true, message: '' }
  }

  const targetGroup = findGroupById(getGroupTree(sectionId), groupId)
  if (!targetGroup) return { valid: true, message: '' }

  return validateGroupRecursively(targetGroup)
}

// 滚动到校验失败的表单项
const scrollToValidationFailed = (sectionInstanceId: string, groupId?: string, attributeId?: string) => {
  // 1. 先切换到对应的 section
  if (currentSectionInstanceId.value !== sectionInstanceId) {
    currentSectionInstanceId.value = sectionInstanceId
  }

  // 2. 等待 DOM 更新后滚动
  nextTick(() => {
    let targetElement: HTMLElement | null = null

    if (attributeId) {
      // 滚动到具体字段
      targetElement = document.querySelector(`[data-attribute-id="${attributeId}"]`)
    }

    if (!targetElement && groupId) {
      // 滚动到分组
      targetElement = document.querySelector(`[data-group-id="${groupId}"]`)
    }

    if (!targetElement && sectionInstanceId) {
      // 滚动到 section
      targetElement = document.querySelector(`[data-section-instance-id="${sectionInstanceId}"]`)
    }

    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
      // 添加高亮效果
      targetElement.classList.add('validation-highlight')
      setTimeout(() => targetElement?.classList.remove('validation-highlight'), 3000)
    }
  })
}

// 保存 Section 数据
const handleSaveSection = async (sectionInstanceId: string, options?: { skipValidation?: boolean }) => {
  try {
    const instance = savedSectionData.value[sectionInstanceId]
    if (!instance) { message.error('区块实例不存在'); return }

    const sectionId = String(instance.sectionId)
    const groupFormRefs = viewerRef.value?.groupFormRefs || {}

    const allFormData: Array<{ groupInstanceId: string; attributeId: string; value: any }> = []
    const groupInstancesToCreate: Array<{ groupId: string; rowIndex: number; data: Record<string, any> }> = []

    const collectGroupDataRecursively = (groups: any[]) => {
      for (const group of groups) {
        const groupId = String(group.id)
        const refKey = `${sectionInstanceId}_${groupId}`
        const groupFormRef = groupFormRefs[refKey]

        if (groupFormRef?.getAllRowsData) {
          const rowsData = groupFormRef.getAllRowsData()
          for (const row of rowsData) {
            if (!row.groupInstanceId) {
              if (Object.values(row.data).some(v => v !== null && v !== undefined && v !== '')) {
                groupInstancesToCreate.push({ groupId, rowIndex: row.rowIndex, data: row.data })
              }
            } else {
              Object.keys(row.data).forEach(attrId => allFormData.push({ groupInstanceId: row.groupInstanceId, attributeId: attrId, value: row.data[attrId] ?? '' }))
              if (!groupInstances.value[sectionInstanceId]) groupInstances.value[sectionInstanceId] = []
              const insts = groupInstances.value[sectionInstanceId]
              const inst = insts.find(gi => gi.groupInstanceId === row.groupInstanceId)
              if (inst) inst.data = row.data
              else insts.push({ groupInstanceId: row.groupInstanceId, groupId, rowIndex: row.rowIndex, data: row.data })
            }
          }
        }
        if (group.children?.length) collectGroupDataRecursively(group.children)
      }
    }

    collectGroupDataRecursively(getGroupTree(sectionId))

    if (groupInstancesToCreate.length > 0) {
      const newInstances = groupInstancesToCreate.map(item => ({
        historyId: instance.historyId,
        sectionInstanceId, groupId: item.groupId, rowIndex: item.rowIndex, valid: '1'
      }))
      await formDataGroupInstanceAddList(newInstances, false, false, true)
      await loadGroupInstances(sectionInstanceId)

      const updatedInstances = groupInstances.value[sectionInstanceId] || []
      for (const toCreate of groupInstancesToCreate) {
        const newInst = updatedInstances.find(gi => gi.groupId === toCreate.groupId && gi.rowIndex === toCreate.rowIndex)
        if (newInst) {
          newInst.data = toCreate.data
          Object.keys(toCreate.data).forEach(attrId => allFormData.push({ groupInstanceId: newInst.groupInstanceId, attributeId: attrId, value: toCreate.data[attrId] ?? '' }))
        }
      }
    }

    if (!options?.skipValidation) {
      const validation = validateRequiredFields(sectionInstanceId)
      if (!validation.valid) {
        message.warning(validation.message)
        scrollToValidationFailed(sectionInstanceId, validation.groupId, validation.attributeId)
        return
      }
    }

    const existingDataRes = await formDataGeneralSelect({
      conditionList: [{ property: 'historyId', relation: FILTER_TYPE.EQUAL, value: [composableHistoryId.value] }, { property: 'valid', relation: FILTER_TYPE.EQUAL, value: ['1'] }]
    } as any, false, false)

    const existingDataMap = new Map<string, any>()
    existingDataRes?.payload?.forEach((item: any) => existingDataMap.set(`${item.groupInstanceId}_${item.attributeId}`, item))

    const dataToUpdate: any[] = []
    const dataToAdd: any[] = []

    for (const formData of allFormData) {
      const key = `${formData.groupInstanceId}_${formData.attributeId}`
      const existing = existingDataMap.get(key)
      const dataItem = {
        historyId: composableHistoryId.value,
        sectionInstanceId, groupInstanceId: formData.groupInstanceId, attributeId: formData.attributeId, value: formData.value, valid: '1'
      }
      if (existing) dataToUpdate.push({ id: existing.id, ...dataItem })
      else dataToAdd.push(dataItem)
    }

    if (dataToUpdate.length) await formDataUpdateList(undefined, dataToUpdate, false, false, true)
    if (dataToAdd.length) await formDataAddList(dataToAdd, false, false, true)

    await updateSectionFormContent(sectionInstanceId)
    await loadGroupInstances(sectionInstanceId)
    message.success('保存成功')
    emit('saved')
  } catch (error) {
    console.error('保存失败:', error)
    message.error('保存失败')
  }
}

// 保存 Group 数据
const handleSaveGroup = async (sectionInstanceId: string, groupId: string) => {
  try {
    const instance = savedSectionData.value[sectionInstanceId]
    if (!instance) { message.error('区块实例不存在'); return }

    const groupFormRefs = viewerRef.value?.groupFormRefs || {}

    const findGroupWithChildren = (groups: any[], targetId: string): any | null => {
      for (const group of groups) {
        if (String(group.id) === targetId) return group
        if (group.children?.length) { const found = findGroupWithChildren(group.children, targetId); if (found) return found }
      }
      return null
    }

    const currentGroup = findGroupWithChildren(getGroupTree(String(instance.sectionId)), groupId)
    if (!currentGroup) { message.error('分组不存在'); return }

    const allFormData: Array<{ groupInstanceId: string; attributeId: string; value: any }> = []
    const groupInstancesToCreate: Array<{ groupId: string; rowIndex: number; data: Record<string, any> }> = []

    const collectGroupDataRecursively = (group: any) => {
      const gId = String(group.id)
      const refKey = `${sectionInstanceId}_${gId}`
      const groupFormRef = groupFormRefs[refKey]

      if (groupFormRef?.getAllRowsData) {
        for (const row of groupFormRef.getAllRowsData()) {
          if (!row.groupInstanceId) {
            if (Object.values(row.data).some(v => v !== null && v !== undefined && v !== '')) {
              groupInstancesToCreate.push({ groupId: gId, rowIndex: row.rowIndex, data: row.data })
            }
          } else {
            Object.keys(row.data).forEach(attrId => allFormData.push({ groupInstanceId: row.groupInstanceId, attributeId: attrId, value: row.data[attrId] ?? '' }))
            if (!groupInstances.value[sectionInstanceId]) groupInstances.value[sectionInstanceId] = []
            const insts = groupInstances.value[sectionInstanceId]
            const inst = insts.find(gi => gi.groupInstanceId === row.groupInstanceId)
            if (inst) inst.data = row.data
          }
        }
      }
      for (const child of group.children || []) collectGroupDataRecursively(child)
    }

    collectGroupDataRecursively(currentGroup)

    // 校验当前 group 及其子 group 的必填字段
    const validation = validateGroupRequiredFields(sectionInstanceId, groupId)
    if (!validation.valid) {
      message.warning(validation.message)
      scrollToValidationFailed(sectionInstanceId, validation.groupId, validation.attributeId)
      return
    }

    if (groupInstancesToCreate.length > 0) {
      const newInstances = groupInstancesToCreate.map(item => ({
        historyId: instance.historyId,
        sectionInstanceId, groupId: item.groupId, rowIndex: item.rowIndex, valid: '1'
      }))
      await formDataGroupInstanceAddList(newInstances, false, false, true)
      await loadGroupInstances(sectionInstanceId)

      const updatedInstances = groupInstances.value[sectionInstanceId] || []
      for (const toCreate of groupInstancesToCreate) {
        const newInst = updatedInstances.find(gi => gi.groupId === toCreate.groupId && gi.rowIndex === toCreate.rowIndex)
        if (newInst) {
          newInst.data = toCreate.data
          Object.keys(toCreate.data).forEach(attrId => allFormData.push({ groupInstanceId: newInst.groupInstanceId, attributeId: attrId, value: toCreate.data[attrId] ?? '' }))
        }
      }
    }

    if (!allFormData.length) { message.success('保存成功'); return }

    const existingDataRes = await formDataGeneralSelect({
      conditionList: [{ property: 'historyId', relation: FILTER_TYPE.EQUAL, value: [composableHistoryId.value] }, { property: 'valid', relation: FILTER_TYPE.EQUAL, value: ['1'] }]
    } as any, false, false)

    const existingDataMap = new Map<string, any>()
    existingDataRes?.payload?.forEach((item: any) => existingDataMap.set(`${item.groupInstanceId}_${item.attributeId}`, item))

    const dataToUpdate: any[] = []
    const dataToAdd: any[] = []

    for (const formData of allFormData) {
      const key = `${formData.groupInstanceId}_${formData.attributeId}`
      const existing = existingDataMap.get(key)
      const dataItem = {
        historyId: composableHistoryId.value,
        sectionInstanceId, groupInstanceId: formData.groupInstanceId, attributeId: formData.attributeId, value: formData.value, valid: '1'
      }
      if (existing) dataToUpdate.push({ id: existing.id, ...dataItem })
      else dataToAdd.push(dataItem)
    }

    if (dataToUpdate.length) await formDataUpdateList(undefined, dataToUpdate, false, false, true)
    if (dataToAdd.length) await formDataAddList(dataToAdd, false, false, true)

    await updateSectionFormContent(sectionInstanceId)
    message.success('保存成功')
  } catch (error) {
    console.error('保存失败:', error)
    message.error('保存失败')
  }
}

// 保存所有数据
const handleSaveAll = async (options?: { skipValidation?: boolean }) => {
  try {
    // 延迟创建模式：先校验完整性，再创建 historyId
    if (lazyCreate.value && !composableHistoryId.value) {
      // 1. 先校验完整性
      if (!options?.skipValidation) {
        const flagValidation = validateFlagRules()
        if (!flagValidation.valid) {
          message.warning(flagValidation.message)
          return
        }

        for (const instance of sectionInstances.value) {
          const validation = validateRequiredFields(instance.instanceId)
          if (!validation.valid) {
            message.warning(validation.message)
            scrollToValidationFailed(instance.instanceId, validation.groupId, validation.attributeId)
            return
          }
        }
      }

      // 2. 校验通过，创建 historyId
      const newHistoryId = await createHistoryId()
      if (!newHistoryId) {
        message.error('创建记录失败')
        return
      }
      
      // 批量创建 section instances 和 group instances
      for (const instance of sectionInstances.value) {
        const sectionId = instance.sectionId
        const tempInstanceId = instance.instanceId
        
        // 创建 section instance
        await formDataSectionInstanceAdd(
          {
            historyId: newHistoryId,
            moduleId: currentModule.value.id,
            sectionId: sectionId,
            valid: '1'
          } as any,
          false, false, true
        )
        
        // 查询刚创建的 section instance
        const queryRes = await formDataSectionInstanceGeneralSelect({
          conditionList: [
            { property: 'historyId', relation: FILTER_TYPE.EQUAL, value: [newHistoryId] },
            { property: 'sectionId', relation: FILTER_TYPE.EQUAL, value: [sectionId] }
          ],
          sortList: [{ property: 'id', type: 1 }]
        } as any, false, false, true)
        
        const records = queryRes?.payload || []
        if (records.length > 0) {
          const realInstance = records[0]
          const realInstanceId = String(realInstance.id)
          savedSectionData.value[realInstanceId] = realInstance
          
          // 保存本地数据到临时变量
          const localGroups = groupInstances.value[tempInstanceId] || []
          const groups = sectionGroups.value[sectionId] || []
          
          // 创建 group instances
          for (const localGi of localGroups) {
            const group = groups.find(g => String(g.id) === localGi.groupId)
            if (!group) continue
            
            // 创建 group instance
            await formDataGroupInstanceAdd({
              historyId: newHistoryId,
              sectionInstanceId: realInstanceId,
              groupId: localGi.groupId,
              rowIndex: localGi.rowIndex,
              valid: '1'
            }, false, false, true)
          }
          
          // 重新加载 group instances 获取真实 ID
          await loadGroupInstances(realInstanceId)
          
          // 保存数据
          const updatedInstances = groupInstances.value[realInstanceId] || []
          const dataToAdd: any[] = []
          
          for (const localGi of localGroups) {
            // 找到对应的真实 group instance
            const realGi = updatedInstances.find(gi => gi.groupId === localGi.groupId && gi.rowIndex === localGi.rowIndex)
            if (!realGi) continue
            
            for (const [attrId, value] of Object.entries(localGi.data)) {
              if (value !== null && value !== undefined && value !== '') {
                dataToAdd.push({
                  historyId: newHistoryId,
                  sectionInstanceId: realInstanceId,
                  groupInstanceId: realGi.groupInstanceId,
                  attributeId: attrId,
                  value: value,
                  valid: '1'
                })
              }
            }
          }
          
          if (dataToAdd.length > 0) {
            await formDataAddList(dataToAdd, false, false, true)
          }
          
          // 更新 formContent
          await updateSectionFormContent(realInstanceId)
        }
      }
      
      // 关闭延迟创建模式，重新加载数据
      lazyCreate.value = false
      
      // 设置初始化标志，阻止重新加载时的字段变化触发保存
      isInitializing.value = true
      
      // 重新初始化数据（从接口拉取）
      await originalInitData({
        forceReadonly: props.readonly,
        formId: formIdValue.value,
        historyId: newHistoryId,
        lazyCreate: false
      })
      
      // 初始化完成，清除标志
      isInitializing.value = false
      
      message.success('保存成功')
      emit('saved')
      return
    }

    // 非延迟创建模式：校验并保存
    if (!options?.skipValidation) {
      const flagValidation = validateFlagRules()
      if (!flagValidation.valid) { message.warning(flagValidation.message); return }

      for (const instance of sectionInstances.value) {
        const validation = validateRequiredFields(instance.instanceId)
        if (!validation.valid) {
          message.warning(validation.message)
          scrollToValidationFailed(instance.instanceId, validation.groupId, validation.attributeId)
          return
        }
      }
    }

    for (const instance of sectionInstances.value) {
      await handleSaveSection(instance.instanceId, { skipValidation: options?.skipValidation })
    }
    message.success('保存成功')
    emit('saved')
  } catch (error) {
    console.error('保存失败:', error)
    message.error('保存失败')
  }
}

// 提交数据
const handleSubmit = async () => {
  Modal.confirm({
    title: '确认提交',
    content: '提交后将无法修改，确定要提交吗？',
    okText: '确定',
    cancelText: '取消',
    async onOk() {
      try {
        const originalModuleIndex = currentModuleIndex.value

        for (let i = 0; i < modules.value.length; i++) {
          await originalHandleModuleChange(i)
          if (sectionInstances.value.length === 0) {
            const sections = availableSections.value
            if (sections.some(s => parseRequired(s.required).type === 'simple')) {
              message.warning(`模块「${modules.value[i].title}」存在必填区块，请填写数据`)
              await originalHandleModuleChange(originalModuleIndex)
              return
            }
            continue
          }

          const flagValidation = validateFlagRules()
          if (!flagValidation.valid) {
            message.warning(`模块「${modules.value[i].title}」: ${flagValidation.message}`)
            await originalHandleModuleChange(originalModuleIndex)
            return
          }

          for (const instance of sectionInstances.value) {
            const validation = validateRequiredFields(instance.instanceId)
            if (!validation.valid) {
              message.warning(`模块「${modules.value[i].title}」: ${validation.message}`)
              scrollToValidationFailed(instance.instanceId, validation.groupId, validation.attributeId)
              await originalHandleModuleChange(originalModuleIndex)
              return
            }
          }
        }

        await originalHandleModuleChange(originalModuleIndex)
        
        // 数据已在编辑过程中实时保存，提交时只做校验，不重复保存
        
        // 触发 submit 事件，业务端执行业务提交逻辑
        emit('submit', composableHistoryId.value)

        message.success('提交成功')
        emit('submitted', composableHistoryId.value)
      } catch (error) {
        console.error('提交失败:', error)
        message.error('提交失败')
      }
    },
  })
}

// 审批通过
const handleApprove = async () => {
  Modal.confirm({
    title: '确认审批',
    content: '确认通过该填报数据的审批？',
    okText: '确认通过',
    cancelText: '取消',
    async onOk() {
      try {
        // 调用审批通过接口
        await formDataHistoryApprove({ historyId: composableHistoryId.value })
        // 触发 approve 事件，业务端执行业务审批逻辑
        emit('approve', composableHistoryId.value)
      } catch (error) {
        console.error('审批失败:', error)
      }
    },
  })
}

// 审批拒绝
const handleReject = async (reason = '') => {
  // 调用审批拒绝接口
  await formDataHistoryReject({ historyId: composableHistoryId.value, rejectReason: reason })
  // 触发 reject 事件，业务端执行业务拒绝逻辑
  emit('reject', composableHistoryId.value, reason)
}

// 拒绝按钮点击（弹出输入框）
const rejectReason = ref('')
const handleRejectClick = () => {
  rejectReason.value = ''
  Modal.confirm({
    title: '确认拒绝',
    content: () => h('div', [
      h('p', { style: 'margin-bottom: 8px;' }, '请输入拒绝理由：'),
      h('textarea', {
        class: 'ant-input',
        style: 'width: 100%; min-height: 80px; padding: 4px 11px; border: 1px solid #d9d9d9; border-radius: 6px; resize: vertical;',
        placeholder: '请输入拒绝理由',
        onInput: (e: Event) => {
          rejectReason.value = (e.target as HTMLTextAreaElement).value
        }
      })
    ]),
    okText: '确认拒绝',
    okButtonProps: { danger: true },
    cancelText: '取消',
    async onOk() {
      if (!rejectReason.value.trim()) {
        message.warning('请输入拒绝理由')
        return Promise.reject()
      }
      try {
        // 调用审批拒绝接口
        await formDataHistoryReject({ historyId: composableHistoryId.value, rejectReason: rejectReason.value })
        // 触发 reject 事件，业务端执行业务拒绝逻辑
        emit('reject', composableHistoryId.value, rejectReason.value)
      } catch (error) {
        console.error('拒绝失败:', error)
      }
    },
  })
}

// lazyCreate模式：保存并提交
const handleLazySubmit = async () => {
  // 1. 先校验完整性
  const flagValidation = validateFlagRules()
  if (!flagValidation.valid) {
    message.warning(flagValidation.message)
    return
  }

  for (const instance of sectionInstances.value) {
    const validation = validateRequiredFields(instance.instanceId)
    if (!validation.valid) {
      message.warning(validation.message)
      scrollToValidationFailed(instance.instanceId, validation.groupId, validation.attributeId)
      return
    }
  }

  // 2. 确认提交
  Modal.confirm({
    title: '确认提交',
    content: '提交后将无法修改，确定要提交吗？',
    okText: '确定',
    cancelText: '取消',
    async onOk() {
      try {
        // 3. 保存数据
        await handleSaveAll()
        
        // 触发 submit 事件，业务端执行业务提交逻辑
        emit('submit', composableHistoryId.value)

        message.success('提交成功')
        emit('submitted', composableHistoryId.value)
      } catch (error) {
        console.error('提交失败:', error)
        message.error('提交失败')
      }
    },
  })
}

// 初始化
const init = async () => {
  const success = await originalInitData({ 
    forceReadonly: props.readonly,
    formId: formIdValue.value,
    formCode: formCodeValue.value,
    historyId: historyIdValue.value,
    lazyCreate: props.lazyCreate
  })
  emit('init:complete', !!success)
  
  if (success) {
    // 将外部传入的 defaultValues 注入到每个 module
    if (props.defaultValues) {
      modules.value.forEach(module => {
        module.defaultValues = props.defaultValues
      })
    }
    
    if (availableSections.value.length === 1 && sectionInstances.value.length === 0 && canEdit.value) {
      await handleAddSection(availableSections.value[0].id)
    } else if (availableSections.value.length > 1 && sectionInstances.value.length === 0 && canEdit.value) {
      sectionSelectModalVisible.value = true
      selectedSectionForModal.value = undefined
    }
  }
}

// 暴露方法和属性
defineExpose({
  // 方法
  handleSaveAll,
  handleSubmit,
  handleSaveSection,
  handleApprove,
  handleReject,
  init,
  // 属性
  historyInfo,
  formInfo,
  pageTitle,
  canEdit,
  currentStatus,
  showSubmitButton,
  showApproveButton,
  showRejectButton
})

// 自动初始化
onMounted(async () => {
  if (props.autoInit) {
    await init()
  }
})
</script>

<template>
  <EvalFormViewer
    ref="viewerRef"
    :page-title="`${pageTitle}`"
    :history-info="historyInfo"
    :loading="loading"
    :has-permission="props.hasPermission"
    :record-not-found="props.recordNotFound"
    :modules="modules"
    :current-module-index="currentModuleIndex"
    :current-module="currentModule"
    :available-sections="availableSections"
    :section-instances="sectionInstances"
    :section-groups="sectionGroups"
    :section-attributes="sectionAttributes"
    :group-instances="groupInstances"
    :is-multi-section="isMultiSection"
    :current-section-instance-id="currentSectionInstanceId"
    :readonly="!canEdit"
    :show-save-button="canEdit && (!!composableHistoryId || !lazyCreate)"
    :show-nav-tree="showNavTree"
    :get-group-rows="getGroupRows"
    :get-group-attributes="getGroupAttributes"
    :get-group-tree="getGroupTree"
    :translate-dict-value="translateDictValue"
    :get-section-progress="getSectionProgress"
    :get-mutual-exclusive-groups="getMutualExclusiveGroups"
    :should-show-group="shouldShowGroup"
    :enterprise-id="props.enterpriseId"
    @module-change="handleModuleChange"
    @add-section="handleAddSection"
    @remove-section="handleRemoveSection"
    @save-section="handleSaveSection"
    @save-all="handleSaveAll"
    @add-group-row="handleAddGroupRow"
    @delete-group-row="handleDeleteGroupRow"
    @update-data="handleUpdateGroupData"
    @select-section="handleSelectSection"
    @mutual-option-change="handleMutualOptionChange"
    @save-group="handleSaveGroup"
  >
    <!-- 头部信息区域（企业名称等） -->
    <template #header-info="slotProps">
      <slot
        name="header-info"
        v-bind="slotProps"
      ></slot>
    </template>
    
    <!-- 状态提示（在表单内容区域显示） -->
    <template #status-alert>
      <a-alert
        v-if="statusAlert"
        :type="statusAlert.type"
        :message="statusAlert.message"
        show-icon
        style="margin-bottom: 16px;"
      >
        <template
          v-if="statusAlert.showReason && statusAlert.reason"
          #description
        >
          <div style="color: #666;">
            <strong>拒绝理由：</strong>{{ statusAlert.reason }}
          </div>
        </template>
      </a-alert>
    </template>
    
    <!-- 按钮区域 -->
    <template #header-actions>
      <slot name="header-actions">
        <!-- lazyCreate模式：暂存 + 提交按钮 -->
        <template v-if="showLazySaveButton">
          <a-button
            style="margin-left: 16px"
            @click="handleSaveAll"
          >
            <template #icon>
              <SaveOutlined />
            </template>
            暂存
          </a-button>
          <a-button
            type="primary"
            style="margin-left: 8px"
            @click="handleLazySubmit"
          >
            <template #icon>
              <SendOutlined />
            </template>
            提交
          </a-button>
        </template>
        <!-- 填报模式：提交按钮 -->
        <a-button
          v-if="showSubmitButton"
          type="primary"
          style="margin-left: 16px"
          @click="handleSubmit"
        >
          <template #icon>
            <SendOutlined />
          </template>
          提交
        </a-button>
        <!-- 审核模式：通过 + 拒绝按钮 -->
        <template v-if="showApproveButton || showRejectButton">
          <a-button
            v-if="showApproveButton"
            type="primary"
            style="margin-left: 16px"
            @click="handleApprove"
          >
            <template #icon>
              <CheckOutlined />
            </template>
            通过
          </a-button>
          <a-button
            v-if="showRejectButton"
            danger
            style="margin-left: 8px"
            @click="handleRejectClick"
          >
            <template #icon>
              <CloseOutlined />
            </template>
            拒绝
          </a-button>
        </template>
      </slot>
    </template>
    
    <!-- 动态透传 field:xxx 插槽 -->
    <template
      v-for="slotName in fieldSlotNames"
      :key="slotName"
      #[slotName]="slotProps"
    >
      <slot
        :name="slotName"
        v-bind="slotProps"
      ></slot>
    </template>

    <!-- slot 透传 -->
    <template #select="slotProps">
      <slot
        name="select"
        v-bind="slotProps"
      ></slot>
    </template>
    
    <template #selectMulti="slotProps">
      <slot
        name="selectMulti"
        v-bind="slotProps"
      ></slot>
    </template>
    
    <template #tree="slotProps">
      <slot
        name="tree"
        v-bind="slotProps"
      ></slot>
    </template>
    
    <template #treeMulti="slotProps">
      <slot
        name="treeMulti"
        v-bind="slotProps"
      ></slot>
    </template>
  </EvalFormViewer>

  <!-- 区块选择弹框 -->
  <a-modal
    v-model:open="sectionSelectModalVisible"
    title="请选择要填写的区块"
    :width="500"
    :mask-closable="false"
    @ok="handleConfirmAddSection"
    @cancel="handleCancelSelectModal"
  >
    <div style="padding: 20px 0;">
      <a-alert
        message="提示"
        description="当前模块支持多个区块，请选择您要填写的区块类型"
        type="info"
        show-icon
        style="margin-bottom: 20px;"
      />
      <a-radio-group
        v-model:value="selectedSectionForModal"
        style="width: 100%;"
      >
        <a-space
          direction="vertical"
          style="width: 100%;"
        >
          <a-radio
            v-for="section in availableSections"
            :key="section.id"
            :value="section.id"
            style="
              width: 100%;
              padding: 12px 16px;
              margin: 0;
              border: 1px solid #e8e8e8;
              border-radius: 6px;
              background: #fafafa;
              transition: all 0.3s;
            "
            @mouseenter="(e) => e.currentTarget.style.borderColor = '#1890ff'"
            @mouseleave="(e) => e.currentTarget.style.borderColor = '#e8e8e8'"
          >
            <div style="display: flex; flex-direction: column; gap: 4px;">
              <span style="font-weight: 600; font-size: 14px; color: #262626;">
                {{ section.title }}
              </span>
              <span
                v-if="section.description"
                style="font-size: 12px; color: #8c8c8c;"
              >
                {{ section.description }}
              </span>
            </div>
          </a-radio>
        </a-space>
      </a-radio-group>
    </div>
  </a-modal>
</template>

<style scoped>
/* 校验失败高亮动画 */
:deep(.validation-highlight) {
  animation: highlight-pulse 0.5s ease-in-out 3;
  box-shadow: 0 0 0 3px rgba(255, 77, 79, 0.3);
  border-radius: 4px;
}

@keyframes highlight-pulse {
  0%, 100% {
    background-color: transparent;
  }
  50% {
    background-color: rgba(255, 77, 79, 0.1);
  }
}
</style>
