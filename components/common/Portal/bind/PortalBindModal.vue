<template>
  <dialog-box
    v-model:visible="bindDialogBox.show"
    :title="title + '授权'"
    is-full>
    <a-tabs
      v-model:activeKey="bindDialogBox.tab"
      type="card"
      @change="handleTabChanged">
      <a-tab-pane key="0" :tab="'已授权' + title">
        <div style="height: calc(100vh - 200px);">
          <Portal
            ref="bindPortal"
            :query="queryBindListFunc"
            :table-id="attacheEntity"
            read-only>
            <!-- :advance-condition="entityDialogBox.column.entityCondition"-->
            <template #action="{ portalConfig, column, record }">
              <a-button type="text" @click="unbind(portalConfig, column, record)">取消</a-button>
            </template>
          </Portal>
        </div>
      </a-tab-pane>
      <a-tab-pane key="1" :tab="'未授权' + title">
        <div style="height: calc(100vh - 200px);">
          <Portal
            ref="unbindPortal"
            :query="queryUnbindListFunc"
            :table-id="attacheEntity"
            read-only>
            <!-- :advance-condition="entityDialogBox.column.entityCondition"-->
            <template #action="{ portalConfig, column, record }">
              <a-button type="text" @click="bind(portalConfig, column, record)">授权</a-button>
            </template>
          </Portal>
        </div>
      </a-tab-pane>
      <a-tab-pane key="2" :tab="'全部' + title">
        <div style="height: calc(100vh - 200px);">
          <Portal
            ref="allPortal"
            :table-id="attacheEntity"
            read-only />
        </div>
      </a-tab-pane>
      <template #rightExtra>
        <template v-if="bindDialogBox.tab === '0'">
          <a-button
            :disabled="isEmpty(bindPortal?.getRowSelection())" style="margin-right: 5px;" type="primary"
            @click="unbindSelected">清除选中
          </a-button>
          <a-button type="primary" @click="unbindAll">清除全部</a-button>
        </template>
        <template v-if="bindDialogBox.tab === '1'">
          <a-button
            :disabled="isEmpty(unbindPortal?.getRowSelection())" style="margin-right: 5px;" type="primary"
            @click="bindSelected">授权选中
          </a-button>
          <a-button type="primary" @click="bindAll">授权全部</a-button>
        </template>
        <template v-if="bindDialogBox.tab === '2'">
          <a-button type="primary" @click="bindReplace">选中替换授权</a-button>
        </template>
      </template>
    </a-tabs>
  </dialog-box>
</template>

<script lang="ts" setup>
import { ColumnType, QueryType, TableConfigType } from '@/framework/components/common/Portal/type'
import {
  bindAllAttach,
  bindAttach,
  bindBatchAttach,
  bindReplaceAllAttach,
  bindReplaceBatchAttach,
  queryBindList,
  queryUnbindList,
  unbindAllAttach,
  unbindAttach,
  unbindBatchAttach
} from '@/framework/apis/portal'
import { isEmpty, isNotEmpty } from '@/framework/utils/common'
import { Modal } from 'ant-design-vue'
import { createVNode } from 'vue'
import { ExclamationCircleOutlined } from '@ant-design/icons-vue'

