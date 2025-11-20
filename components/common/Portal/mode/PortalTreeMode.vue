<template>
  <a-tree
    :key="treeData"
    v-model:checked-keys="selectedTreeData"
    :check-strictly="props.checkStrictly"
    :checkable="props.treeCheckAble"
    :draggable="!config.readOnly && config.treeDragAble"
    :show-line="true"
    :tree-data="treeData"
    @drop="(info: AntTreeNodeDropEvent) => emit('updateTree', info)"
    @select="(selectedKeys: any, event: { selected: boolean, selectedNodes: any, node: any, event: any }) => emit('handleTreeSelected', selectedKeys, event)"
  >
    <template #title="{ dataRef }">
      <a-dropdown :trigger="['contextmenu']">
        <span>{{ dataRef.title }}</span>
        <template #overlay>
          <a-menu @click="({ key: menuKey }) => handleMenuContext(dataRef, menuKey)">
            <a-menu-item key="1">
              查看详情
            </a-menu-item>
            <template v-if="!config.readOnly">
              <a-menu-item key="2">
                新增子节点
              </a-menu-item>
              <a-menu-item key="3">
                编辑记录
              </a-menu-item>
              <a-menu-item key="4">
                复制记录
              </a-menu-item>
              <a-menu-item key="5">
                删除记录
              </a-menu-item>
            </template>
          </a-menu>
        </template>
      </a-dropdown>
    </template>
  </a-tree>
  <div style="margin-top: 20px">
    <slot name="end-action"></slot>
  </div>
</template>

<script lang="ts" setup>
import { AntTreeNodeDropEvent } from 'ant-design-vue/es/tree'
import { DataNode } from 'ant-design-vue/es/vc-tree/interface'

import { TableConfigType } from '@/framework/components/common/Portal/type'

const props = withDefaults(defineProps<{
  treeCheckAble?: boolean
  checkStrictly?: boolean
  config: TableConfigType,
  treeData: Array<DataNode>,
  selectedTreeData?: Array<any>
}>(), {
  treeCheckAble: false,
  checkStrictly: false,
  selectedTreeData: undefined
})
const emit = defineEmits<{
  (e: 'update:selectedTreeData', selectedTreeData: Array<any>): void
  (e: 'updateTree', info: AntTreeNodeDropEvent): void
  (e: 'handleTreeSelected', selectedKeys: any, event: { selected: boolean, selectedNodes: any, node: any, event: any }): void
  (e: 'handleMenuContextView', recordId: any): void
  (e: 'handleMenuContextAdd', recordId: any): void
  (e: 'handleMenuContextModify', recordId: any): void
  (e: 'handleMenuContextCopy', recordId: any): void
  (e: 'handleMenuContextDelete', recordId: any): void
}>()
const selectedTreeData = ref(props.selectedTreeData || [])
watch(() => props.selectedTreeData, (data: Array<any> | undefined) => {
  if (data !== undefined) {
    selectedTreeData.value = data
  }
}, { immediate: true })
watch(
  () => selectedTreeData.value,
  (data: Array<any>) => {
    emit('update:selectedTreeData', data)
  }
)
const handleMenuContext = (dataRef: any, menuKey: string) => {
  // 使用 id 作为节点唯一标识，符合树形结构规范
  const recordId = dataRef.id || dataRef.key
  
  switch (menuKey) {
    case '1':
      emit('handleMenuContextView', recordId)
      break
    case '2':
      // 新增子节点，传递父节点的 id
      emit('handleMenuContextAdd', recordId)
      break
    case '3':
      emit('handleMenuContextModify', recordId)
      break
    case '4':
      emit('handleMenuContextCopy', recordId)
      break
    case '5':
      emit('handleMenuContextDelete', recordId)
      break
    default:
      break
  }
}
</script>

<style scoped lang="less">
:deep(.ant-dropdown-menu-item) {
  min-width: 80px;
}
</style>
