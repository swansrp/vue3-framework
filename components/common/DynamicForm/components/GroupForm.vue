<script setup lang="ts">
import { PlusOutlined, DeleteOutlined, DownOutlined, RightOutlined, CheckCircleFilled, MinusCircleFilled, SaveOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { ref, computed, watch, inject, onMounted, onBeforeUnmount, nextTick, useSlots } from 'vue'

import GridDraggableForm, { type FormFieldItem } from '../../DragGrid/GridDraggableForm.vue'

interface AttributeGroup {
  id: string
  title: string
  description?: string
  multi: string  // '0': 单组, '1': 多组子表
  sort: number
  required?: string // 必填规则
  children?: AttributeGroup[]  // 子分组
}

interface Attribute {
  id: string
  groupId: string
  name: string
  label: string
  fieldType: string
  isRequired: string
  unit?: string
  defaultValue?: string
  description?: string
  width?: number
  height?: number
  positionX?: number
  positionY?: number
  minValue?: string
  maxValue?: string
  dict?: string
  validationRule?: string
  parentAttributeId?: string // 父属性ID（级联字典用）
  visibilityCondition?: string // 显示条件（JSON字符串）
}

interface GroupRow {
  groupInstanceId: string
  rowIndex: number
  data: Record<string, any>  // attributeId -> value
}

interface GroupProgress {
  filled: number
  total: number
  percent: number
}

interface Props {
  group: AttributeGroup
  attributes: Attribute[]
  rows: GroupRow[]  // 多行数据（多组模式）
  readonly?: boolean  // 是否只读模式
  showSaveButton?: boolean  // 是否显示保存按钮
  isDefaultGroup?: boolean  // 是否为默认分组（sort=0）
  isFirstGroup?: boolean   // 是否为第一个分组
  dictTranslateFn?: (dictName: string, value: string) => Promise<string>  // 字典翻译函数
  defaultValues?: Record<string, any>  // 默认值（从外部传入）
  defaultCollapsed?: boolean  // 默认是否折叠
  showProgress?: boolean       // 是否显示进度
  depth?: number  // 嵌套深度（用于缩进显示）
  sectionInstanceId?: string  // Section Instance ID（用于递归）
  sectionId?: string | number  // Section ID（用于递归）
  // 用于递归渲染子 Group 的方法
  getGroupAttributesFn?: (sectionId: string | number, groupId: string) => any[]
  getGroupRowsFn?: (sectionInstanceId: string, groupId: string) => any[]
  // 企业ID，用于 dict 组件的 entity-id
  enterpriseId?: string
}

const props = withDefaults(defineProps<Props>(), {
  readonly: false,
  showSaveButton: true,
  isDefaultGroup: false,
  isFirstGroup: false,
  defaultCollapsed: undefined,
  showProgress: true,
  depth: 0,
  sectionInstanceId: '',
  sectionId: '',
  getGroupAttributesFn: undefined,
  getGroupRowsFn: undefined,
  enterpriseId: undefined
})

const emit = defineEmits<{
  (e: 'addRow'): void  // 添加一行
  (e: 'deleteRow', rowIndex: number): void  // 删除一行
  (e: 'updateData', groupInstanceId: string, attributeId: string, value: any): void  // 更新字段值
  (e: 'saveGroup', groupId: string, rowsData: Array<{ groupInstanceId: string; rowIndex: number; data: Record<string, any> }>): void  // 保存分组数据
}>()

const slots = useSlots()

// 获取所有 field: 开头的 slot 名称
const fieldSlotNames = computed(() => {
  return Object.keys(slots).filter(name => name.startsWith('field:'))
})

// 从父组件 inject 方法（用于递归渲染子 Group）
const injectedGetGroupAttributes = inject<(sectionId: string, groupId: string) => any[]>('getGroupAttributes', () => [])
const injectedGetGroupRows = inject<(sectionInstanceId: string, groupId: string) => any[]>('getGroupRows', () => [])
const injectedSetChildGroupRef = inject<(groupId: string) => (el: any) => void>('setChildGroupRef', () => () => {})
const injectedActiveChildGroupId = inject<any>('activeChildGroupId', null)
// inject groupFormRefs，用于注册子 groups 的 ref
const injectedGroupFormRefs = inject<any>('groupFormRefs', null)

// 优先使用 props 传递的方法，否则使用 inject 的方法
const getGroupAttributes = computed(() => props.getGroupAttributesFn || injectedGetGroupAttributes)
const getGroupRows = computed(() => props.getGroupRowsFn || injectedGetGroupRows)

// 如果是第一层子 Group（depth === 1），注册到父组件
const registerToParent = computed(() => {
  return props.depth === 1 && injectedSetChildGroupRef
})

// 是否多组模式
const isMultiMode = computed(() => props.group.multi === '1')

// 是否显示分组标题（默认分组不显示）
const showGroupTitle = computed(() => !props.isDefaultGroup && props.group.title)

// 是否有子分组
const hasChildGroups = computed(() => {
  return props.group.children && props.group.children.length > 0
})

// 是否是容器型分组（没有字段但有子分组）
const isContainerGroup = computed(() => {
  return props.attributes.length === 0 && hasChildGroups.value
})

// 缩进样式
const indentStyle = computed(() => ({
  marginLeft: `${props.depth * 20}px`
}))

// 折叠状态
const collapsed = ref(false)

// 子 group 的 ref 集合（用于获取子分组数据）
const childGroupRefs = new Map<string, any>()

// 设置子 group ref 的方法（使用稳定的函数引用）
const setChildGroupRef = (groupId: string) => {
  return (el: any) => {
    if (el) {
      childGroupRefs.set(groupId, el)
    } else {
      childGroupRefs.delete(groupId)
    }
  }
}

// 容器型分组的进度缓存（手动更新，避免响应式循环）
const containerProgress = ref<GroupProgress>({ filled: 0, total: 0, percent: 0 })

// 手动更新容器型分组的进度
const updateContainerProgress = () => {
  if (!isContainerGroup.value) return
  
  const childRefs = Array.from(childGroupRefs.values())
  if (childRefs.length === 0) {
    containerProgress.value = { filled: 0, total: props.group.children?.length || 0, percent: 0 }
    return
  }
  
  let completedChildren = 0
  const totalChildren = childRefs.length
  
  for (const childRef of childRefs) {
    if (childRef && childRef.getProgress) {
      const childProgress = childRef.getProgress()
      if (childProgress.percent === 100) {
        completedChildren++
      }
    }
  }
  
  containerProgress.value = {
    filled: completedChildren,
    total: totalChildren,
    percent: totalChildren > 0 ? Math.round(completedChildren / totalChildren * 100) : 0
  }
}

// 字段值变化处理
const handleFieldChange = (groupInstanceId: string, attributeId: string, value: any) => {
  // 实时更新本地数据状态，用于进度计算
  updateLocalRowData(groupInstanceId, attributeId, value)
  emit('updateData', groupInstanceId, attributeId, value)
}

// 本地实时数据状态（用于进度计算）
const localRowsData = ref<Record<string, Record<string, any>>>({})

// 初始化本地数据
const initLocalRowsData = () => {
  props.rows.forEach(row => {
    localRowsData.value[row.groupInstanceId] = { ...row.data }
  })
}

// 更新本地行数据
const updateLocalRowData = (groupInstanceId: string, attributeId: string, value: any) => {
  if (!localRowsData.value[groupInstanceId]) {
    localRowsData.value[groupInstanceId] = {}
  }
  localRowsData.value[groupInstanceId][attributeId] = value
}

// 监听 props.rows 变化，重新初始化本地数据
watch(() => props.rows, () => {
  initLocalRowsData()
}, { immediate: true, deep: true })

// 计算填写进度（基于本地实时数据）
const progress = computed<GroupProgress>(() => {
  // 容器型分组：返回缓存的进度（不在 computed 中访问子组件）
  if (isContainerGroup.value) {
    return containerProgress.value
  }
  
  // 获取本地实时数据
  const localRows = Object.values(localRowsData.value)
  const rowCount = Math.max(1, localRows.length || props.rows.length)
  
  // 普通分组：基于字段填写情况计算进度
  const requiredAttrs = props.attributes.filter(a => a.isRequired === '1')
  const totalRequired = requiredAttrs.length * rowCount
  
  if (totalRequired === 0) {
    // 没有必填字段，统计所有已填字段
    let filled = 0
    let total = props.attributes.length * rowCount
    
    for (const rowData of localRows) {
      for (const attr of props.attributes) {
        const value = rowData[attr.id]
        if (value !== undefined && value !== null && value !== '') {
          filled++
        }
      }
    }
    
    return {
      filled,
      total,
      percent: total > 0 ? Math.round(filled / total * 100) : 0
    }
  }
  
  // 有必填字段，只统计必填字段
  let filled = 0
  for (const rowData of localRows) {
    for (const attr of requiredAttrs) {
      const value = rowData[attr.id]
      if (value !== undefined && value !== null && value !== '') {
        filled++
      }
    }
  }
  
  return {
    filled,
    total: totalRequired,
    percent: totalRequired > 0 ? Math.round(filled / totalRequired * 100) : 0
  }
})

// 是否已完成
const isComplete = computed(() => progress.value.percent === 100)

// 智能默认展开策略
const shouldDefaultExpand = computed(() => {
  // 如果明确指定了默认折叠状态，使用指定值
  if (props.defaultCollapsed !== undefined) {
    return !props.defaultCollapsed
  }
  
  // 如果是第一层子 Group（depth === 1）且有激活状态管理
  if (props.depth === 1 && injectedActiveChildGroupId) {
    // 转换为字符串进行比较，避免类型不匹配
    return String(injectedActiveChildGroupId.value) === String(props.group.id)
  }
  
  // 1. 必填 Group 默认展开
  if (props.group.required === '1') return true
  
  // 2. 已有数据的 Group 默认展开
  if (progress.value.filled > 0) return true
  
  // 3. 第一个 Group 默认展开
  if (props.isFirstGroup) return true
  
  // 4. 默认分组默认展开
  if (props.isDefaultGroup) return true
  
  // 5. 其他默认折叠
  return false
})

// 初始化折叠状态
watch(() => shouldDefaultExpand.value, (shouldExpand) => {
  collapsed.value = !shouldExpand
}, { immediate: true })

// 切换折叠状态
const toggleCollapse = () => {
  collapsed.value = !collapsed.value
}

// 转换attributes为FormFieldItem格式（用于单行或多行的每一行）
const convertToFormFields = (rowData: Record<string, any>): FormFieldItem[] => {
  return props.attributes.map(attr => {
    const widthPercent = attr.width ? Math.round(attr.width) : 10
    const posXPercent = attr.positionX !== undefined && attr.positionX !== null ? Math.round(attr.positionX) : 0
    
    // 值的优先级：实际数据 > 默认值（外部传入） > 字段默认值
    const actualValue = rowData[attr.id]
    const defaultValue = props.defaultValues?.[attr.name] ?? attr.defaultValue
    
    return {
      ...attr,
      data: actualValue ?? defaultValue ?? undefined,
      width: widthPercent,
      height: attr.height || 1,
      positionX: posXPercent,
      positionY: attr.positionY || 0
    }
  })
}

// 单组模式的表单字段
const singleFormFields = computed(() => {
  const firstRow = props.rows[0]
  return firstRow ? convertToFormFields(firstRow.data) : convertToFormFields({})
})

// 单组模式的 groupInstanceId
const singleGroupInstanceId = computed(() => {
  return props.rows[0]?.groupInstanceId || ''
})

// 多组模式的行列表
const multiRows = computed(() => {
  return props.rows.map((row) => ({
    ...row,
    fields: convertToFormFields(row.data)
  }))
})

// GridDraggableForm 组件的 ref
const singleFormRef = ref<any>(null)
const multiFormRefs = ref<Record<string, any>>({})

// 添加行
const handleAddRow = () => {
  emit('addRow')
}

// 删除行
const handleDeleteRow = (rowIndex: number) => {
  emit('deleteRow', rowIndex)
}

// 获取所有行的表单数据（从 GridDraggableForm 组件中获取当前值）
const getAllRowsData = (): Array<{ groupInstanceId: string; rowIndex: number; data: Record<string, any> }> => {
  const result: Array<{ groupInstanceId: string; rowIndex: number; data: Record<string, any> }> = []
  
  // 如果是容器型分组，只返回空数组（数据在子分组中）
  if (isContainerGroup.value) {
    return result
  }
  
  if (isMultiMode.value) {
    // 多组模式：遍历所有行，从对应的 GridDraggableForm 中获取数据
    multiRows.value.forEach((row) => {
      const formRef = multiFormRefs.value[row.groupInstanceId]
      
      if (!formRef || !formRef.getFieldsValue) {
        return
      }
      
      // 从 GridDraggableForm 获取当前表单值
      const formValues = formRef.getFieldsValue()
      
      // 将 formValues 从 fieldName -> attributeId 映射
      const rowData: Record<string, any> = {}
      row.fields.forEach(field => {
        rowData[field.id] = formValues[field.name]
      })
      
      result.push({
        groupInstanceId: row.groupInstanceId,
        rowIndex: row.rowIndex,
        data: rowData
      })
    })
  } else {
    // 单组模式：从唯一的 GridDraggableForm 中获取数据
    if (singleFormRef.value && singleFormRef.value.getFieldsValue) {
      const formValues = singleFormRef.value.getFieldsValue()
      
      // 将 formValues 从 fieldName -> attributeId 映射
      const rowData: Record<string, any> = {}
      singleFormFields.value.forEach(field => {
        rowData[field.id] = formValues[field.name]
      })
      
      result.push({
        groupInstanceId: singleGroupInstanceId.value,
        rowIndex: 0,
        data: rowData
      })
    }
  }
  
  return result
}

// 获取进度信息（供外部调用）
const getProgress = () => progress.value

// 保存当前分组数据
const saving = ref(false)
const handleSaveGroup = async () => {
  if (saving.value) return
  
  try {
    saving.value = true
    
    // 容器型分组：直接触发保存事件，由父组件递归处理子分组
    if (isContainerGroup.value) {
      emit('saveGroup', props.group.id, [])
      return
    }
    
    // 普通分组：验证表单
    if (isMultiMode.value) {
      // 多组模式：验证所有行
      const validationPromises = multiRows.value.map((row) => {
        const formRef = multiFormRefs.value[row.groupInstanceId]
        if (formRef && formRef.validate) {
          return formRef.validate()
        }
        return Promise.resolve({ isValid: true, values: {} })
      })
      
      const results = await Promise.all(validationPromises)
      const allValid = results.every(r => r.isValid)
      
      if (!allValid) {
        message.error('请完善必填信息')
        return
      }
    } else {
      // 单组模式：验证单行
      if (singleFormRef.value && singleFormRef.value.validate) {
        const result = await singleFormRef.value.validate()
        
        if (!result.isValid) {
          message.error('请完善必填信息')
          return
        }
      }
    }
    
    // 验证成功后，获取数据
    const rowsData = getAllRowsData()
    
    if (rowsData.length === 0) {
      message.warning('暂无数据可保存')
      return
    }
    
    // 触发保存事件
    emit('saveGroup', props.group.id, rowsData)
  } catch (error) {
    console.error('[EvalGroupForm.handleSaveGroup] 错误:', error)
    if (error instanceof Error) {
      message.error(error.message || '请完善必填信息')
    } else {
      message.error('请完善必填信息')
    }
  } finally {
    saving.value = false
  }
}

// 创建暴露给父组件的方法对象
const exposedMethods = {
  getAllRowsData,
  getProgress,
  get collapsed() {
    return collapsed.value
  },
  handleSaveGroup,
  setCollapsed: (value: boolean) => {
    collapsed.value = value
  },
  updateContainerProgress  // 暴露给父组件调用
}

// 在组件挂载时注册到父组件
onMounted(() => {
  if (registerToParent.value) {
    const refSetter = injectedSetChildGroupRef(props.group.id)
    // 注册暴露的方法对象而不是组件实例
    refSetter(exposedMethods)
  }
  
  // 将子 group 的 ref 注册到 groupFormRefs 中（递归子 groups 也需要注册）
  if (injectedGroupFormRefs && props.sectionInstanceId && props.group.id) {
    const refKey = `${props.sectionInstanceId}_${String(props.group.id)}`
    injectedGroupFormRefs.value[refKey] = exposedMethods
  }
  
  // 容器型分组：初始化进度
  if (isContainerGroup.value) {
    // 等待下一帧，确保子组件已经渲染
    nextTick(() => {
      updateContainerProgress()
    })
  }
})

// 在组件卸载时取消注册
onBeforeUnmount(() => {
  if (registerToParent.value) {
    const refSetter = injectedSetChildGroupRef(props.group.id)
    refSetter(null)
  }
  
  // 从 groupFormRefs 中取消注册
  if (injectedGroupFormRefs && props.sectionInstanceId && props.group.id) {
    const refKey = `${props.sectionInstanceId}_${String(props.group.id)}`
    delete injectedGroupFormRefs.value[refKey]
  }
})

// 暴露方法给父组件
defineExpose({
  getAllRowsData,
  getProgress,
  collapsed,
  handleSaveGroup,
  setCollapsed: (value: boolean) => {
    collapsed.value = value
  }
})
</script>

<template>
  <div
    class="eval-group-form"
    :data-group-id="group.id"
    :style="indentStyle"
    :class="{ 
      'is-default-group': isDefaultGroup, 
      'is-multi-mode': isMultiMode,
      'is-collapsed': collapsed && showGroupTitle,
      'is-complete': isComplete,
      'has-indent': depth > 0
    }"
  >
    <!-- 分组标题（可折叠） -->
    <div
      v-if="showGroupTitle"
      class="group-header"
      :class="{ 'clickable': true }"
    >
      <div 
        class="header-left"
        @click="toggleCollapse"
      >
        <span class="collapse-icon">
          <DownOutlined v-if="!collapsed" />
          <RightOutlined v-else />
        </span>
        <h4>{{ group.title }}</h4>
      </div>
      <div class="header-right">
        <!-- 进度显示 -->
        <template v-if="showProgress">
          <span
            v-if="isComplete"
            class="progress-text complete"
          >
            <CheckCircleFilled /> 已完成
          </span>
          <!-- 容器型分组：显示子分组完成数 -->
          <template v-else-if="isContainerGroup">
            <span
              v-if="progress.filled > 0"
              class="progress-text in-progress"
            >
              <MinusCircleFilled /> 已完成 {{ progress.filled }}/{{ progress.total }} 个子分组
            </span>
            <span
              v-else
              class="progress-text empty"
            >
              未填写
            </span>
          </template>
          <!-- 普通分组：显示字段填写数 -->
          <template v-else>
            <span
              v-if="progress.filled > 0"
              class="progress-text in-progress"
            >
              <MinusCircleFilled /> 已填 {{ progress.filled }}/{{ progress.total }}
            </span>
            <span
              v-else
              class="progress-text empty"
            >
              未填写
            </span>
          </template>
        </template>
        
        <!-- 保存按钮 -->
        <a-button
          v-if="!readonly && showSaveButton"
          type="primary"
          size="small"
          :loading="saving"
          class="save-group-btn"
          @click="handleSaveGroup"
        >
          <template #icon>
            <SaveOutlined />
          </template>
        </a-button>
      </div>
    </div>

    <!-- 折叠内容 -->
    <div
      v-show="!collapsed || !showGroupTitle"
      class="group-content"
    >
      <!-- 单组模式：只显示一个表单（仅在有字段定义或没有子分组时显示） -->
      <div
        v-if="!isMultiMode && (attributes.length > 0 || !hasChildGroups)"
        class="single-form"
      >
        <GridDraggableForm
          ref="singleFormRef"
          :items="singleFormFields"
          :grid-size="50"
          :gap="10"
          :min-height="150"
          :readonly="readonly"
          :dict-translate-fn="dictTranslateFn"
          :has-child-groups="hasChildGroups"
          @field-change="(attributeId: string, value: any) => handleFieldChange(singleGroupInstanceId, attributeId, value)"
        >
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

          <!-- 传递 select 插槽 -->
          <template
            v-if="$slots['select']"
            #select="slotProps"
          >
            <slot
              name="select"
              v-bind="slotProps"
            ></slot>
          </template>

          <!-- 传递 selectMulti 插槽 -->
          <template
            v-if="$slots['selectMulti']"
            #selectMulti="slotProps"
          >
            <slot
              name="selectMulti"
              v-bind="slotProps"
            ></slot>
          </template>

          <!-- 传递 tree 插槽 -->
          <template
            v-if="$slots['tree']"
            #tree="slotProps"
          >
            <slot
              name="tree"
              v-bind="slotProps"
            ></slot>
          </template>

          <!-- 传递 treeMulti 插槽 -->
          <template
            v-if="$slots['treeMulti']"
            #treeMulti="slotProps"
          >
            <slot
              name="treeMulti"
              v-bind="slotProps"
            ></slot>
          </template>
        </GridDraggableForm>
      </div>

      <!-- 多组模式：显示多行表单（仅在有字段定义或没有子分组时显示） -->
      <div
        v-else-if="isMultiMode && (attributes.length > 0 || !hasChildGroups)"
        class="multi-forms"
      >
        <div
          v-for="(row, index) in multiRows"
          :key="row.groupInstanceId"
          class="row-form"
        >
          <div class="row-header">
            <span class="row-number">第 {{ index + 1 }} 行</span>
            <a-button
              v-if="!readonly"
              type="link"
              size="small"
              danger
              @click="handleDeleteRow(row.rowIndex)"
            >
              <DeleteOutlined /> 删除
            </a-button>
          </div>
        
          <GridDraggableForm
            :ref="(el) => { if (el) multiFormRefs[row.groupInstanceId] = el }"
            :items="row.fields"
            :grid-size="50"
            :gap="10"
            :min-height="150"
            :readonly="readonly"
            :dict-translate-fn="dictTranslateFn"
            :has-child-groups="hasChildGroups"
            @field-change="(attributeId: string, value: any) => handleFieldChange(row.groupInstanceId, attributeId, value)"
          >
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

            <!-- 传递 select 插槽 -->
            <template
              v-if="$slots['select']"
              #select="slotProps"
            >
              <slot
                name="select"
                v-bind="slotProps"
              ></slot>
            </template>

            <!-- 传递 selectMulti 插槽 -->
            <template
              v-if="$slots['selectMulti']"
              #selectMulti="slotProps"
            >
              <slot
                name="selectMulti"
                v-bind="slotProps"
              ></slot>
            </template>

            <!-- 传递 tree 插槽 -->
            <template
              v-if="$slots['tree']"
              #tree="slotProps"
            >
              <slot
                name="tree"
                v-bind="slotProps"
              ></slot>
            </template>

            <!-- 传递 treeMulti 插槽 -->
            <template
              v-if="$slots['treeMulti']"
              #treeMulti="slotProps"
            >
              <slot
                name="treeMulti"
                v-bind="slotProps"
              ></slot>
            </template>
          </GridDraggableForm>
        </div>

        <!-- 多组模式底部添加按钮 -->
        <div
          v-if="!readonly"
          class="add-row-footer"
        >
          <a-button
            type="dashed"
            block
            @click="handleAddRow"
          >
            <PlusOutlined /> 添加一行
          </a-button>
        </div>
      </div>

      <!-- 空状态：注释掉，因为 GridDraggableForm 已经显示了"暂无表单字段" -->
      <!-- <a-empty
        v-if="attributes.length === 0 && rows.length === 0 && !hasChildGroups"
        description="暂无数据"
        style="margin: 20px 0"
      /> -->
    </div>
    
    <!-- 递归渲染子分组 -->
    <div
      v-if="hasChildGroups && !collapsed"
      class="child-groups"
    >
      <EvalGroupForm
        v-for="childGroup in group.children"
        :key="childGroup.id"
        :ref="setChildGroupRef(String(childGroup.id))"
        :group="childGroup"
        :attributes="getGroupAttributes(sectionId, String(childGroup.id))"
        :rows="getGroupRows(sectionInstanceId, String(childGroup.id))"
        :readonly="readonly"
        :show-save-button="showSaveButton"
        :is-default-group="false"
        :is-first-group="false"
        :dict-translate-fn="dictTranslateFn"
        :default-values="defaultValues"
        :show-progress="showProgress"
        :depth="depth + 1"
        :section-instance-id="sectionInstanceId"
        :section-id="sectionId"
        :get-group-attributes-fn="getGroupAttributes"
        :get-group-rows-fn="getGroupRows"
        :enterprise-id="enterpriseId"
        @add-row="() => $emit('addRow')"
        @delete-row="(rowIndex) => $emit('deleteRow', rowIndex)"
        @update-data="(groupInstanceId, attributeId, value) => $emit('updateData', groupInstanceId, attributeId, value)"
        @save-group="(groupId, rowsData) => $emit('saveGroup', groupId, rowsData)"
      >
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

        <!-- 传递 select 插槽 -->
        <template
          v-if="$slots['select']"
          #select="slotProps"
        >
          <slot
            name="select"
            v-bind="slotProps"
          ></slot>
        </template>

        <!-- 传递 selectMulti 插槽 -->
        <template
          v-if="$slots['selectMulti']"
          #selectMulti="slotProps"
        >
          <slot
            name="selectMulti"
            v-bind="slotProps"
          ></slot>
        </template>

        <!-- 传递 tree 插槽 -->
        <template
          v-if="$slots['tree']"
          #tree="slotProps"
        >
          <slot
            name="tree"
            v-bind="slotProps"
          ></slot>
        </template>

        <!-- 传递 treeMulti 插槽 -->
        <template
          v-if="$slots['treeMulti']"
          #treeMulti="slotProps"
        >
          <slot
            name="treeMulti"
            v-bind="slotProps"
          ></slot>
        </template>
      </EvalGroupForm>
    </div>
  </div>
