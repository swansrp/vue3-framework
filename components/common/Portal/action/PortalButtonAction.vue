<template>
  <div class="portal-button-space">
    <!-- region 左侧按钮区 -->
    <a-space>
      <a-tooltip
        v-if="config.treeMode && !isTreeDataEmpty"
        placement="top"
      >
        <template #title>
          <span>树形结构</span>
        </template>
        <a-button
          shape="circle"
          size="middle"
          style="margin-left: 3px"
          type="primary"
          @click="() => emit('showTreeMenu')"
        >
          <template #icon>
            <cluster-outlined :rotate="-90" />
          </template>
        </a-button>
      </a-tooltip>
      <a-tooltip
        v-if="!config.readOnly && config.addModalAble"
        placement="top"
      >
        <template #title>
          <span>新增</span>
        </template>
        <a-button
          shape="circle"
          size="middle"
          style="margin-left: 3px"
          type="primary"
          @click="() => emit('addRow')"
        >
          <template #icon>
            <appstore-add-outlined />
          </template>
        </a-button>
      </a-tooltip>
      <a-tooltip
        v-if="!config.plain && !config.hideRefresh"
        placement="top"
      >
        <template #title>
          <span>刷新</span>
        </template>
        <a-button
          shape="circle"
          size="middle"
          style="margin-left: 3px"
          type="primary"
          @click="() => emit('refresh')"
        >
          <template #icon>
            <reload-outlined />
          </template>
        </a-button>
      </a-tooltip>
      <slot name="left-btns"></slot>
    </a-space>
    <!-- endregion 左侧按钮区 -->
    <!-- region 右侧按钮区 -->
    <a-space>
      <slot name="right-btns"></slot>
      <a-tooltip
        v-if="!config.plain && config.advancedSearchButton"
        placement="top"
      >
        <template #title>
          <span>高级查询</span>
        </template>
        <a-button
          shape="circle"
          size="middle"
          style="margin-left: 3px"
          type="primary"
          @click="advancedCondition.show = true"
        >
          <template #icon>
            <funnel-plot-outlined />
          </template>
        </a-button>
      </a-tooltip>
      <a-tooltip
        v-if="!config.readOnly && config.saveAllButtonShow"
        placement="top"
      >
        <template #title>
          <span>保存全部</span>
        </template>
        <a-button
          shape="circle"
          size="middle"
          style="margin-left: 3px"
          type="primary"
          @click="() => emit('saveAll')"
        >
          <template #icon>
            <save-outlined />
          </template>
        </a-button>
      </a-tooltip>
      <a-tooltip
        v-if="!config.readOnly && config.deleteSelectedButtonShow && config.deleteAble"
        placement="top"
      >
        <template #title>
          <span>删除选定</span>
        </template>
        <a-button
          shape="circle"
          size="middle"
          style="margin-left: 3px"
          type="primary"
          @click="() => emit('deleteSelected')"
        >
          <template #icon>
            <delete-outlined />
          </template>
        </a-button>
      </a-tooltip>
      <a-tooltip
        v-if="config.importAble"
        placement="top"
      >
        <template #title>
          <span>导入新增</span>
        </template>
        <a-button
          shape="circle"
          size="middle"
          style="margin-left: 3px"
          type="primary"
          @click="() => emit('openUploadModal')"
        >
          <template #icon>
            <CloudUploadOutlined />
          </template>
        </a-button>
      </a-tooltip>
      <a-tooltip
        v-if="config.exportAble"
        placement="top"
      >
        <template #title>
          <span>导出</span>
        </template>
        <a-button
          shape="circle"
          size="middle"
          style="margin-left: 3px"
          type="primary"
          @click="() => emit('download')"
        >
          <template #icon>
            <DownloadOutlined />
          </template>
        </a-button>
      </a-tooltip>
    </a-space>
    <!-- endregion 右侧按钮区 -->
  </div>
  <portal-advanced-search-modal
    :advanced-condition="advancedCondition"
    @confirm="emit('queryData')"
  />
</template>

<script lang="ts" setup>
import {
  AppstoreAddOutlined,
  CloudUploadOutlined,
  ClusterOutlined,
  DeleteOutlined,
  DownloadOutlined,
  FunnelPlotOutlined,
  ReloadOutlined,
  SaveOutlined
} from '@ant-design/icons-vue'

import { TableConfigType } from '@/framework/components/common/Portal/type'

const prop = defineProps<{
  config: TableConfigType,
  isTreeDataEmpty: boolean,
  advancedCondition: any
}>()
const emit = defineEmits<{
  (e: 'showTreeMenu'): void
  (e: 'addRow'): void
  (e: 'refresh'): void
  (e: 'saveAll'): void
  (e: 'deleteSelected'): void
  (e: 'openUploadModal'): void
  (e: 'download'): void
  (e: 'queryData'): void
}>()
const { config, advancedCondition } = toRefs(prop)
</script>

<style lang="less" scoped>
.portal-button-space {
  display: flex;
  justify-content: space-between;
  margin: 3px 20px 3px 15px;

  // 浮球质感升级（better-ui ⑤）：功能与左右位置不动，纯视觉层
  // 常驻柔光让浮球从表格背景里浮出来；颜色走 design-tokens 的 --accent 随主题自适应
  :deep(.ant-btn-circle.ant-btn-primary) {
    box-shadow: 0 2px 8px color-mix(in srgb, var(--accent, #1677ff) 45%, transparent);
    transition: box-shadow 150ms ease-out, transform 150ms ease-out;
  }

  // hover：光环向外扩散一圈，按钮轻微放大
  @media (hover: hover) {
    :deep(.ant-btn-circle.ant-btn-primary:hover) {
      box-shadow:
        0 4px 14px color-mix(in srgb, var(--accent, #1677ff) 55%, transparent),
        0 0 0 4px color-mix(in srgb, var(--accent, #1677ff) 15%, transparent);
      transform: scale(1.06);
    }
  }

  :deep(.ant-btn-circle.ant-btn-primary:active) {
    transform: scale(0.96);
  }

  // 减弱动效偏好：保留柔光底，去掉位移类反馈
  @media (prefers-reduced-motion: reduce) {
    :deep(.ant-btn-circle.ant-btn-primary),
    :deep(.ant-btn-circle.ant-btn-primary:hover) {
      transform: none;
    }
  }
}
</style>
