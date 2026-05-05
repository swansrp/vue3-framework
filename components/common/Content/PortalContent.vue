<template>
  <portal
    v-if="treeMode"
    ref="portalRef"
    :check-strictly="checkStrictly"
    :table-id="tableId"
    :tree-check-able="multi"
    mode-lock
    read-only
    tree-mode
    @selected-data="onSelectedData"
  />
  <portal
    v-else
    ref="portalRef"
    :single-select="!multi"
    :row-select-props="rowSelectProps"
    :table-id="tableId"
    :check-strictly="checkStrictly"
    hide-association
    list-mode
    mode-lock
    read-only
    @selected-data="onSelectedData"
  />
</template>

<script lang="ts" setup>
import { Ref } from 'vue'

import { isNotEmpty } from '@/framework/utils/common'

const portalRef = ref()
const props = withDefaults(
  defineProps<{
    tableId: string
    modelValue?: any
    treeMode?: boolean
    checkStrictly?: boolean
    multi?: boolean
    valueField?: string
    labelField?: string
    disable?: boolean
    searchAble?: boolean
    rowSelectProps?: (record: any) => any
    labelInValue?: boolean
  }>(),
  {
    modelValue: undefined,
    treeMode: false,
    checkStrictly: false,
    multi: false,
    valueField: 'id',
    labelField: 'name',
    disable: false,
    searchAble: false,
    rowSelectProps: undefined,
    labelInValue: false
  }
)
const { treeMode, modelValue, tableId, multi, valueField, labelField, labelInValue } = toRefs(props)
const emit = defineEmits<{
  (e: 'update:modelValue', value: any): void
  (e: 'change', value: any, label: any): void
}>()
const selectedData: Ref<any> = ref(modelValue.value || [])
const selectedLabel = [] as Array<any>
watch(
  () => selectedData.value,
  () => {
    emit('update:modelValue', selectedData.value)
    emit('change', selectedData.value, selectedLabel)
  },
  {
    deep: true
  }
)
const onSelectedData = (data: any) => {
  if (treeMode.value) {
    selectedData.value = data || []
  } else {
    if (multi.value) {
      if (isNotEmpty(data)) {
        try {
          selectedData.value = [...data]?.map((item: any) => {
            if (labelInValue.value) {
              return { value: item[valueField.value], label: item[labelField.value], data: item }
            } else {
              return item[valueField.value]
            }
          })
        } catch (e) {

        }
      } else {
        selectedData.value = []
      }

    } else {
      if (isNotEmpty(data)) {
        if (labelInValue.value) {
          selectedData.value = [{ value: data[0][valueField.value], label: data[0][labelField.value] }]
        } else {
          selectedData.value = [data[0][valueField.value]]
        }
      } else {
        selectedData.value = []
      }
    }
  }
  console.log('onSelectedData', selectedData.value)
}
const forceUpdate = () => {
  portalRef.value.queryData()
}
defineExpose({ forceUpdate })
onMounted(() => {
})
</script>

<style lang="less" scoped>
.activate-item {
  background-color: var(--accent-soft);
  border-right: 3px solid var(--accent);
}

// 针对list模式优化样式层叠问题
:deep(.portal-tree-wrapper),
:deep(.portal-tree-bind-wrapper) {
  // 移除多余的白色背景和边框，使用透明背景
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  margin: 0 !important;
  border-radius: 0 !important;
  
  // 移除hover效果的额外样式
  &:hover {
    transform: none !important;
    box-shadow: none !important;
  }
}

// 移除ContentLayout中side插槽的margin
:deep(.ant-layout-sider-children) {
  > div {
    margin: 0 !important;
  }
}

// 针对内部portal组件的进一步优化
:deep(.root) {
  // 移除额外的高度计算和边距
  height: 100% !important;
  
  .portal-button-space {
    // 简化按钮区域样式
    background: transparent !important;
    border: none !important;
    box-shadow: none !important;
    border-radius: 0 !important;
    margin: 8px 0 !important;
    padding: 8px 0 !important;
  }
  
  .portal-table-space {
    // 移除表格容器的额外padding
    padding: 0 !important;
    
    .portal-table {
      // 移除table容器的定位和变换，减少一层白色背景
      position: static !important;
      left: auto !important;
      transform: none !important;
      width: 100% !important;
      margin: 0 !important;
      // 保留一定的圆角和阴影，但减弱效果
      border-radius: 8px !important;
      box-shadow: var(--shadow-sm) !important;
      border: 1px solid var(--border-subtle) !important;
    }
  }
}

// 列表模式特殊处理
:deep(.list-mode-table) {
  // 移除列表模式下的额外背景
  background: transparent !important;
  
  // 确保列表项的样式清爽
  .s-table {
    background: transparent !important;
  }
}
</style>