</template>

<style scoped lang="less">
.eval-group-form {
  margin-bottom: 16px;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.3s;
  
  &.has-indent {
    border-left: 2px solid #d9d9d9;
    margin-left: 0;
  }

  &.is-default-group {
    // 默认分组样式：无边框或浅色背景
    border: none;
    
    .group-content {
      padding: 0;
    }
  }

  &.is-multi-mode {
    // 多组模式：添加一些视觉区分
  }
  
  &.is-collapsed {
    border-color: #d9d9d9;
    
    .group-header {
      margin-bottom: 0;
      border-radius: 8px;
    }
  }
  
  &.is-complete {
    border-color: #b7eb8f;
    
    .group-header {
      background: linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%);
      border-left-color: #52c41a;
    }
  }

  .group-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background: linear-gradient(135deg, #f0f7ff 0%, #e6f7ff 100%);
    border-left: 4px solid #1890ff;
    border-radius: 8px 8px 0 0;
    transition: all 0.3s;
    
    .header-left {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      user-select: none;
      flex: 1;
      
      &:hover {
        opacity: 0.8;
      }
      
      .collapse-icon {
        color: #1890ff;
        font-size: 12px;
        transition: transform 0.3s;
      }
    }

    h4 {
      margin: 0;
      font-size: 15px;
      font-weight: 600;
      color: #1890ff;
    }
    
    .header-right {
      display: flex;
      align-items: center;
      gap: 12px;
      
      .save-group-btn {
        width: 28px;
        height: 28px;
        padding: 0;
        display: flex;
        align-items: center;
        justify-content: center;
      }
    }
    
    .progress-text {
      font-size: 13px;
      display: flex;
      align-items: center;
      gap: 4px;
      
      &.complete {
        color: #52c41a;
      }
      
      &.in-progress {
        color: #1890ff;
      }
      
      &.empty {
        color: #999;
      }
    }
  }
  
  .group-content {
    padding: 16px;
    background: #fff;
    animation: slideDown 0.3s ease;
  }

  .single-form {
    padding: 12px;
    background: #fafafa;
    border: 1px solid #f0f0f0;
    border-radius: 6px;
  }

  .multi-forms {
    .row-form {
      margin-bottom: 16px;
      padding: 12px;
      background: #fafafa;
      border: 1px solid #f0f0f0;
      border-radius: 6px;
      
      .row-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
        padding-bottom: 8px;
        border-bottom: 1px dashed #d9d9d9;

        .row-number {
          font-size: 13px;
          font-weight: 600;
          color: #666;
        }
      }
    }

    .add-row-footer {
      margin-top: 8px;
    }
  }
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
