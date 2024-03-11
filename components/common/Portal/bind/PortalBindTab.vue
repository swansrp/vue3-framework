<template>
  <a-tabs
    v-model:active-key="activeKey"
    @change="handleTabChanged">
    <a-tab-pane
      v-for="(item, key) in prop.bindTabs"
      :key="key"
      :tab="item.title">
      <div style="height: calc(100vh - 200px);">
        <Portal
          :ref="(arg) => bindPortalRefMap.set(key, arg)"
          v-model:selectedTreeData="checkedKeys"
          :default-sort-column="bindTabs[activeKey].defaultSortColumn"
          :advance-condition="bindCondition"
          :bind-default-value="bindDefaultValue"
          :read-only="isReadOnly(item)"
          :table-id="item.tableId"
          :tree-check-able="isNotEmpty(prop.entityId) && item.showBind"
          :tree-mode="item.treeMode" />
      </div>
    </a-tab-pane>
    <template v-if="prop.bindTabs[activeKey]?.showBind" #rightExtra>
      <a-button style="margin-right: 5px;" type="primary" @click="bindAll">绑定全部</a-button>
      <a-button type="primary" @click="unbindAll">清除全部</a-button>
    </template>
  </a-tabs>
</template>

<script lang="ts" setup>
import {createVNode, Ref} from 'vue'
import {Modal} from 'ant-design-vue'
import {ExclamationCircleOutlined} from '@ant-design/icons-vue'
import {bindAllAttach, bindReplaceBatchAttach, getAllBindList, unbindAllAttach} from '@/framework/apis/portal'
import {PortalBindType} from '@/framework/components/common/portal/bind/type'
import {isNotEmpty} from '@/framework/utils/common'
import * as _ from 'lodash'
import {ConditionListType} from '@/framework/components/common/AdvancedSearch/ConditionList/type'
import {FILTER_TYPE} from '@/framework/components/common/portal/type'

const bindPortalRefMap = new Map<number, any>()
const prop = defineProps<{
  entityName: string,
  entityId?: any
  bindTabs?: Array<PortalBindType>
}>()
const bindTabs: Ref<Array<PortalBindType>> = ref(prop.bindTabs || [])
const isSelectedEntity = computed(() => {
  return isNotEmpty(prop.entityId)
})
const isReadOnly = (item: any) => {
  return ((item.showBind === true || item.treeMode !== false) && !isSelectedEntity.value)
}
const checkedKeys: Ref<Array<any>> = ref([])
const checkedKeysMap = new Map<string, any>()
watch(checkedKeys, (newValue: Array<any>) => {
  let oldValue = checkedKeysMap.get(activeKey.value + prop.entityId)
  console.log(oldValue !== undefined || !_.isEqual(newValue, oldValue), checkedKeysMap, newValue, activeKey.value)
  if (oldValue === undefined) {
    checkedKeysMap.set(activeKey.value + prop.entityId, newValue)
  } else if (!_.isEqual(newValue, oldValue)) {
    checkedKeysMap.set(activeKey.value + prop.entityId, newValue)
    bindReplaceBatchAttach(prop.entityName, bindTabs.value[activeKey.value].tableId, prop.entityId, newValue)
        .then(getBindList)
  }
})
const activeKey = ref(0)
const bindCondition = ref({} as ConditionListType)
const bindDefaultValue = computed(() => {
  if (bindCondition.value.value) {
    return {[`${bindCondition.value.property}`]: bindCondition.value.value[0]}
  } else {
    return {}
  }

})
const refresh = (arg?: any) => {
  if (prop.bindTabs && isNotEmpty(prop.entityId)) {
    if (prop.bindTabs[activeKey.value].showBind) {
      getBindList()
    } else {
      const condition = {
        property: prop.bindTabs[activeKey.value].bindFieldProperty,
        relation: FILTER_TYPE.EQUAL,
        value: [prop.entityId]
      } as ConditionListType
      bindCondition.value = condition
      nextTick(() => {
        if (prop.bindTabs && prop.bindTabs[activeKey.value].treeMode) {
          bindPortalRefMap.get(arg || activeKey.value).queryTreeData()
        } else {
          bindPortalRefMap.get(arg || activeKey.value).queryData()
        }

      })
    }
  }
}
const handleTabChanged = (arg: any) => {
  console.log(activeKey.value)
  refresh(arg)
}
const bindAll = () => {
  Modal.confirm({
    title: '将所有' + bindTabs.value[activeKey.value].title + '进行绑定',
    icon: createVNode(ExclamationCircleOutlined),
    onOk() {
      console.log(prop.entityName, bindTabs.value[activeKey.value].tableId, prop.entityId)
      bindAllAttach(prop.entityName, bindTabs.value[activeKey.value].tableId, prop.entityId)
          .then(getBindList)
    },
    onCancel() {

    }
  })

}
const unbindAll = () => {
  Modal.confirm({
    title: '将所有' + bindTabs.value[activeKey.value].title + '绑定清除',
    icon: createVNode(ExclamationCircleOutlined),
    content: createVNode('div', {style: 'color:red;'}, '注意: 所有授权信息将被清除'),
    onOk() {
      unbindAllAttach(prop.entityName, bindTabs.value[activeKey.value].tableId, prop.entityId)
          .then(getBindList)
    },
    onCancel() {

    }
  })
}

const getBindList = () => {
  getAllBindList(prop.entityName, bindTabs.value[activeKey.value].tableId, prop.entityId).then(res => {
    let rowKey = bindPortalRefMap.get(activeKey.value).getConfig().rowKey
    checkedKeys.value = res.payload?.map((value) => {
      return value[rowKey]
    }) || []
  })
}
watch(prop, () => {
  refresh()
})
</script>

<style scoped>

</style>
