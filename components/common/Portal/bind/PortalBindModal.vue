<template>
  <dialog-box
    v-model:visible="bindDialogBox.show"
    :title="title + actionText"
    is-full
  >
    <a-tabs
      v-model:active-key="bindDialogBox.tab"
      destroy-inactive-tab-pane
      type="card"
      @change="handleTabChanged"
    >
      <a-tab-pane
        key="0"
        :tab="'已' + actionText + title"
      >
        <div style="height: calc(100vh - 200px);">
          <Portal
            ref="bindPortal"
            :query="queryBindListFunc"
            :row-drag-end="handleRowDragEnd"
            :table-id="attachEntity"
            read-only
          >
            <!-- :advance-condition="entityDialogBox.column.entityCondition"-->
            <template #action="{ portalConfig, column, record }">
              <a-button
                type="text"
                @click="unbind(portalConfig, column, record)"
              >
                取消
              </a-button>
              <slot
                :column="column"
                :portal-config="portalConfig"
                :record="record"
                name="action"
              ></slot>
            </template>
            <template #right-btns>
              <slot name="bind-right-btns"></slot>
            </template>
          </Portal>
        </div>
      </a-tab-pane>
      <a-tab-pane
        key="1"
        :tab="'未' + actionText + title"
      >
        <div style="height: calc(100vh - 200px);">
          <Portal
            ref="unbindPortal"
            :advance-condition="attachCondition"
            :query="queryUnbindListFunc"
            :table-id="attachEntity"
            read-only
          >
            <!-- :advance-condition="entityDialogBox.column.entityCondition"-->
            <template #action="{ portalConfig, column, record }">
              <a-button
                type="text"
                @click="bind(portalConfig, column, record)"
              >
                {{ actionText }}
              </a-button>
            </template>
          </Portal>
        </div>
      </a-tab-pane>
      <a-tab-pane
        key="2"
        :tab="'全部' + title"
      >
        <div style="height: calc(100vh - 200px);">
          <Portal
            ref="allPortal"
            :action-width="0"
            :advance-condition="attachCondition"
            :query="queryAttachListFunc"
            :table-id="attachEntity"
            read-only
          />
        </div>
      </a-tab-pane>
      <template #rightExtra>
        <template v-if="bindDialogBox.tab === '0'">
          <a-button
            :disabled="isEmpty(bindPortal?.getRowSelection())"
            style="margin-right: 5px;"
            type="primary"
            @click="unbindSelected"
          >
            清除选中
          </a-button>
          <a-button
            type="primary"
            @click="unbindAll"
          >
            清除全部
          </a-button>
        </template>
        <template v-if="bindDialogBox.tab === '1'">
          <a-button
            :disabled="isEmpty(unbindPortal?.getRowSelection())"
            style="margin-right: 5px;"
            type="primary"
            @click="bindSelected"
          >
            {{ actionText + '选中' }}
          </a-button>
          <a-button
            type="primary"
            @click="bindAll"
          >
            {{ actionText + '全部' }}
          </a-button>
        </template>
        <template v-if="bindDialogBox.tab === '2'">
          <a-button
            type="primary"
            @click="bindReplace"
          >
            {{ '选中替换' + actionText }}
          </a-button>
        </template>
      </template>
    </a-tabs>
  </dialog-box>
</template>

<script lang="ts" setup>
import { ExclamationCircleOutlined } from '@ant-design/icons-vue'
import { Modal } from 'ant-design-vue'
import { createVNode } from 'vue'

import {
  bindAllAttach,
  bindAttach,
  bindBatchAttach,
  bindReplaceAllAttach,
  bindReplaceBatchAttach,
  queryAttachList,
  queryBindList,
  queryUnbindList,
  unbindAllAttach,
  unbindAttach,
  unbindBatchAttach
} from '@/framework/apis/portal'
import { ConditionListType } from '@/framework/components/common/AdvancedSearch/ConditionList/type'
import { ColumnType, QueryType, TableConfigType } from '@/framework/components/common/Portal/type'
import { isEmpty, isNotEmpty } from '@/framework/utils/common'



const prop = withDefaults(defineProps<{
  baseDomain?: string
  entity: string
  attachEntity: string,
  title: string,
  actionText?: string
  rowDragEnd?: (data: Array<any>, currentPage: number, pageSize: number, entityRecord: any) => Promise<any>
  attachCondition?: ConditionListType
}>(), {
  actionText: '授权'
})
const { entity, attachEntity, title } = toRefs(prop)
const emit = defineEmits<{
  (e: 'close'): void
}>()
const bindPortal = ref()
const unbindPortal = ref()
const allPortal = ref()
const bindDialogBox: { show: boolean, entityName: string, entityId: any, tab: string, attachName: string, entityRecord: any } = reactive({
  show: false,
  entityName: entity.value,
  entityId: null,
  tab: '0',
  attachName: attachEntity.value,
  entityRecord: null
})
const showBindDialogBox = (entityId: any, record: any) => {
  bindDialogBox.tab = '0'
  bindDialogBox.entityId = entityId
  bindDialogBox.show = true
  bindDialogBox.entityRecord = record
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
    title: '将所有' + title.value + '进行' + prop.actionText,
    icon: createVNode(ExclamationCircleOutlined),
    content: createVNode('div', { style: 'color:red;' }, '注意: 单次' + prop.actionText + '数量大于60000条可能会失败'),
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
    title: '将所有' + title.value + prop.actionText + '取消',
    icon: createVNode(ExclamationCircleOutlined),
    content: createVNode('div', { style: 'color:red;' }, '注意: 所有' + prop.actionText + '信息将被清除'),
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
      title: '将选中' + title.value + '进行' + prop.actionText + '的',
      icon: createVNode(ExclamationCircleOutlined),
      content: createVNode('div', { style: 'color:red;' }, '注意: 原有' + prop.actionText + '信息将被清除'),
      onOk() {
        bindReplaceBatchAttach(bindDialogBox.entityName, bindDialogBox.attachName, bindDialogBox.entityId, allPortal.value.getRowSelection(), prop.baseDomain)
          .then(allPortal.value.queryData)
      },
      onCancel() {

      }
    })
  } else {
    Modal.confirm({
      title: '将' + prop.actionText + '全部符合当前条件的' + title.value,
      icon: createVNode(ExclamationCircleOutlined),
      content: createVNode('div', { style: 'color:red;' }, '注意: 原有' + prop.actionText + '信息将被清除,单次' + prop.actionText + '数量大于60000条可能会失败'),
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
const queryAttachListFunc = async (url: string, query: QueryType) => {
  return queryAttachList(bindDialogBox.entityName, bindDialogBox.attachName, bindDialogBox.entityId, query, prop.baseDomain)
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
const handleRowDragEnd = (dataSource: any, currentPage: number, pageSize: number) => {
  nextTick(() => {
    prop.rowDragEnd && prop.rowDragEnd(dataSource, currentPage, pageSize, bindDialogBox.entityRecord)
      .then(() => bindPortal.value.queryData())
  })
}
const queryBindData = () => {
  bindPortal.value.queryData()
}

watch(
  () => bindDialogBox.show,
  () => {
    if (!bindDialogBox.show) {
      emit('close')
    }
  })
defineExpose({ showBindDialogBox, queryBindData })
</script>

<style scoped>

</style>
