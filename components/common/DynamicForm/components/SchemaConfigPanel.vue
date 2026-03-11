<script setup lang="ts">
import { PlusOutlined, ExclamationCircleOutlined } from '@ant-design/icons-vue'
import { message, Modal } from 'ant-design-vue'
import { ref, watch, computed, h } from 'vue'


import AttributeFormModal from './AttributeFormModal.vue'
import AttributeGroupFormModal from './AttributeGroupFormModal.vue'
import FormLayoutConfig from './FormLayoutConfig.vue'
import MatrixMappingModal from './MatrixMappingModal.vue'
import ModuleFormModal from './ModuleFormModal.vue'
import ModuleSteps from './ModuleSteps.vue'
import SectionBlock from './SectionBlock.vue'
import SectionFormModal from './SectionFormModal.vue'
import {
  formSchemaAttributeGroupGeneralSelect,
  formSchemaAttributeGroupAdd,
  formSchemaAttributeGroupUpdate,
  formSchemaAttributeGroupDeleteItem
} from '../apis/formSchemaAttributeGroupPortalController'
import {
  formSchemaAttributeGeneralSelect,
  formSchemaAttributeAdd,
  formSchemaAttributeUpdate,
  formSchemaAttributeDeleteItem
} from '../apis/formSchemaAttributePortalController'
import {
  formSchemaModuleGeneralSelect,
  formSchemaModuleAdd,
  formSchemaModuleUpdate,
  formSchemaModuleDeleteItem
} from '../apis/formSchemaModulePortalController'
import {
  formSchemaSectionGeneralSelect,
  formSchemaSectionAdd,
  formSchemaSectionUpdate,
  formSchemaSectionDeleteItem
} from '../apis/formSchemaSectionPortalController'

import Dict from '@/framework/components/common/dict/index.vue'
import { FILTER_TYPE } from '@/framework/components/common/Portal/type'

interface Props {
  formId: string
  formInfo?: any
  /** 是否只读模式 */
  readonly?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  readonly: false
})

// 模块数据
const modules = ref<any[]>([])
const loadingModules = ref(false)

// FormLayoutConfig 组件引用
const formLayoutConfigRef = ref<{ refresh: () => void } | null>(null)

// 当前查看的模块索引（模拟步骤）
const currentModuleIndex = ref(0)

// 当前模块的区块和字段
const currentSections = ref<any[]>([])
const currentGroups = ref<Record<string, any[]>>({}) // key: sectionId, value: groups
const currentAttributes = ref<Record<string, any[]>>({}) // key: sectionId, value: attributes

// 编辑状态
const editingModule = ref<any>(null)
const editingSection = ref<any>(null)
const editingGroup = ref<any>(null)
const editingAttribute = ref<any>(null)

// 模态框
const moduleModalVisible = ref(false)
const sectionModalVisible = ref(false)
const groupModalVisible = ref(false)
const attributeModalVisible = ref(false)
const matrixMappingModalVisible = ref(false)
const currentMatrixSection = ref<any>(null)

// 表单数据
const moduleFormData = ref({
  id: '',
  formId: '',
  title: '',
  description: '',
  multi: '0',
  sort: 0
})

const sectionFormData = ref({
  id: '',
  moduleId: '',
  title: '',
  description: '',
  sort: 0
})

const groupFormData = ref({
  id: '',
  sectionId: '',
  title: '',
  description: '',
  multi: '0',
  sort: 0
})

const attributeFormData = ref({
  id: '',
  sectionId: '',
  groupId: '',
  name: '',
  label: '',
  group: '',
  description: '',
  fieldType: '1',
  dict: '',
  unit: '',
  defaultValue: '',
  maxValue: '',
  minValue: '',
  isRequired: '1',
  readonly: '0',
  width: 30 as number | undefined,  // grid 单位
  height: 1 as number | undefined, // grid 单位
  positionX: undefined as number | undefined,  // X坐标
  positionY: undefined as number | undefined,  // Y坐标
  labelWidth: 120 as number | undefined,  // 标签宽度（px）
  validationRule: '',
  parentAttributeId: '',  // 父属性ID（级联字典用）
  visibilityCondition: undefined as any,  // 显示条件
  sort: 0
})

