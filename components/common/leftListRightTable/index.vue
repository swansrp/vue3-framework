<template>
  <div class="config">
    <a-list size="small" bordered :data-source="listData" class="config-list">
      <template #renderItem="{ item, index }">
        <a-list-item @click="getCurrentName(item.value, index)" :class="{'activate-item': activateDictItem === index}">{{ item.label }}</a-list-item>
      </template>
      <template #header>
        <a-input-search v-model:value="inputName" placeholder="请输入名称" enter-button @search="onSearch" />
      </template>
    </a-list>
    <div class="config-space" ref="configSpace">
      <div v-show="showConfigSpace">
        <slot name="top_btn_list"></slot>
        <surely-table
          ref="tableRef"
          :columns="columns"
          :data-source="surelyTableData"
          :table-height="tableHeight"
          :table-width="tableWidth">
          <template #bodyCell="{ column, record }">
            <template v-if="(column as any).dataIndex === 'operation'">
              <div class="table-operation-btns">
                <slot name="table_btn_list" :record="record"></slot>
              </div>
            </template>
          </template>
        </surely-table>
        <a-pagination
          v-model:current="currentPage"
          v-model:pageSize="pageSize"
          :page-size-options="DEFAULT_PAGE_SIZE_OPTION"
          :total="totalPageNumber"
          show-quick-jumper
          show-size-changer
          class="pagination"
          @change="paginationChange" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">

import {Ref} from "vue";
import * as _ from "lodash";
import {DataNode} from "ant-design-vue/es/vc-tree/interface";
import SurelyTable from "@/framework/components/common/surelyTable/SurelyTable.vue";
import {ColumnsType} from "ant-design-vue/es/table";
import {updateTableSize} from "@/framework/utils/common";
import {
  DEFAULT_CURRENT_PAGE,
  DEFAULT_PAGE_SIZE,
  DEFAULT_PAGE_SIZE_OPTION,
  QUERY_INTERVAL
} from "@/framework/utils/constant";


const props = defineProps<{columns: ColumnsType[], updateTableFlag: number}>()
const {columns} = toRefs(props)

let inputName:Ref<string> = ref('')
let listData = ref<Array<DataNode>>([])
let activateDictItem:Ref<number> = ref(-1)
let showConfigSpace = ref<boolean>(false)
let currentItemValue = ref<string>('')

let configSpace = ref()
let surelyTableData: Ref<Array<DataNode>> = ref([])
let tableWidth:Ref<number> = ref(0)
let tableHeight:Ref<number> = ref(0)

let totalPageNumber: Ref<number> = ref(0)
let currentPage: Ref<number> = ref(DEFAULT_CURRENT_PAGE)
let pageSize: Ref<number> = ref(DEFAULT_PAGE_SIZE)


const getCurrentName = (value: string, index:number) => {
  activateDictItem.value = index
  showConfigSpace.value = true
  currentItemValue.value = value
  currentPage.value = DEFAULT_CURRENT_PAGE
  pageSize.value = DEFAULT_PAGE_SIZE
  emit('updateCurrentItemValue', value)
  getLeftItem()
}

const emit = defineEmits(['getLeftItemList', 'getTableByItem', 'addTableItem', 'updateCurrentItemValue'])
const onSearch = () => renderLeftItemList()

const getLeftItem = () => {
  emit('getTableByItem',
    {platform: currentItemValue.value, currentPage: currentPage.value, pageSize: pageSize.value},
    (res: any) => {
      surelyTableData.value = res.payload.records
      surelyTableData.value.forEach((item: any, index: number) => {
        item.index = index + 1;
        item.key = item.id
      })
      totalPageNumber.value =res.payload.total
      updateTableWidth()
    }
  )
}

const renderLeftItemList = () =>
  emit('getLeftItemList', inputName.value, (res: any) => listData.value = res.payload)

const paginationChange = getLeftItem

watch(inputName, _.debounce(renderLeftItemList, QUERY_INTERVAL))
watch(() => props.updateTableFlag, getLeftItem)

const updateTableWidth = () => updateTableSize(configSpace, tableWidth, 30, tableHeight, 150)
window.addEventListener('resize', _.debounce(updateTableWidth, 50))
onBeforeMount(renderLeftItemList)
onMounted(updateTableWidth)

</script>

<style scoped>
.config {
  display: flex;
  height: calc(100% - 90px);
}
.config-list {
  width: 250px;
  height: calc(100% - 15px);
  box-shadow: 0 4px 10px 0 rgba(69, 89, 120, 0.5);
  margin: 10px 15px;
  overflow: auto;
}
:deep(.config-list .ant-spin-container){
  max-height: 680px;
  overflow: auto;
}
:deep(.config-list .ant-spin-container li){
  cursor: pointer;
}
:deep(.config-list .ant-spin-container li:hover){
  background-color: #e6f7ff;
  border-right: 3px solid #1890ff;
}
.activate-item {
  background-color: #e6f7ff;
  border-right: 3px solid #1890ff;
}


.config-space {
  height: 100%;
  flex: 1 0 auto;
  box-sizing: border-box;
  padding: 10px;
  position: relative;
}
.config-space > div {
  position: absolute;
}
.pagination {
  margin-top: 20px;
  margin-right: 0;
  display: flex;
  justify-content: flex-end;
}
.table-operation-btns {
  display: flex;
  justify-content: space-between;
}
</style>