const prop = defineProps<{
  baseDomain: string
  attacheEntity: string,
  title: string
}>()
const {attacheEntity, title} = toRefs(prop)
const bindPortal = ref()
const unbindPortal = ref()
const allPortal = ref()
const bindDialogBox: { show: boolean, entityName: string, entityId: any, tab: string, attachName: string } = reactive({
  show: false,
  entityName: '',
  entityId: null,
  tab: '0',
  attachName: attacheEntity.value
})
const showBindDialogBox = (entityName: string, entityId: any) => {
  bindDialogBox.tab = '0'
  bindDialogBox.entityName = entityName
  bindDialogBox.entityId = entityId
  bindDialogBox.show = true
}
const bind = (portalConfig: TableConfigType, column: ColumnType, record: any) => {
  bindAttach(bindDialogBox.entityName, bindDialogBox.attachName, bindDialogBox.entityId, record[portalConfig.rowKey], prop.baseDomain)
    .then(unbindPortal.value.queryData)
}
const unbind = (portalConfig: TableConfigType, column: ColumnType, record: any) => {
  unbindAttach(bindDialogBox.entityName, bindDialogBox.attachName, bindDialogBox.entityId, record[portalConfig.rowKey], prop.baseDomain)
    .then(bindPortal.value.queryData)
}
const bindSelected = () => {
  bindBatchAttach(bindDialogBox.entityName, bindDialogBox.attachName, bindDialogBox.entityId, unbindPortal.value.getRowSelection(), prop.baseDomain)
    .then(unbindPortal.value.queryData)
}
const unbindSelected = () => {
  unbindBatchAttach(bindDialogBox.entityName, bindDialogBox.attachName, bindDialogBox.entityId, bindPortal.value.getRowSelection(), prop.baseDomain)
    .then(bindPortal.value.queryData)
}
const bindAll = () => {
  Modal.confirm({
    title: '将所有' + title.value + '进行授权',
    icon: createVNode(ExclamationCircleOutlined),
    content: createVNode('div', {style: 'color:red;'}, '注意: 单次授权数量大于60000条可能会失败'),
    onOk() {
      bindAllAttach(bindDialogBox.entityName, bindDialogBox.attachName, bindDialogBox.entityId, unbindPortal.value.queryCondition(), prop.baseDomain)
        .then(unbindPortal.value.queryData)
    },
    onCancel() {

    }
  })

}
const unbindAll = () => {
  Modal.confirm({
    title: '将所有' + title.value + '授权取消',
    icon: createVNode(ExclamationCircleOutlined),
    content: createVNode('div', {style: 'color:red;'}, '注意: 所有授权信息将被清除'),
    onOk() {
      unbindAllAttach(bindDialogBox.entityName, bindDialogBox.attachName, bindDialogBox.entityId, prop.baseDomain)
        .then(bindPortal.value.queryData)
    },
    onCancel() {

    }
  })
}
const bindReplace = () => {
  if (isNotEmpty(allPortal.value.getRowSelection())) {
    Modal.confirm({
      title: '将选中' + title.value + '进行授权的',
      icon: createVNode(ExclamationCircleOutlined),
      content: createVNode('div', {style: 'color:red;'}, '注意: 原有授权信息将被清除'),
      onOk() {
        bindReplaceBatchAttach(bindDialogBox.entityName, bindDialogBox.attachName, bindDialogBox.entityId, allPortal.value.getRowSelection(), prop.baseDomain)
          .then(allPortal.value.queryData)
      },
      onCancel() {

      }
    })
  } else {
    Modal.confirm({
      title: '将授权全部符合当前条件的' + title.value,
      icon: createVNode(ExclamationCircleOutlined),
      content: createVNode('div', {style: 'color:red;'}, '注意: 原有授权信息将被清除,单次授权数量大于60000条可能会失败'),
      onOk() {
        bindReplaceAllAttach(bindDialogBox.entityName, bindDialogBox.attachName, bindDialogBox.entityId, allPortal.value.queryCondition(), prop.baseDomain)
          .then(allPortal.value.queryData)
      },
      onCancel() {

      }
    })
  }
}
const queryBindListFunc = async (url: string, query: QueryType) => {
  return queryBindList(bindDialogBox.entityName, bindDialogBox.attachName, bindDialogBox.entityId, query, prop.baseDomain)
}
const queryUnbindListFunc = async (url: string, query: QueryType) => {
  return queryUnbindList(bindDialogBox.entityName, bindDialogBox.attachName, bindDialogBox.entityId, query, prop.baseDomain)
}
const handleTabChanged = (activeKey: string) => {
  bindDialogBox.tab = activeKey
  if (activeKey === '0') {
    bindPortal.value?.queryData()
  } else if (activeKey === '1') {
    unbindPortal.value?.queryData()
  } else if (activeKey === '2') {
    allPortal.value?.queryData()
  }
}
defineExpose({showBindDialogBox})
</script>

<style scoped>

</style>