// 当前视图：schema（模式配置）/ layout（表单布局）
const currentView = ref<'schema' | 'layout'>('schema')

// 当前模块
const currentModule = computed(() => modules.value[currentModuleIndex.value])

// 当前分组内的属性（用于关联属性选择和显示条件）
const currentGroupAttributes = computed(() => {
  const sectionId = attributeFormData.value.sectionId
  const groupId = attributeFormData.value.groupId
  
  if (!sectionId) return []
  
  const sectionAttrs = currentAttributes.value[sectionId] || []
  
  // 如果有 groupId，只返回当前分组内的属性
  if (groupId) {
    return sectionAttrs.filter(attr => attr.groupId === groupId)
  }
  
  // 如果没有 groupId（可能是默认分组），返回所有没有 groupId 或 groupId 为空的属性
  return sectionAttrs.filter(attr => !attr.groupId)
})

const loadModules = async () => {
  loadingModules.value = true
  try {
    const res = await formSchemaModuleGeneralSelect({
      conditionList: [
        { property: 'formId', relation: FILTER_TYPE.EQUAL, value: [props.formId] },
        { property: 'valid', relation: FILTER_TYPE.EQUAL, value: ['1'] }
      ],
      sortList: [{ property: 'sort', type: 0 }]
    }, false, false)

    if (res?.payload) {
      modules.value = res.payload
      if (modules.value.length > 0) {
        await loadSectionsAndAttributes(modules.value[0].id)
      }
    }
  } catch (error) {
    message.error('加载模块列表失败')
  } finally {
    loadingModules.value = false
  }
}

// 加载区块和字段
const loadSectionsAndAttributes = async (moduleId: string) => {
  try {
    const sectionsRes = await formSchemaSectionGeneralSelect({
      conditionList: [
        { property: 'moduleId', relation: FILTER_TYPE.EQUAL, value: [moduleId] },
        { property: 'valid', relation: FILTER_TYPE.EQUAL, value: ['1'] }
      ],
      sortList: [{ property: 'sort', type: 0 }]
    }, false, false)
    
    if (sectionsRes?.payload) {
      currentSections.value = sectionsRes.payload
      
      // 加载每个区块的分组和字段
      for (const section of currentSections.value) {
        // 加载分组（使用扩展查询，包含pid字段）
        const groupsRes = await formSchemaAttributeGroupGeneralSelect({
          conditionList: [
            { property: 'sectionId', relation: FILTER_TYPE.EQUAL, value: [section.id] },
            { property: 'valid', relation: FILTER_TYPE.EQUAL, value: ['1'] }
          ],
          sortList: [{ property: 'sort', type: 0 }]
        }, false, false)
        
        if (groupsRes?.payload) {
          currentGroups.value[section.id] = groupsRes.payload
        } else {
          currentGroups.value[section.id] = []
        }
        
        // 加载字段
        const attrsRes = await formSchemaAttributeGeneralSelect({
          conditionList: [
            { property: 'sectionId', relation: FILTER_TYPE.EQUAL, value: [section.id] },
            { property: 'valid', relation: FILTER_TYPE.EQUAL, value: ['1'] }
          ],
          sortList: [{ property: 'sort', type: 0 }]
        }, false, false)
        
        if (attrsRes?.payload) {
          currentAttributes.value[section.id] = attrsRes.payload
        }
      }
    }
  } catch (error) {
    console.error('加载区块字段失败:', error)
  }
}

// 切换模块
const handleStepChange = async (index: number) => {
  // 如果 index 超出 modules 范围，忽略（这是点击"添加模块"按钮，由 @add 事件处理）
  if (index >= modules.value.length) {
    return
  }
  currentModuleIndex.value = index
  const module = modules.value[index]
  if (module) {
    await loadSectionsAndAttributes(module.id)
  }
}

