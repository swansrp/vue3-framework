<template>
  <div class="body">
    <content-layout
      :width="width"
      class="dark-content-layout"
    >
      <template #side>
        <div class="desc-wrapper">
          <a-descriptions
            :column="1"
            class="scrollable-descriptions"
            layout="vertical"
          >
            <slot name="side"></slot>
          </a-descriptions>
        </div>
      </template>
      <template #content>
        <div class="dark-dialog">
          <div class="title">
            {{ router.currentRoute.value.meta.title }}
          </div>
          <div class="dialog-info">
            <portal
              v-bind="$attrs"
              :action-width="0"
              :advance="advance"
              :advance-condition="advanceCondition"
              :base-domain="baseDomain"
              :computed-columns="computedColumns"
              :current-page="currentPage"
              :data="data"
              :default-sort-column="defaultSortColumn"
              :download-file-name="getDownloadFileName"
              :page-size="50"
              :select-column-condition="selectColumnCondition"
              :show-loading="showLoading"
              :table-id="tableId"
              hide-refresh
              hide-row-selection
              read-only
              multi-header
            >
              <!-- 转发所有具名插槽 -->
              <template
                v-for="(slotFn, name) in $slots"
                :key="name"
                #[name]="slotProps"
              >
                <component
                  :is="slotFn"
                  v-bind="slotProps"
                />
              </template>
            </portal>
          </div>
        </div>
      </template>
    </content-layout>
  </div>
</template>

<script lang="ts" setup>
import { Ref } from 'vue'

import { ConditionListType } from '@/framework/components/common/AdvancedSearch/ConditionList/type'
import { QuerySortType } from '@/framework/components/common/Portal/type'

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
    data?: Array<any>
    computedColumns?: Record<string, (row: any) => any>
  }>(),
  {
    width: 260,
    baseDomain: undefined,
    downloadFileName: undefined,
    condition: [] as any,
    defaultSortColumn: undefined,
    advance: false,
    selectColumnCondition: undefined,
    showLoading: false,
    data: undefined,
    computedColumns: undefined
  }
)
const { tableId, width, baseDomain, condition, advance, selectColumnCondition, showLoading, data, computedColumns } = toRefs(props)
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
/* DarkTable 组件封装样式 */
.desc-wrapper {
  height: calc(100vh - 40px);
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  background: transparent;
  color: white;
}

.scrollable-descriptions {
  flex: 1;
  overflow-y: auto;
  background: transparent;
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

/* 确保侧边栏显示 */
:deep(.side-wrapper) {
  height: 100%;
  visibility: visible !important;
  display: block !important;
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
}

.dark-dialog {
  background: url("imgs/dialog-bg.png") no-repeat center center;
  width: 100%;
  height: calc(100vh - 20px);
  background-size: 100% 100%;
  margin-left: -3px;

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
    
    // 强制覆盖表格行背景颜色
    :deep(.portal-table),
    :deep(.surely-table) {
      background-color: rgb(2, 57, 85) !important;
      
      tr:nth-child(even),
      .surely-table-row:nth-child(even) {
        background-color: #1B475D !important;
        background: #1B475D !important;
        color: #ffffff !important;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
      }
      
      tr:nth-child(odd),
      .surely-table-row:nth-child(odd) {
        background-color: #0E3D55 !important;
        background: #0E3D55 !important;
        color: #ffffff !important;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
      }
      
      tr:nth-child(even):hover,
      .surely-table-row:nth-child(even):hover {
        background-color: #1F5570 !important;
        background: #1F5570 !important;
      }
      
      tr:nth-child(odd):hover,
      .surely-table-row:nth-child(odd):hover {
        background-color: #154A66 !important;
        background: #154A66 !important;
      }
      
      // 单元格边框修复
      td,
      .surely-table-cell {
        border-right: 1px solid rgba(255, 255, 255, 0.08) !important;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
        border-top: none !important;
        border-left: none !important;
      }
      
      // 最后一行和最后一列不显示边框
      tr:last-child td,
      tr:last-child .surely-table-cell {
        border-bottom: none !important;
      }
      
      td:last-child,
      .surely-table-cell:last-child {
        border-right: none !important;
      }
    }
    
    :deep(.surely-table-body) {
      background-color: rgb(2, 57, 85) !important;
      
      .surely-table-row:nth-child(even) {
        background-color: #1B475D !important;
        background: #1B475D !important;
        color: #ffffff !important;
      }
      
      .surely-table-row:nth-child(odd) {
        background-color: #0E3D55 !important;
        background: #0E3D55 !important;
        color: #ffffff !important;
      }
    }
  }
}
</style>