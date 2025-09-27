<template>
  <div class="body">
    <content-layout :width="width" class="dark-content-layout">
      <template #side>
        <div class="desc-wrapper">
          <a-descriptions :column="1" class="scrollable-descriptions" layout="vertical">
            <slot name="side"></slot>
          </a-descriptions>
        </div>
      </template>
      <template #content>
        <div class="dark-dialog">
          <div class="title">{{ router.currentRoute.value.meta.title }}</div>
          <div class="dialog-info">
            <portal
              column-display-custom=""
              v-bind="$attrs"
              :action-width="0"
              :advance="advance"
              :advance-condition="advanceCondition"
              :base-domain="baseDomain"
              :current-page="currentPage"
              :default-sort-column="defaultSortColumn"
              :download-file-name="getDownloadFileName"
              :page-size="50"
              :select-column-condition="selectColumnCondition"
              :show-loading="showLoading"
              :table-id="tableId"
              hide-refresh
              hide-row-selection
              multi-header>
              <!-- 转发所有具名插槽 -->
              <template
                v-for="(slotFn, name) in $slots"
                :key="name"
                #[name]="slotProps">
                <component :is="slotFn" v-bind="slotProps" />
              </template>
            </portal>
          </div>
        </div>
      </template>
    </content-layout>
  </div>
</template>

<script lang="ts" setup>
import { ConditionListType } from '@/framework/components/common/AdvancedSearch/ConditionList/type'
import { QuerySortType } from '@/framework/components/common/Portal/type'
import { Ref } from 'vue'

/**
 * 左侧筛选栏只需要写 a-descriptions-item
 */
const router = useRouter()
const getDownloadFileName = (): string => {
  return props.downloadFileName ? props.downloadFileName : router.currentRoute.value.meta.title as string
}
const props = withDefaults(
  defineProps<{
    tableId: string
    width?: number | string
    baseDomain?: string
    downloadFileName?: string
    defaultSortColumn?: Array<QuerySortType>
    condition?: Array<ConditionListType>
    advance?: boolean
    selectColumnCondition?: Map<string, any>
    showLoading?: boolean
  }>(),
  {
    width: 260,
    baseDomain: undefined,
    downloadFileName: undefined,
    condition: [] as any,
    defaultSortColumn: undefined,
    advance: false,
    selectColumnCondition: undefined,
    showLoading: false
  }
)
const { tableId, width, baseDomain, condition, advance, selectColumnCondition, showLoading } = toRefs(props)
const currentPage: Ref<number> = ref(1)
const advanceCondition = computed(() => {
  currentPage.value = 1
  return { conditionList: condition.value } as ConditionListType
})

onMounted(() => {
})
</script>

<style lang="less" scoped src="@/framework/components/common/Portal/css/dark.css"></style>
<style lang="less" scoped>
:deep(.ant-select-clear) {
  background-color: rgb(21, 76, 121) !important;
  color: white !important;
}

:deep(.ant-select-selector) {
  background-color: rgb(21, 76, 121) !important;

  .ant-select-selection-placeholder {
    color: rgba(255, 255, 255, 0.4);
  }

  .ant-select-selection-item {
    color: white;

    svg {
      color: white;
    }
  }
}

:deep(.ant-picker) {
  background-color: rgb(21, 76, 121) !important;
  .ant-picker-input {
    background-color: rgb(21, 76, 121) !important;

    input {
      color: white !important;
    }

    input::placeholder {
      color: rgba(255, 255, 255, 0.4);
    }

    .ant-picker-suffix {
      color: white !important;
    }
  }
}

:deep(.ant-descriptions .ant-descriptions-row >th) {
  padding-bottom: 12px;
}

:deep(.surely-table-cell-content) {
  padding: 4px 4px !important;
}

:deep(.surely-table-header-cell) {
  padding: 2px 0 !important;
}

:deep(.surely-table.surely-table-small .surely-table-auto-header-height .surely-table-header-cell) {
  padding: 2px 0 !important;
}

:deep(.ant-descriptions-item-label) {
  color: white;
}

:deep(.surely-table-row-expand-icon-cell) {
  color: white;
}


:deep(.surely-table-row-expand-icon.surely-table-row-expand-icon-collapsed) {
  color: rgba(21, 76, 121);
}

:deep(.surely-table-row-expand-icon.surely-table-row-expand-icon-collapsed.surely-table-row-expand-icon-disabled) {
  color: rgba(21, 76, 121, 0.4);
}

:deep(.surely-table-row-expand-icon.surely-table-row-expand-icon-expanded) {
  color: rgba(21, 76, 121);
}