// ============ 模块管理 ============
const handleAddModule = () => {
  editingModule.value = null
  moduleFormData.value = {
    id: '',
    formId: props.formId,
    title: '',
    description: '',
    multi: '0',
    sort: modules.value.length + 1
  }
  moduleModalVisible.value = true
}

const handleEditModule = (module: any) => {
  editingModule.value = module
  moduleFormData.value = { ...module }
  moduleModalVisible.value = true
}

const handleSaveModule = async (data: any) => {
  try {
    const saveData = { ...data, formId: props.formId }
    
    if (editingModule.value) {
      await formSchemaModuleUpdate({}, saveData, true, true)
    } else {
      await formSchemaModuleAdd(saveData, true, true)
    }
    
    moduleModalVisible.value = false
    await loadModules()
    // 刷新 FormLayoutConfig 数据
    formLayoutConfigRef.value?.refresh()
  } catch (error) {
    console.error('保存模块失败:', error)
  }
}

const handleDeleteModule = (module: any) => {
  Modal.confirm({
    title: '确认删除',
    icon: () => h(ExclamationCircleOutlined),
    content: `确定要删除模块"${module.title}"吗？`,
    okText: '确定',
    cancelText: '取消',
    okType: 'danger',
    async onOk() {
      try {
        await formSchemaModuleDeleteItem({ id: module.id }, true, true)
        await loadModules()
      } catch (error) {
        message.error('删除失败')
      }
    }
  })
}

// ============ 区块管理 ============
const handleAddSection = () => {
  if (!currentModule.value) return
  editingSection.value = null
  sectionFormData.value = {
    id: '',
    moduleId: currentModule.value.id,
    title: '',
    description: '',
    sort: currentSections.value.length + 1
  }
  sectionModalVisible.value = true
}

const handleEditSection = (section: any) => {
  editingSection.value = section
  sectionFormData.value = { ...section }
  sectionModalVisible.value = true
}

const handleSaveSection = async (data: any) => {
  try {
    const saveData = { ...data }
    
    if (editingSection.value) {
      await formSchemaSectionUpdate({}, saveData, true, true)
    } else {
      await formSchemaSectionAdd(saveData, true, true)
    }
    
    sectionModalVisible.value = false
    await loadSectionsAndAttributes(currentModule.value.id)
    // 刷新 FormLayoutConfig 数据
    formLayoutConfigRef.value?.refresh()
  } catch (error) {
    console.error('保存区块失败:', error)
  }
}

const handleDeleteSection = (section: any) => {
  Modal.confirm({
    title: '确认删除',
    icon: () => h(ExclamationCircleOutlined),
    content: `确定要删除区块“${section.title}”吗？`,
    okText: '确定',
    cancelText: '取消',
    okType: 'danger',
    async onOk() {
      try {
        await formSchemaSectionDeleteItem({ id: section.id }, true, true)
        await loadSectionsAndAttributes(currentModule.value.id)
      } catch (error) {
        message.error('删除失败')
      }
    }
  })
}

// ============ 分组管理 ============
const handleAddGroup = (sectionId: string, parentGroupId?: string) => {
  editingGroup.value = null
  const groups = currentGroups.value[sectionId] || []
  groupFormData.value = {
    id: '',
    sectionId,
    pid: parentGroupId ? Number(parentGroupId) : null,
    title: '',
    description: '',
    multi: '0',
    sort: groups.length + 1
  }
  groupModalVisible.value = true
}

const handleEditGroup = (group: any) => {
  editingGroup.value = group
  groupFormData.value = { ...group }
  groupModalVisible.value = true
}

// 构建分组树形结构
const buildGroupTree = (sectionId: string) => {
  const groups = currentGroups.value[sectionId] || []
  const map = new Map<string, any>()
  const roots: any[] = []
  
  // 第一遍：创建所有节点
  for (const group of groups) {
    map.set(String(group.id), {
      ...group,
      children: []
    })
  }
  
  // 第二遍：建立父子关系
  for (const group of groups) {
    const node = map.get(String(group.id))!
    if (group.pid && map.has(String(group.pid))) {
      map.get(String(group.pid))!.children.push(node)
    } else {
      roots.push(node)
    }
  }
  
  // 按 sort 排序
  const sortNodes = (nodes: any[]) => {
    nodes.sort((a, b) => (a.sort || 0) - (b.sort || 0))
    nodes.forEach(n => sortNodes(n.children))
  }
  sortNodes(roots)
  
  return roots
}

