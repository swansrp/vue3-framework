<template>
  <div class="forge-container">
    <a-tabs
      v-model:active-key="activeTab"
      type="card"
    >
      <a-tab-pane
        key="matrix"
        tab="矩阵管理"
      >
        <MatrixManage @select="handleSelectMatrix" />
      </a-tab-pane>
      <a-tab-pane
        key="portal"
        tab="Portal配置"
        :disabled="!currentMatrix || currentMatrix.status === '0'"
      >
        <PortalConfig
          v-if="currentMatrix && currentMatrix.id"
          data-mode="MATRIX"
          :reference-id="currentMatrix.id"
          :custom-refresh-fn="handleRefreshPortal"
          :generate-portal-fn="handleGeneratePortal"
        />
      </a-tab-pane>
    </a-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

import MatrixManage from './components/MatrixManage.vue'
import type { MatrixInfo } from './types'
import { refreshPortalForMatrix, generatePortalForMatrix } from '../apis/portalGenerateController'

import PortalConfig from '@/framework/views/MainContent/PortalConfig/index.vue'

const activeTab = ref('matrix')
const currentMatrix = ref<MatrixInfo | null>(null)

const handleSelectMatrix = (matrix: MatrixInfo | null) => {
  currentMatrix.value = matrix
  // 如果取消选择，切回矩阵管理tab
  if (!matrix) {
    activeTab.value = 'matrix'
  }
}

// Matrix专用刷新函数
const handleRefreshPortal = (portalName: string, matrixId: number) => {
  return refreshPortalForMatrix({
    name: portalName,
    referenceId: matrixId,
    dataMode: 'MATRIX'
  })
}

// Matrix专用生成Portal函数
const handleGeneratePortal = (params: { portalName: string, displayName: string, referenceId: number, dataMode: string }) => {
  // 自动添加Matrix后缀
  let finalPortalName = params.portalName
  if (!finalPortalName.endsWith('Matrix')) {
    finalPortalName = finalPortalName + 'Matrix'
  }
  
  return generatePortalForMatrix({
    dataMode: params.dataMode,
    portalName: finalPortalName,
    displayName: params.displayName,
    matrixId: params.referenceId
  })
}
</script>

<style scoped lang="less">
.forge-container {
  padding: 16px;
  height: 100%;
  background: #f0f2f5;

  :deep(.ant-tabs) {
    height: 100%;
    background: #fff;
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
