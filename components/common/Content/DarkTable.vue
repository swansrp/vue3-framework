<template>
  <div class="body">
    <content-layout :width="width">
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
              :action-width="0"
              :advance="advance"
              :advance-condition="advanceCondition"
              :base-domain="baseDomain"
              :current-page="currentPage"
              :default-sort-column="defaultSortColumn"
              :download-file-name="getDownloadFileName"
              :page-size="50"
              hide-refresh
              hide-row-selection
              multi-header
              table-id="centralizedPurchaseApply" />
          </div>
        </div>
      </template>
    </content-layout>
  </div>
</template>

<script lang="ts" setup>
import { Ref } from 'vue/dist/vue'
import { ConditionListType } from '@/framework/components/common/AdvancedSearch/ConditionList/type'
import { QuerySortType } from '@/framework/components/common/Portal/type'

/**
 * 左侧筛选栏只需要写 a-descriptions-item
 */
const router = useRouter()
const getDownloadFileName = () => {
  return props.downloadFileName ? props.downloadFileName : router.currentRoute.value.meta.title
}
const props = withDefaults(
  defineProps<{
    width?: number | string
    baseDomain?: string
    downloadFileName?: string
    defaultSortColumn?: Array<QuerySortType>
    condition?: Array<ConditionListType>
    advance?: boolean
  }>(),
  {
    width: 260,
    baseDomain: undefined,
    downloadFileName: undefined,
    condition: [] as any,
    defaultSortColumn: undefined,
    advance: false
  }
)
const { width, condition, advance } = toRefs(props)
const emit = defineEmits<{
  (e: 'update:modelValue', value: any): void
}>()
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
  }

  :deep(.ant-layout-content) {
    background-color: transparent;
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

}


.dark-dialog {
  background: url("imgs/dialog-bg.png") no-repeat center center;
  width: 100%;
  height: calc(100vh - 20px);
  background-size: 100% 100%;

  .title {
    margin-top: 12px;
    line-height: 55px;
    color: #fff;
    font-size: 35px;
    font-weight: 700;
    width: 100%;
    height: 60px;
    box-sizing: border-box;
    display: flex;
    justify-content: center;
    font-family: 'Noto Sans SC', serif;
    background: url("imgs/title-bg.svg") no-repeat;
    background-size: 100% 100%;
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