// 构建属性映射（包括子分组信息）
const buildAttributesMap = (sectionId: string) => {
  const groups = currentGroups.value[sectionId] || []
  const attributes = currentAttributes.value[sectionId] || []
  const map: Record<string, any> = {}
  
  // 按分组分类属性
  for (const group of groups) {
    const groupId = String(group.id)
    map[groupId] = attributes.filter(attr => String(attr.groupId) === groupId)
    
    // 构建子分组列表
    const children = groups.filter(g => String(g.pid) === groupId)
    if (children.length > 0) {
      map[groupId + '_children'] = children
    }
  }
  
  return map
}

const handleSaveGroup = async (data: any) => {
  try {
    const saveData = { ...data }
    
    if (editingGroup.value) {
      await formSchemaAttributeGroupUpdate({}, saveData, true, true)
    } else {
      await formSchemaAttributeGroupAdd(saveData, true, true)
    }
    
    groupModalVisible.value = false
    await loadSectionsAndAttributes(currentModule.value.id)
    // 刷新 FormLayoutConfig 数据
    formLayoutConfigRef.value?.refresh()
  } catch (error) {
    console.error('保存分组失败:', error)
  }
}

const handleDeleteGroup = (group: any) => {
  Modal.confirm({
    title: '确认删除',
    icon: () => h(ExclamationCircleOutlined),
    content: `确定要删除分组“${group.title}”吗？`,
    okText: '确定',
    cancelText: '取消',
    okType: 'danger',
    async onOk() {
      try {
        await formSchemaAttributeGroupDeleteItem({ id: group.id }, true, true)
        await loadSectionsAndAttributes(currentModule.value.id)
      } catch (error) {
        message.error('删除失败')
      }
    }
  })
}

// ============ 字段管理 ============
const handleAddAttribute = (sectionId: string, groupId?: string) => {
  editingAttribute.value = null
  const attrs = currentAttributes.value[sectionId] || []
  
  // 计算当前 group 内已有属性的最大 Y 坐标
  let maxY = -1
  
  if (groupId) {
    // 如果指定了 groupId，只计算该 group 内的最大 Y 值
    const groupAttrs = attrs.filter((attr: any) => String(attr.groupId) === String(groupId))
    
    groupAttrs.forEach((attr: any) => {
      if (attr.positionY !== undefined && attr.positionY !== null) {
        maxY = Math.max(maxY, attr.positionY)
      }
    })
  } else {
    // 如果没有指定 groupId，计算所有属性的最大 Y 值
    attrs.forEach((attr: any) => {
      if (attr.positionY !== undefined && attr.positionY !== null) {
        maxY = Math.max(maxY, attr.positionY)
      }
    })
  }
  
  // 新属性放在最大 Y + 1 的位置，X 坐标为 5
  const newPositionY = maxY + 1
  const newPositionX = 5
  
  attributeFormData.value = {
    id: '',
    sectionId,
    groupId: groupId || '',
    name: '',
    label: '',
    group: '',
    description: '',
    fieldType: '1',
    dict: '',
    unit: '',
    defaultValue: '',
    maxValue: '',
    minValue: '',
    isRequired: '1',
    readonly: '0',
    width: 30,  // 默认 30%
    height: 1, // 默认 1 格
    positionX: newPositionX,
    positionY: newPositionY,
    labelWidth: 120,  // 默认标签宽度
    validationRule: '',
    sort: attrs.length + 1
  }
  attributeModalVisible.value = true
}

const handleEditAttribute = (attribute: any) => {
  editingAttribute.value = attribute
  attributeFormData.value = { ...attribute }
  attributeModalVisible.value = true
}

