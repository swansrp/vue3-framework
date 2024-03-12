<template>
  <a-dropdown>
    <template #overlay>
      <a-menu @click="({ key: menuKey }) => emit('onDisplayChanged', menuKey)">
        <a-menu-item key="tableMode" v-if="isListMode || isTreeMode">表格模式</a-menu-item>
        <a-menu-item key="listMode" v-if="!isListMode">列表模式</a-menu-item>
        <a-menu-item v-if="config.treeMode && !isTreeMode" key="treeMode">树形模式</a-menu-item>
      </a-menu>
    </template>
    <a-button shape="text" style="margin-top: -2px">
      <template #icon>
        <table-outlined v-if="!(isListMode || isTreeMode)" />
        <bars-outlined v-if="isListMode" />
        <cluster-outlined v-if="isTreeMode" rotate="-90" />
      </template>
    </a-button>
  </a-dropdown>
</template>

<script lang="ts" setup>
import {TableConfigType} from '@/framework/components/common/portal/type'
import {
  ClusterOutlined,
  TableOutlined,
  BarsOutlined
} from '@ant-design/icons-vue'
const prop = defineProps<{
  config: TableConfigType
  isListMode?: boolean,
  isTreeMode?: boolean,
  currentMode: string
}>()
const emit = defineEmits<{
  (e: 'onDisplayChanged', menuKey: any):void
}>()
</script>

<style scoped>

</style>
