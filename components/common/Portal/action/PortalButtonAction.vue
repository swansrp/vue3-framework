<template>
  <div class="portal-button-space">
    <!-- region 左侧按钮区 -->
    <div>
      <a-tooltip v-if="config.treeMode" placement="top">
        <template #title>
          <span>树形结构</span>
        </template>
        <a-button
          shape="circle" size="middle" style="margin-left: 3px" type="primary"
          @click="() => emit('showTreeMenu')">
          <template #icon>
            <cluster-outlined rotate="-90" />
          </template>
        </a-button>
      </a-tooltip>
      <a-tooltip v-if="!config.readOnly && config.addModalAble" placement="top">
        <template #title>
          <span>新增</span>
        </template>
        <a-button shape="circle" size="middle" style="margin-left: 3px" type="primary" @click="() => emit('addRow')">
          <template #icon>
            <appstore-add-outlined />
          </template>
        </a-button>
      </a-tooltip>
      <a-tooltip placement="top">
        <template #title>
          <span>刷新</span>
        </template>
        <a-button shape="circle" size="middle" style="margin-left: 3px" type="primary" @click="() => emit('refresh')">
          <template #icon>
            <reload-outlined />
          </template>
        </a-button>
      </a-tooltip>
    </div>
    <!-- endregion 左侧按钮区 -->
    <!-- region 右侧按钮区 -->
    <div>
      <a-tooltip placement="top">
        <template #title>
          <span>高级查询</span>
        </template>
        <a-button
          shape="circle" size="middle" style="margin-left: 3px" type="primary"
          @click="() => advancedCondition.show = true">
          <template #icon>
            <funnel-plot-outlined />
          </template>
        </a-button>
      </a-tooltip>
      <a-tooltip v-if="!config.readOnly && config.saveAllButtonShow" placement="top">
        <template #title>
          <span>保存全部</span>
        </template>
        <a-button shape="circle" size="middle" style="margin-left: 3px" type="primary" @click="() => emit('saveAll')">
          <template #icon>
            <save-outlined />
          </template>
        </a-button>
      </a-tooltip>
      <a-tooltip v-if="config.importAble" placement="top">
        <template #title>
          <span>导入新增</span>
        </template>
        <a-button
          shape="circle" size="middle" style="margin-left: 3px" type="primary"
          @click="() => emit('openUploadModal')">
          <template #icon>
            <CloudUploadOutlined />
          </template>
        </a-button>
      </a-tooltip>
      <a-tooltip v-if="config.exportAble" placement="top">
        <template #title>
          <span>导出</span>
        </template>
        <a-button shape="circle" size="middle" style="margin-left: 3px" type="primary" @click="() => emit('download')">
          <template #icon>
            <DownloadOutlined />
          </template>
        </a-button>
      </a-tooltip>
    </div>
    <!-- endregion 右侧按钮区 -->
  </div>
</template>

<script lang="ts" setup>
import {TableConfigType} from '@/framework/components/common/Portal/type'
import {
  AppstoreAddOutlined,
  CloudUploadOutlined,
  ClusterOutlined,
  DownloadOutlined,
  FunnelPlotOutlined,
  ReloadOutlined,
  SaveOutlined
} from '@ant-design/icons-vue'

const prop = defineProps<{
  config: TableConfigType
  advancedCondition: any
}>()
const emit = defineEmits<{
  (e: 'showTreeMenu'): void
  (e: 'addRow'): void
  (e: 'refresh'): void
  (e: 'saveAll'): void
  (e: 'openUploadModal'): void
  (e: 'download'): void
}>()
const {config, advancedCondition} = toRefs(prop)
</script>

<style lang="less" scoped>
.portal-button-space {
  display: flex;
  justify-content: space-between;
  margin: 3px 20px 3px 15px;
}
</style>