const handleSaveAttribute = async (data: any) => {
  try {
    const saveData = { ...data }
    
    if (editingAttribute.value) {
      await formSchemaAttributeUpdate({}, saveData, true, true)
    } else {
      await formSchemaAttributeAdd(saveData, true, true)
    }
    
    attributeModalVisible.value = false
    await loadSectionsAndAttributes(currentModule.value.id)
    // 刷新 FormLayoutConfig 数据
    formLayoutConfigRef.value?.refresh()
  } catch (error) {
    console.error('保存字段失败:', error)
  }
}

const handleDeleteAttribute = (attribute: any) => {
  Modal.confirm({
    title: '确认删除',
    icon: () => h(ExclamationCircleOutlined),
    content: `确定要删除字段"${attribute.label}"吗？`,
    okText: '确定',
    cancelText: '取消',
    okType: 'danger',
    async onOk() {
      try {
        await formSchemaAttributeDeleteItem({ id: attribute.id }, true, true)
        await loadSectionsAndAttributes(currentModule.value.id)
      } catch (error) {
        message.error('删除失败')
      }
    }
  })
}

// 复制字段
const handleCopyAttribute = async (attribute: any) => {
  try {
    const sectionId = attribute.sectionId
    const attrs = currentAttributes.value[sectionId] || []
    
    // 查找同名字段（包括已有数字后缀的）的最大序号
    const baseLabel = attribute.label.replace(/\d+$/, '') // 移除末尾的数字
    const sameNameAttrs = attrs.filter((attr: any) => {
      const attrBaseLabel = attr.label.replace(/\d+$/, '')
      return attrBaseLabel === baseLabel
    })
    
    // 提取已有的数字后缀，找出最大值
    let maxNumber = 0
    sameNameAttrs.forEach((attr: any) => {
      const match = attr.label.match(/(\d+)$/)
      if (match) {
        const num = parseInt(match[1])
        if (num > maxNumber) maxNumber = num
      }
    })
    
    // 如果原字段名没有数字后缀，则从1开始；否则递增
    const hasNumber = /\d+$/.test(attribute.label)
    const newNumber = hasNumber ? maxNumber + 1 : (maxNumber > 0 ? maxNumber + 1 : 1)
    const newLabel = `${baseLabel}${newNumber}`
    
    // 创建副本，移除 id 并调整位置
    const copiedData = {
      ...attribute,
      id: undefined, // 移除 id，让后端生成新 id
      name: `${attribute.name}_copy_${Date.now()}`, // 生成唯一名称
      label: newLabel,
      positionX: Math.min(100 - (attribute.width || 30), (attribute.positionX || 0) + 5), // X 轴向右偏移 5%
      positionY: (attribute.positionY || 0) + 1, // Y 轴向下偏移 1 格
      sort: attrs.length + 1
    }
    
    await formSchemaAttributeAdd(copiedData, true, true)
    await loadSectionsAndAttributes(currentModule.value.id)
    message.success('复制成功')
  } catch (error) {
    console.error('复制失败:', error)
    message.error('复制失败')
  }
}

// ============ 尺寸和位置更新 ============
const handleUpdateAttributeSize = async (attribute: any, size: { width: number; height: number; positionX?: number; positionY?: number }) => {
  try {
    // 1. 立即更新本地数据，避免闪烁
    const sectionId = attribute.sectionId
    const attrList = currentAttributes.value[sectionId]
    if (attrList) {
      const targetAttr = attrList.find((a: any) => a.id === attribute.id)
      if (targetAttr) {
        targetAttr.width = size.width
        targetAttr.height = size.height
        if (size.positionX !== undefined) targetAttr.positionX = size.positionX
        if (size.positionY !== undefined) targetAttr.positionY = size.positionY
      }
    }
    
    // 2. 后台保存到数据库
    const saveData = {
      ...attribute,
      width: size.width,
      height: size.height,
      positionX: size.positionX !== undefined ? size.positionX : attribute.positionX,
      positionY: size.positionY !== undefined ? size.positionY : attribute.positionY
    }
    
    await formSchemaAttributeUpdate({}, saveData, false, false)  // 静默更新，不显示提示
  } catch (error) {
    console.error('更新失败:', error)
    message.error('更新失败')
    // 如果保存失败，重新加载数据恢复
    await loadSectionsAndAttributes(currentModule.value.id)
  }
}

