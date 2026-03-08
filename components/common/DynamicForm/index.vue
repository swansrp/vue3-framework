<script setup lang="ts">
/**
 * 动态表单填写组件
 * 支持两种使用方式：
 * 1. 作为页面使用：从URL获取 formId 和 historyId 参数
 * 2. 作为组件使用：通过 props 传入 formId 和 historyId
 */
import { SendOutlined } from '@ant-design/icons-vue'
import { message, Modal } from 'ant-design-vue'
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute } from 'vue-router'

import {
  formDataGroupInstanceAdd,
  formDataGroupInstanceDeleteItem,
  formDataGroupInstanceAddList
} from './apis/formDataGroupInstancePortalController'
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

import { submitProduction } from '@/apis/productionController'
import { FILTER_TYPE } from '@/framework/components/common/Portal/type'

// Props 定义
interface Props {
  /** 表单模板ID (schemaProductionId)，优先于URL参数 */
  formId?: string
  /** 上报记录ID，优先于URL参数 */
  historyId?: string
  /** 是否强制只读模式 */
  readonly?: boolean
  /** 是否显示提交按钮 */
  showSubmit?: boolean
  /** 是否自动初始化 */
  autoInit?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  formId: undefined,
  historyId: undefined,
  readonly: false,
  showSubmit: true,
  autoInit: true
})

// Emits
const emit = defineEmits<{
  (e: 'submitted', historyId: string): void
  (e: 'saved'): void
  (e: 'init:complete', success: boolean): void
}>()

const route = useRoute()

// 使用 composable
const {
  canEdit: originalCanEdit,
  hasPermission,
  recordNotFound,
  loading,
  historyId: composableHistoryId,
  historyInfo,
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
  getGroupTree
} = useEvalFormData()

// 计算是否可编辑（考虑 props.readonly）
const canEdit = computed(() => props.readonly ? false : originalCanEdit.value)

// 从 props 或 URL 获取参数
const formIdValue = computed(() => props.formId || route.query.formId as string || '')
const historyIdValue = computed(() => props.historyId || route.query.historyId as string || '')

// 组件 ref
const viewerRef = ref()

// 区块选择弹框
const sectionSelectModalVisible = ref(false)
const selectedSectionForModal = ref<string | undefined>(undefined)

// 计算是否显示提交按钮
const showSubmitButton = computed(() => {
  return props.showSubmit && canEdit.value && historyInfo.value && (historyInfo.value.status === '0' || historyInfo.value.status === '2')
})

// 防抖计时器
const formContentUpdateTimers = new Map<string, any>()

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
      orderList: [{ property: 'id', type: 1 }]
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
  
  try {
    const instances = groupInstances.value[sectionInstanceId] || []
    const instance = instances.find(gi => gi.groupInstanceId === groupInstanceId)
    if (instance) instance.data[attributeId] = value

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
    const sectionInstance = savedSectionData.value[sectionInstanceId]
    if (!sectionInstance) return

    const instances = groupInstances.value[sectionInstanceId] || []
    const newRowIndex = instances.filter(gi => gi.groupId === groupId).length

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
const validateRequiredFields = (sectionInstanceId: string): { valid: boolean; message: string } => {
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

  const validateGroupRecursively = (group: any): { valid: boolean; message: string } => {
    const groupParsed = parseRequired(group.required)
    const groupId = String(group.id)

    if (groupParsed.type === 'simple') {
      const groupInsts = instances.filter(gi => String(gi.groupId) === groupId)
      if (!groupInsts.length) return { valid: false, message: `分组「${group.title}」为必填项，请至少添加一行数据` }
      if (!groupInsts.some(gi => Object.values(gi.data).some(v => v !== null && v !== undefined && v !== ''))) {
        return { valid: false, message: `分组「${group.title}」为必填项，请填写至少一个字段` }
      }
      const groupAttrs = attributes.filter(attr => String(attr.groupId) === groupId && attr.isRequired === '1')
      for (const attr of groupAttrs) {
        if (!groupInsts.some(gi => gi.data[String(attr.id)] !== null && gi.data[String(attr.id)] !== undefined && gi.data[String(attr.id)] !== '')) {
          return { valid: false, message: `字段「${attr.label}」为必填项，请填写` }
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
    if (!result.valid) return result
  }

  return { valid: true, message: '' }
}

// 保存 Section 数据
const handleSaveSection = async (sectionInstanceId: string) => {
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

    const validation = validateRequiredFields(sectionInstanceId)
    if (!validation.valid) { message.warning(validation.message); return }

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
const handleSaveAll = async () => {
  try {

    const flagValidation = validateFlagRules()
    if (!flagValidation.valid) { message.warning(flagValidation.message); return }

    for (const instance of sectionInstances.value) {
      const validation = validateRequiredFields(instance.instanceId)
      if (!validation.valid) { message.warning(validation.message); return }
    }

    for (const instance of sectionInstances.value) {
      await handleSaveSection(instance.instanceId)
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
              await originalHandleModuleChange(originalModuleIndex)
              return
            }
          }
        }

        await originalHandleModuleChange(originalModuleIndex)
        await handleSaveAll()
        await submitProduction({ historyId: composableHistoryId.value })

        message.success('提交成功')
        emit('submitted', composableHistoryId.value)

        setTimeout(() => window.close(), 1000)
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
    historyId: historyIdValue.value
  })
  emit('init:complete', success)
  
  if (success) {
    if (availableSections.value.length === 1 && sectionInstances.value.length === 0 && canEdit.value) {
      await handleAddSection(availableSections.value[0].id)
    } else if (availableSections.value.length > 1 && sectionInstances.value.length === 0 && canEdit.value) {
      sectionSelectModalVisible.value = true
      selectedSectionForModal.value = undefined
    }
  }
}

// 暴露方法
defineExpose({
  handleSaveAll,
  handleSubmit,
  handleSaveSection,
  init
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
    :has-permission="hasPermission"
    :record-not-found="recordNotFound"
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
    :show-save-button="canEdit"
    :show-nav-tree="true"
    :get-group-rows="getGroupRows"
    :get-group-attributes="getGroupAttributes"
    :get-group-tree="getGroupTree"
    :translate-dict-value="translateDictValue"
    :get-section-progress="getSectionProgress"
    :get-mutual-exclusive-groups="getMutualExclusiveGroups"
    :should-show-group="shouldShowGroup"
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
    <!-- 提交按钮 -->
    <template #header-actions>
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