.desc-wrapper {
  height: calc(100vh - 40px);
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

.scrollable-descriptions {
  flex: 1;
  overflow-y: auto;
}

.scrollable-descriptions .ant-descriptions-row {
  display: flex;
  flex: 1;
}

.scrollable-descriptions .ant-descriptions-item {
  flex: 1;
  display: flex;
  align-items: center;
  box-sizing: border-box;
}

.side-wrapper {
  height: 100%;
}

.outer-wrap {
  height: 100%;
  width: 100%;
  background-size: cover;
  background-color: #143662;
  background-image: url("imgs/dashboard-bg.svg");
  background-repeat: no-repeat;
}

.background-img {
  height: 100%;
  width: 100%;
  background-size: cover;
  background-image: url("imgs/bg-shadow.svg");
  background-repeat: no-repeat;
}

.body {
  height: 100%;
  width: 100%;
  background-size: cover;
  background-color: #143662;
  background-image: url("imgs/dashboard-bg.svg");
  background-repeat: no-repeat;

  :deep(.ant-descriptions-item-content) {
    input {
      color: white !important;
    }

    input::placeholder {
      color: rgba(255, 255, 255, 0.4);
    }
  }

  :deep(.ant-layout), :deep(.ant-layout-has-sider) {
    height: 100vh !important;
    background: transparent;
  }

  :deep(.side-wrapper) {
    background-color: transparent;
    margin: 5px 8px !important; // 减少侧边栏边距
    box-shadow: 0 4px 10px 0 rgba(69, 89, 120, 0.3) !important; // 减淡阴影
  }

  :deep(.ant-layout-content) {
    background-color: transparent;
    margin-left: 2px !important; // 大幅减少左边距
    margin-right: 5px !important; // 减少右边距
  }

  // 新增：针对DarkTable的布局优化
  &.dark-content-layout {
    :deep(.resize-container) {
      width: 4px !important; // 减少拖拽控制条宽度
    }
  }

  :deep(.ant-layout-sider-children) {
    background: url("imgs/side-bg.png") no-repeat center center;
    height: 100%;
    background-size: 100% 100%;
  }

  :deep(.resize-button-left), :deep(.resize-button-right) {
    width: 30px !important;
    height: 40px;
    background-size: 100% 100% !important;
    color: transparent !important;
  }

  :deep(.resize-button-left) {
    background: url("imgs/resize-icon-left.svg") no-repeat center center;
  }

  :deep(.resize-button-right) {
    background: url("imgs/resize-icon-right.svg") no-repeat center center;
  }

  // 新增：深色主题折叠按钮样式
  :deep(.collapse-button) {
    background: rgba(21, 76, 121, 0.9) !important;
    border: 1px solid rgba(0, 172, 255, 0.3) !important;
    box-shadow: 0 0 12px rgba(0, 172, 255, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1) !important;
    color: #00acff !important;
    backdrop-filter: blur(8px);
    
    &:hover {
      background: rgba(21, 76, 121, 1) !important;
      border-color: #00acff !important;
      box-shadow: 0 0 20px rgba(0, 172, 255, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2) !important;
      color: #ffffff !important;
      transform: translateX(2px);
    }
    
    &:active {
      transform: translateX(1px);
      box-shadow: 0 0 8px rgba(0, 172, 255, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1) !important;
    }
  }
  
  :deep(.collapse-button-expand) {
    &:hover {
      transform: translateX(-2px);
    }
    
    &:active {
      transform: translateX(-1px);
    }
  }
  
  // 深色主题拖拽控制条样式
  :deep(.drag-handle) {
    &:hover {
      background: rgba(0, 172, 255, 0.15) !important;
      
      .drag-indicator {
        opacity: 0.8;
      }
    }
    
    &.dragging {
      background: rgba(0, 172, 255, 0.25) !important;
      
      .drag-indicator {
        opacity: 1;
      }
    }
  }
  
  :deep(.drag-dot) {
    background: rgba(0, 172, 255, 0.6) !important;
  }
  
  :deep(.drag-handle:hover .drag-dot),
  :deep(.drag-handle.dragging .drag-dot) {
    background: #00acff !important;
  }

}


.dark-dialog {
  background: url("imgs/dialog-bg.png") no-repeat center center;
  width: 100%;
  height: calc(100vh - 20px);
  background-size: 100% 100%;
  margin-left: -3px; // 向左偏移，减少间距

  .title {
    margin-top: 12px;
    line-height: 35px;
    color: #fff;
    font-size: 35px;
    font-weight: 700;
    width: 100%;
    height: 60px;
    box-sizing: border-box;
    display: flex;
    justify-content: center;
    font-family: 'Noto Sans SC', serif;
  }

  .dialog-info {
    position: relative;
    width: 98%;
    height: 850px;
    margin: 5px auto;
    transform: translateY(-20px);
    overflow: auto;

    :deep(.root) {
      height: 100%;
    }

    :deep(.portal-table-space) {
      height: 95%;
    }

    :deep(.surely-table-cell-content) {
      font-size: 14px;
    }
  }

}
</style>