// ============ 矩阵映射配置 ============
const handleConfigMatrix = (section: any) => {
  // 确保 section.id 和 currentAttributes 的 key 类型一致
  const sectionId = String(section.id)
  const attributes = currentAttributes.value[sectionId] || currentAttributes.value[section.id] || []
  
  currentMatrixSection.value = {
    ...section,
    id: sectionId,
    allAttributes: attributes  // 直接附加属性数据
  }
  
  matrixMappingModalVisible.value = true
}

const handleMatrixSynced = async () => {
  // 刷新数据
  await loadSectionsAndAttributes(currentModule.value.id)
}



// 监听表单变化
watch(() => props.formId, () => {
  loadModules()
}, { immediate: true })
</script>

<template>
  <div class="schema-config-panel">
    <!-- 模拟 BioEval 的样式 -->
    <div class="config-header">
      <h2 style="color: #1890ff; font-weight: 600;">
        {{ formInfo?.title || '表单' }} - 属性配置
      </h2>
      <a-space>
        <a-radio-group
          v-model:value="currentView"
          button-style="solid"
        >
          <a-radio-button value="schema">
            模式配置
          </a-radio-button>
          <a-radio-button value="layout">
            表单布局
          </a-radio-button>
        </a-radio-group>
      </a-space>
    </div>

    <!-- 步骤条（模拟 BioEval 的 Steps） - 仅在模式配置时显示 -->
    <ModuleSteps
      v-if="currentView === 'schema'"
      :modules="modules"
      :current-index="currentModuleIndex"
      :readonly="readonly"
      @change="handleStepChange"
      @edit="handleEditModule"
      @delete="handleDeleteModule"
      @add="handleAddModule"
    />

    <!-- Schema 配置视图 -->
    <div
      v-if="currentView === 'schema' && currentModule"
      class="form-preview-section"
    >
      <div class="section-header">
        <h3>区块配置</h3>
        <a-button
          v-if="!readonly"
          @click="handleAddSection"
        >
          <template #icon>
            <PlusOutlined />
          </template>
          新增区块
        </a-button>
      </div>

      <!-- 区块列表 -->
      <SectionBlock
        v-for="section in currentSections"
        :key="section.id"
        :section="section"
        :groups="buildGroupTree(section.id)"
        :attributes="buildAttributesMap(section.id)"
        :readonly="readonly"
        @edit-section="handleEditSection"
        @delete-section="handleDeleteSection"
        @add-group="(sectionId, parentGroupId) => handleAddGroup(sectionId, parentGroupId)"
        @edit-group="handleEditGroup"
        @delete-group="handleDeleteGroup"
        @add-attribute="handleAddAttribute"
        @edit-attribute="handleEditAttribute"
        @delete-attribute="handleDeleteAttribute"
        @copy-attribute="handleCopyAttribute"
        @update-attribute-size="handleUpdateAttributeSize"
        @config-matrix="handleConfigMatrix"
      />

      <a-empty
        v-if="!currentSections.length"
        description="暂无区块，请添加"
        style="margin: 40px 0;"
      />
    </div>

    <!-- 数据结构预览 -->
    <div
      v-else-if="currentView === 'layout'"
      class="form-layout-section"
    >
      <FormLayoutConfig
        ref="formLayoutConfigRef"
        :form-id="formId"
        :form-code="formInfo?.code"
        :readonly="readonly"
        @edit-module="handleEditModule"
        @edit-section="handleEditSection"
        @edit-group="handleEditGroup"
        @edit-attribute="handleEditAttribute"
      />
    </div>

    <a-empty
      v-else-if="!currentModule"
      description="暂无模块，请先添加模块"
      style="margin: 40px 0;"
    />

    <!-- 模块编辑弹窗 -->
    <ModuleFormModal
      v-model:visible="moduleModalVisible"
      :form-data="moduleFormData"
      :is-edit="!!editingModule"
      :form-id="formId"
      @save="handleSaveModule"
    />

    <!-- 区块编辑弹窗 -->
    <SectionFormModal
      v-model:visible="sectionModalVisible"
      :form-data="sectionFormData"
      :is-edit="!!editingSection"
      @save="handleSaveSection"
    />

    <!-- 字段编辑弹窗 -->
    <AttributeFormModal
      v-model:visible="attributeModalVisible"
      :form-data="attributeFormData"
      :is-edit="!!editingAttribute"
      :available-attributes="currentGroupAttributes"
      @save="handleSaveAttribute"
    >
      <!-- 自定义 select 组件：使用 Dict 替换默认的 a-select -->
      <template #select="{ attribute, value, readonly, updateValue, parentValue }">
        <!-- 如果字段有 dict 属性，使用 Dict -->
        <dict
          v-if="attribute.dict"
          :dict-code="attribute.dict"
          :parent-code="parentValue"
          :disabled="readonly"
          :model-value="value"
          :placeholder="`请选择${attribute.label}`"
          :is-manage-mode="true"
          :show-manage-btn="false"
          @update:model-value="updateValue"
        />
        <!-- 否则使用默认的 a-select -->
        <a-select
          v-else
          :disabled="readonly"
          :placeholder="`请选择${attribute.label}`"
          :value="value"
          style="width: 100%"
          @update:value="updateValue"
        />
      </template>

      <!-- 自定义 selectMulti 组件 -->
      <template #selectMulti="{ attribute, value, readonly, updateValue, parentValue }">
        <dict
          v-if="attribute.dict"
          :dict-code="attribute.dict"
          :parent-code="parentValue"
          :disabled="readonly"
          :model-value="value"
          :placeholder="`请选择${attribute.label}`"
          :is-manage-mode="true"
          :show-manage-btn="false"
          multiple
          @update:model-value="updateValue"
        />
        <a-select
          v-else
          :disabled="readonly"
          :placeholder="`请选择${attribute.label}`"
          :value="value"
          mode="multiple"
          style="width: 100%"
          @update:value="updateValue"
        />
      </template>

      <!-- 自定义 tree 组件 -->
      <template #tree="{ attribute, value, readonly, updateValue }">
        <a-tree-select
          :disabled="readonly"
          :placeholder="`请选择${attribute.label}`"
          :value="value"
          style="width: 100%"
          @update:value="updateValue"
        />
      </template>

      <!-- 自定义 treeMulti 组件 -->
      <template #treeMulti="{ attribute, value, readonly, updateValue }">
        <a-tree-select
          :disabled="readonly"
          :placeholder="`请选择${attribute.label}`"
          :value="value"
          multiple
          style="width: 100%"
          @update:value="updateValue"
        />
      </template>
    </AttributeFormModal>

    <!-- 分组编辑弹窗 -->
    <AttributeGroupFormModal
      v-model:visible="groupModalVisible"
      :form-data="groupFormData"
      :is-edit="!!editingGroup"
      :available-groups="currentGroups[groupFormData.sectionId] || []"
      @save="handleSaveGroup"
    />

    <!-- 矩阵映射配置弹窗 -->
    <MatrixMappingModal
      v-if="currentMatrixSection"
      v-model:visible="matrixMappingModalVisible"
      :section-id="currentMatrixSection.id"
      :section-title="currentMatrixSection.title"
      :table-name="currentMatrixSection.tableName"
      :attributes="currentMatrixSection.allAttributes || []"
      :form-code="formInfo?.code"
      @synced="handleMatrixSynced"
    />
  </div>
</template>

<style scoped lang="less">
.schema-config-panel {
  padding: 20px;
  background: #fff;
  height: 100%;
  overflow-y: auto;

  .config-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
    padding-bottom: 16px;
    border-bottom: 1px solid #f0f0f0;

    h2 {
      margin: 0;
    }
  }

  .form-preview-section,
  .form-layout-section {
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;

      h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
        color: #1890ff;
      }
    }
  }
}
</style>
