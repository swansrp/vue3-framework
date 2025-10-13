<template>
  <a-dropdown>
    <template #overlay>
      <a-menu @click="({ key: menuKey }) => emit('onDisplayChanged', menuKey)">
        <a-menu-item
          v-if="isListMode || isTreeMode || isGridMode"
          key="tableMode"
        >
          表格模式
        </a-menu-item>
        <a-menu-item
          v-if="!isListMode"
          key="listMode"
        >
          列表模式
        </a-menu-item>
        <a-menu-item
          v-if="!isGridMode"
          key="gridMode"
        >
          网格模式
        </a-menu-item>
        <a-menu-item
          v-if="config.treeMode && !isTreeMode && !isTreeDataEmpty"
          key="treeMode"
        >
          树形模式
        </a-menu-item>
      </a-menu>
    </template>
    <a-button
      style="margin-top: -2px"
      type="text"
    >
      <template #icon>
        <table-outlined v-if="!(isListMode || isTreeMode || isGridMode)" />
        <bars-outlined v-if="isListMode" />
        <appstore-outlined v-if="isGridMode" />
        <cluster-outlined
          v-if="isTreeMode"
          :rotate="-90"
        />
      </template>
    </a-button>
  </a-dropdown>
</template>

<script lang="ts" setup>
import { AppstoreOutlined, BarsOutlined, ClusterOutlined, TableOutlined } from '@ant-design/icons-vue'

import { TableConfigType } from '@/framework/components/common/Portal/type'

const prop = defineProps<{
  config: TableConfigType
  isListMode?: boolean,
  isTreeMode?: boolean,
  isGridMode?: boolean,
  isTreeDataEmpty: boolean
}>()
const { config, isListMode, isTreeMode, isGridMode, isTreeDataEmpty } = toRefs(prop)
const emit = defineEmits<{
  (e: 'onDisplayChanged', menuKey: any): void
}>()
</script>

<style scoped>

</style>
