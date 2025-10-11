<template>
  <a-tabs
    v-model:active-key="activeKey"
    @change="handleTabChanged"
  >
    <a-tab-pane
      v-for="(item, key) in bindTabs"
      :key="key"
      :tab="item.title"
    >
      <div style="height: calc(100vh - 200px);">
        <portal
          :ref="(arg) => bindPortalRefMap.set(key, arg)"
          v-model:selected-tree-data="checkedKeys"
          :action-width="0"
          :advance-condition="bindConditionMap.get(key)"
          :bind-default-value="bindDefaultValue"
          :bind-tabs="bindTabs[activeKey].bindTabs"
          :default-sort-column="bindTabs[activeKey].defaultSortColumn"
          :read-only="isReadOnly(item)"
          :table-id="item.tableId"
          :tree-check-able="isNotEmpty(record) && item.bindType === '2'"
          :tree-mode="item.treeMode"
        />
      </div>
    </a-tab-pane>
    <template
      v-if="bindTabs[activeKey]?.bindType === '2'"
      #rightExtra
    >
      <a-button
        style="margin-right: 5px;"
        type="primary"
        @click="bindAll"
      >
        绑定全部
      </a-button>
      <a-button
        type="primary"
        @click="unbindAll"
      >
        清除全部
      </a-button>
    </template>
  </a-tabs>
</template>

<script lang="ts" setup>
import { ExclamationCircleOutlined } from '@ant-design/icons-vue'
import { Modal } from 'ant-design-vue'
import * as _ from 'lodash'
import { createVNode, Ref } from 'vue'

import { bindAllAttach, bindReplaceBatchAttach, getAllBindList, unbindAllAttach } from '@/framework/apis/portal'
import { ConditionListType } from '@/framework/components/common/AdvancedSearch/ConditionList/type'
import { PortalBindType } from '@/framework/components/common/Portal/bind/type'
import { FILTER_TYPE } from '@/framework/components/common/Portal/type'
import { isNotEmpty } from '@/framework/utils/common'

const bindPortalRefMap = new Map<number, any>()
const prop = defineProps<{
  baseDomain: string
  entityName: string,
  record: { [key: string]: any } | null,
  rowKey: string,
  bindTabs: Array<PortalBindType>
}>()
const { record, rowKey, bindTabs } = toRefs(prop)
const isSelectedEntity = computed(() => {
  return isNotEmpty(record.value)
})
const isReadOnly = (item: any) => {
  return ((item.bindType === '2' || item.treeMode !== false) && !isSelectedEntity.value)
}
const checkedKeys: Ref<Array<any>> = ref([])
const checkedKeysMap = new Map<string, any>()
watch(checkedKeys, (newValue: Array<any>) => {
  let oldValue = checkedKeysMap.get(activeKey.value + record.value[rowKey.value])
  console.log(oldValue !== undefined || !_.isEqual(newValue, oldValue), checkedKeysMap, newValue, activeKey.value)
  if (oldValue === undefined) {
    checkedKeysMap.set(activeKey.value + record.value[rowKey.value], newValue)
  } else if (!_.isEqual(newValue, oldValue)) {
    checkedKeysMap.set(activeKey.value + record.value[rowKey.value], newValue)
    bindReplaceBatchAttach(prop.entityName, bindTabs.value[activeKey.value].tableId, record.value[rowKey.value], newValue, prop.baseDomain)
      .then(getBindList)
  }
})
const activeKey = ref(0)
const baseBindCondition:Ref<ConditionListType> = ref({} as ConditionListType)
const bindConditionMap: Ref = ref(new Map())
const bindDefaultValue = computed(() => {
  if (baseBindCondition.value && baseBindCondition.value.value) {
    return { [`${baseBindCondition.value.property}`]: baseBindCondition.value.value[0] }
  } else {
    return {}
  }
})
const refresh = () => {
  if (bindTabs.value && isNotEmpty(record.value)) {
    console.log('refresh', bindTabs.value, record.value, rowKey.value)
    if (bindTabs.value[activeKey.value].bindType === '2') {
      getBindList()
    } else {
      if (bindTabs.value[activeKey.value].bindType === '0') {
        baseBindCondition.value = {
          property: bindTabs.value[activeKey.value].bindFieldProperty,
          relation: FILTER_TYPE.EQUAL,
          value: [record.value[rowKey.value]]
        } as ConditionListType
      } else if (bindTabs.value[activeKey.value].bindType === '3') {
        baseBindCondition.value = {
          property: bindTabs.value[activeKey.value].bindFieldProperty,
          relation: FILTER_TYPE.CONTAIN,
          value: [record.value[rowKey.value]]
        } as ConditionListType
      } else if (bindTabs.value[activeKey.value].bindType === '1') {
        baseBindCondition.value = {
          property: bindTabs.value[activeKey.value].bindFieldProperty,
          relation: FILTER_TYPE.EQUAL,
          value: [record.value[bindTabs.value[activeKey.value].bindFieldProperty]]
        } as ConditionListType
      } else if (bindTabs.value[activeKey.value].bindType === '4') {
        baseBindCondition.value = {
          property: bindTabs.value[activeKey.value].bindFieldProperty,
          relation: FILTER_TYPE.CONTAIN,
          value: [record.value[bindTabs.value[activeKey.value].bindFieldProperty]]
        } as ConditionListType
      }
      bindConditionMap.value.set(activeKey.value, {
        andOr: '0',
        conditionList: [baseBindCondition.value, bindTabs.value[activeKey.value].defaultAdvancedCondition || {} as ConditionListType]
      })
      // nextTick(() => {
      //   if (bindTabs.value && bindTabs.value[activeKey.value].treeMode) {
      //     bindPortalRefMap.get(arg || activeKey.value).queryTreeData()
      //   } else {
      //     bindPortalRefMap.get(arg || activeKey.value).queryData()
      //   }
      // })
    }
  }
}
const handleTabChanged = () => {
  refresh()
}
const bindAll = () => {
  Modal.confirm({
    title: '将所有' + bindTabs.value[activeKey.value].title + '进行绑定',
    icon: createVNode(ExclamationCircleOutlined),
    onOk() {
      console.log(prop.entityName, bindTabs.value[activeKey.value].tableId, record.value[rowKey.value])
      bindAllAttach(prop.entityName, bindTabs.value[activeKey.value].tableId, record.value[rowKey.value], {}, prop.baseDomain)
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
    content: createVNode('div', { style: 'color:red;' }, '注意: 所有授权信息将被清除'),
    onOk() {
      unbindAllAttach(prop.entityName, bindTabs.value[activeKey.value].tableId, record.value[rowKey.value], prop.baseDomain)
        .then(getBindList)
    },
    onCancel() {

    }
  })
}

const getBindList = () => {
  getAllBindList(prop.entityName, bindTabs.value[activeKey.value].tableId, record.value[rowKey.value], prop.baseDomain).then(res => {
    let rowKey = bindPortalRefMap.get(activeKey.value).getConfig().rowKey
    checkedKeys.value = res.payload?.map((value: any) => {
      return value[rowKey]
    }) || []
  })
}
watch(
  () => record.value,
  () => {
    refresh()
  },
  {
    deep: true,
    immediate: true
  })
</script>

<style scoped>

</style>
