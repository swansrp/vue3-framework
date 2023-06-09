<template>
  <div ref="paramsConfigSpace" class="params-config-space">
    <a-button type="primary" @click="refresh" style="position: absolute; right: 20px;top: 15px;">刷新</a-button>
    <div>
      <surely-table
        :columns="surelyTableColumns"
        :data-source="surelyTableData"
        :table-height="tableHeight"
        :table-width="tableWidth"
        @change="tableChange"
        table-id="paramsTemplateTable"
        @handle-search="handleSearch"
        @handle-reset="handleReset">
        <template #bodyCell="{ column, record }">
          <template v-if="(column as any).dataIndex === 'operation'">
            <div class="table-operation-btns">
              <a-button size="small" type="primary" @click="handleEditParams(record)">编辑</a-button>
              <delete-pop-confirm @delete-event="handleDeleteParams(record)" />
            </div>
          </template>
        </template>
        <template #customFilterIcon><search-outlined /></template>
      </surely-table>
      <a-pagination
        v-model:current="currentPage"
        v-model:pageSize="pageSize"
        :page-size-options="pageSizeOptions"
        :total="totalPageNumber"
        class="pagination"
        show-quick-jumper
        show-size-changer
        @change="paginationChange" />
    </div>
    <dialog-box v-model:visible="paramsBoxVisible" title="参数修改" :width="500">
      <a-form :model="paramsForm" @finish="editParams" labelAlign="right">
        <a-form-item
          label="参数键值" name="configValue" required
          :rules="[{required: true, message: '请输入参数键值!'}]">
          <a-input v-model:value="paramsForm['configValue']" placeholder="请输入手机号" />
        </a-form-item>
        <a-form-item>
          <a-button html-type="submit" type="primary" style="float: right;width: 370px;">提交</a-button>
        </a-form-item>
      </a-form>
    </dialog-box>
  </div>
</template>

<script lang="ts" setup>
import {Ref} from "vue";
import * as _ from "lodash";
import {deleteParams, queryParams, refreshParams, updateParams} from "@/framework/apis/params";
import surelyTableColumns from "./constant";
import {SearchOutlined} from "@ant-design/icons-vue";
import {DataNode} from "ant-design-vue/es/vc-tree/interface";
import {DEFAULT_PAGE_SIZE_OPTION} from "@/framework/utils/constant";
import {QueryConditionType, SORT_TYPE, SortObjType} from "@/framework/components/common/surelyTable/contant";
import SurelyTable from "@/framework/components/common/surelyTable/SurelyTable.vue";
import DeletePopConfirm from "@/framework/components/common/deletePopConfirm/DeletePopConfirm.vue";
import DialogBox from "@/framework/components/common/dialogBox/DialogBox.vue";


let currentPage = ref(1)
let pageSize = ref(10)
let totalPageNumber = ref(0)
const surelyTableData: Ref<DataNode[]> = ref([])
const pageSizeOptions = ref<string[]>(DEFAULT_PAGE_SIZE_OPTION)

let sortList: SortObjType[] = []
let myQueryCondition: QueryConditionType | {} = {}

let paramsBoxVisible: Ref<boolean> = ref(false)
let paramsForm: {configValue: string, configId: string} = {configValue: '', configId: ''}

const tableChange = (_pagination: any, _filters: any, sorter: any) => {
  if (!Array.isArray(sorter)){
    const property = sorter.field
    const type = SORT_TYPE[sorter.order]
    sortList = [{property, type}]
  }
  else {
    sortList = sorter.map(item => {
      const property = item.field
      const type = SORT_TYPE[item.order]
      return {property, type}
    })
  }
  getParamsTableData()
}

const paginationChange = (page: number, size: number) => {
  currentPage.value = page
  pageSize.value = size
  getParamsTableData()
}

const refresh = () => refreshParams().then(getParamsTableData)

const handleDeleteParams = (record: any) =>
  deleteParams(record.configId).then(getParamsTableData).then(() => paramsBoxVisible.value = false)

const handleEditParams = (record: any) => {
  paramsForm.configId = record.configId
  paramsForm.configValue = record.configValue
  paramsBoxVisible.value = true
}

const editParams = () =>
  updateParams(paramsForm).then(getParamsTableData).then(() => paramsBoxVisible.value = false)


const handleSearch = (queryCondition: QueryConditionType) => {
  myQueryCondition = queryCondition
  getParamsTableData()
}

const handleReset = (queryCondition: QueryConditionType) => {
  myQueryCondition = queryCondition
  getParamsTableData()
}

const getParamsTableData = () => {
  const queryList = Object.values(myQueryCondition)
  queryParams(queryList, sortList, pageSize.value, currentPage.value).then((res: any) => {
    surelyTableData.value = res.payload.records
    totalPageNumber.value = res.payload.total
    surelyTableData.value.forEach((item: any, index: number) => {
      item['key'] = item.configKey;
      item['index'] = index + 1
    })
  })
}

const paramsConfigSpace: Ref = ref()
let tableWidth: Ref<number> = ref(0)
let tableHeight: Ref<number> = ref(0)
const updateTableWidthAndHeight = () => {
  if (paramsConfigSpace && paramsConfigSpace.value) {
    tableWidth.value = paramsConfigSpace.value.offsetWidth - 40
    tableHeight.value = paramsConfigSpace.value.offsetHeight - 150
  }
}

window.addEventListener('resize', _.debounce(updateTableWidthAndHeight, 50))
onBeforeMount(getParamsTableData)
onMounted(updateTableWidthAndHeight)

</script>

<style scoped>
.params-config-space {
  position: relative;
  height: calc(100% - 70px);
}
.params-config-space > div {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  top: 60px;
}
.table-operation-btns {
  display: flex;
  justify-content: space-between;
}

.pagination {
  margin-top: 15px;
  margin-right: 0;
  display: flex;
  justify-content: flex-end;
}
</style>
