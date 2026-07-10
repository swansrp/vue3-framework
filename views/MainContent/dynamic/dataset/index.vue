<template>
  <div class="dataset-container">
    <a-tabs
      v-model:active-key="activeTab"
      type="card"
    >
      <a-tab-pane
        key="dataset"
        tab="Dataset管理"
      >
        <DatasetManage
          @select="handleSelectDataset"
          @open-portal="handleOpenPortal"
        />
      </a-tab-pane>
      <a-tab-pane
        key="portal"
        tab="Portal配置"
        :disabled="!currentDataset"
      >
        <PortalConfig
          v-if="currentDataset"
          data-mode="DATASET"
          :reference-id="currentDataset.id"
          :custom-refresh-fn="handleRefreshPortal"
          :generate-portal-fn="handleGeneratePortal"
        />
      </a-tab-pane>
    </a-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

import DatasetManage from './components/DatasetManage.vue'
import type { DatasetInfo } from './types'
import { refreshPortalForDataset, generatePortalForDataset } from '../apis/portalGenerateController'

import PortalConfig from '@/framework/views/MainContent/PortalConfig/index.vue'

const activeTab = ref('dataset')
const currentDataset = ref<DatasetInfo | null>(null)

const handleSelectDataset = (dataset: DatasetInfo | null) => {
  currentDataset.value = dataset
  // 如果取消选择，切回Dataset管理tab
  if (!dataset) {
    activeTab.value = 'dataset'
  }
}

// 打开当前数据集的 Portal 配置 tab
const handleOpenPortal = (dataset: DatasetInfo) => {
  currentDataset.value = dataset
  activeTab.value = 'portal'
}

// Dataset专用刷新函数
const handleRefreshPortal = (portalName: string, datasetId: number) => {
  return refreshPortalForDataset({
    name: portalName,
    referenceId: datasetId,
    dataMode: 'DATASET'
  })
}

// Dataset专用生成Portal函数
const handleGeneratePortal = (params: { portalName: string, displayName: string, referenceId: number, dataMode: string }) => {
  // 自动添加Dataset后缀
  let finalPortalName = params.portalName
  if (!finalPortalName.endsWith('Dataset')) {
    finalPortalName = finalPortalName + 'Dataset'
  }
  
  return generatePortalForDataset({
    dataMode: params.dataMode,
    portalName: finalPortalName,
    displayName: params.displayName,
    datasetId: params.referenceId
  })
}
</script>

<style scoped lang="less">
.dataset-container {
  padding: 16px;
  height: 100%;
  background: var(--bg-base);

  :deep(.ant-tabs) {
    height: 100%;
    background: var(--bg-elevated);
    padding: 0;
    border-radius: 4px;
  }

  :deep(.ant-tabs-content) {
    height: 100%;
    padding: 0;
  }

  :deep(.ant-tabs-tabpane) {
    height: 100%;
    padding: 0;
  }

  // PortalConfig组件样式覆盖 - 移除左侧间距让组件紧贴左侧
  :deep(.root) {
    height: 100%;
  }

  :deep(.table-list) {
    margin-left: 0;
  }
}
</style>