<template>
  <left-list-right-table
    :columns="surelyTableColumns"
    :update-table-flag="updateTableFlag"
    @get-left-item-list="getLeftItemList"
    @get-table-by-item="getTableByItem"
    @update-current-item-value="updateCurrentItemValue"
  >
    <template #top_btn_list>
      <a-button
        type="primary"
        style="float: right; margin-bottom: 10px;"
        @click="addTableItem"
      >
        新增
      </a-button>
    </template>
    <template #table_btn_list="{record}">
      <a-button
        size="small"
        type="primary"
        @click="handleEditTable(record)"
      >
        编辑
      </a-button>
      <delete-pop-confirm @delete-event="handleDeleteTable(record)" />
    </template>
  </left-list-right-table>
  <dialog-box
    v-model:visible="addTableItemFinishedVisible"
    title="信息"
    :width="800"
  >
    <a-descriptions
      layout="vertical"
      bordered
      :column="1"
      :label-style="{fontWeight: 'bold'}"
    >
      <a-descriptions-item label="应用标识">
        {{ newTableItemInfo.appKey }}
      </a-descriptions-item>
      <a-descriptions-item label="应用密钥">
        {{ newTableItemInfo.appSecret }}
      </a-descriptions-item>
    </a-descriptions>
  </dialog-box>
  <dialog-box
    v-model:visible="editTableItemBoxVisible"
    title="编辑应用信息"
    :width="400"
  >
    <div style="width: 200px; margin: 0 auto;">
      <a-form-item label="有效性">
        <a-switch v-model:checked="tableDataItemDisabled" />
      </a-form-item>
      <a-form-item>
        <a-button
          html-type="submit"
          type="primary"
          block
          @click="submitEdit"
        >
          提交修改
        </a-button>
      </a-form-item>
    </div>
  </dialog-box>
</template>

<script setup lang="ts">
import { Ref } from 'vue'
import { useRouter } from 'vue-router'

import {
  getSequenceChannelList,
  getSequenceChannelTable,
  addSequenceChannelTable,
  deleteSequenceChannelTable,
  editSequenceChannelTable
} from '@/framework/apis/channel'
import DeletePopConfirm from '@/framework/components/common/deletePopConfirm/DeletePopConfirm.vue'
import DialogBox from '@/framework/components/common/dialogBox/DialogBox.vue'
import LeftListRightTable from '@/framework/components/common/leftListRightTable/index.vue'
import surelyTableColumns from '@/framework/views/MainContent/SystemManage/Channel/channel'


const { currentRoute } = useRouter()
const route = currentRoute.value
const baseDomain = route.query ? route.query.domain ? '/' + route.query.domain : undefined : undefined

let updateTableFlag: Ref<number> = ref(0)
const currentItemValue: Ref<string> = ref('')
let tableDataItemDisabled: Ref<boolean> = ref(false)
let editTableItemBoxVisible: Ref<boolean> = ref(false)
let addTableItemFinishedVisible: Ref<boolean> = ref(false)
let currentTableItemId: Ref<string> = ref('')
let newTableItemInfo: Ref<{appKey: string, appSecret: string}> = ref({ appKey: '', appSecret: '' })

const getLeftItemList = async (name: string, cb: Function) => cb(await getSequenceChannelList(name, 'MDM_PLATFORM_DICT', baseDomain))
const getTableByItem = async (requestData: any, cb: Function) => cb(await getSequenceChannelTable(requestData, baseDomain))
const addTableItem = () => addSequenceChannelTable(currentItemValue.value, baseDomain).then((res) => {
  newTableItemInfo.value.appKey = res.payload.appKey
  newTableItemInfo.value.appSecret = res.payload.appSecret
  addTableItemFinishedVisible.value = true
  updateTableData()
})
const updateCurrentItemValue = (value: string) => currentItemValue.value = value
const updateTableData = () => updateTableFlag.value += 1
const handleEditTable = (record: any) => {
  currentTableItemId.value = record.id
  tableDataItemDisabled.value = !!+record.status
  editTableItemBoxVisible.value = true
}
const submitEdit = () => {
  const id = currentTableItemId.value
  const status = Number(tableDataItemDisabled.value)
  editSequenceChannelTable({ id, status }, baseDomain).then(updateTableData).then(() => editTableItemBoxVisible.value = false)
}
const handleDeleteTable = (record: any) => deleteSequenceChannelTable(record.id, baseDomain).then(updateTableData)

</script>

