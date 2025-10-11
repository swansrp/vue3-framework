<template>
  <div style="margin-top: 10px;padding-left: 10px;padding-top: 6px;">
    <a-timeline>
      <a-timeline-item v-if="propertySelectOptions.length">
        <AndOrSelect v-model:value="_condition.andOr" />
      </a-timeline-item>
      <template v-if="_condition.conditionList.length">
        <a-timeline-item
          v-for="(item, idx) in _condition.conditionList"
          :key="item.id"
        >
          <div
            v-if="item.isShow || item.isShow === undefined"
            class="condition-item"
          >
            <a-tooltip
              placement="bottom"
              title="删除当前条件"
            >
              <minus-circle-outlined
                style="color: red"
                @click="onClickDeleteCondition(item.id as number)"
              />
            </a-tooltip>
            <Condition
              v-model:property="item.property"
              v-model:relation="item.relation"
              v-model:value="item.value"
              :property-select-options="propertySelectOptions"
              style="margin-left: 5px"
            />
          </div>
          <template v-if="item.conditionList && item.conditionList.length">
            <ConditionList
              :advanced="advanced"
              :condition="_condition.conditionList[idx]"
              :index="idx"
              @delete-current-condition-list="deleteCurrentConditionList"
            />
          </template>
        </a-timeline-item>
      </template>
    </a-timeline>
    <template v-if="!propertySelectOptions.length">
      <a-tooltip
        placement="right"
        title="当前配置关系没有任何属性，不可添加查询条件"
      >
        <a-button disabled>
          <PlusCircleOutlined />
          添加
          <DownOutlined />
        </a-button>
      </a-tooltip>
    </template>
    <a-dropdown v-else>
      <template #overlay>
        <a-menu @click="handleAddMenuClick">
          <a-menu-item
            key="1"
            class="menu-item"
          >
            <PlusSquareOutlined />
            添加条件
          </a-menu-item>
          <a-menu-item
            v-if="advanced"
            key="2"
            class="menu-item"
          >
            <ApartmentOutlined />
            添加条件组
          </a-menu-item>
        </a-menu>
      </template>
      <a-button>
        <PlusCircleOutlined />
        添加
        <DownOutlined />
      </a-button>
    </a-dropdown>
  </div>
</template>

<script lang="ts" setup>
import {
  ApartmentOutlined,
  DownOutlined,
  MinusCircleOutlined,
  PlusCircleOutlined,
  PlusSquareOutlined
} from '@ant-design/icons-vue'
import { MenuProps } from 'ant-design-vue'
import { Ref } from 'vue'


import { genEmptyCondition } from './funs'
import AndOrSelect from '../AndOrSelect/index.vue'
import Condition from '../Condition/index.vue'
import ConditionList from '../ConditionList/index.vue'
import { ConditionType } from '../type'

import { ConditionListType } from '@/framework/components/common/AdvancedSearch/ConditionList/type'
import pinia from '@/framework/store'
import { useAdvancedSearch } from '@/framework/store/AdvancedSearch'
import { ValueLabel } from '@/framework/utils/type'


const _condition: Ref = ref()
const propertySelectOptions: Ref<Array<ValueLabel>> = ref([])
const props = defineProps<{ condition: ConditionType | ConditionListType, index: number, advanced: boolean }>()
const { index } = toRefs(props)

const useAdvancedSearchStore = useAdvancedSearch(pinia)
const emit = defineEmits(['update:condition', 'deleteCurrentConditionList'])

const onClickDeleteCondition = (id: number) => {
  _condition.value.conditionList = _condition.value.conditionList.filter((condition: any) => id !== condition.id)
  if (_condition.value.conditionList.length === 0)
    emit('deleteCurrentConditionList', index.value)
  emit('update:condition', _condition.value)
}

const deleteCurrentConditionList = (idx: number) => {
  _condition.value.conditionList = _condition.value.conditionList.filter((_: any, i: number) => i !== idx)
  if (_condition.value.conditionList.length === 0)
    emit('deleteCurrentConditionList', index.value)
}


const handleAddMenuClick: MenuProps['onClick'] = ({ key }) => {
  if (+key === 1) {
    _condition.value.conditionList.push(genEmptyCondition())
  } else if (+key === 2) {
    const emptyCondition = genEmptyCondition()
    emptyCondition.isShow = false
    emptyCondition.conditionList = [genEmptyCondition()]
    _condition.value.conditionList.push(emptyCondition)
  }
}

onBeforeMount(() => propertySelectOptions.value = useAdvancedSearchStore.getConditionLabelValueTypeOption())

watch(() => props.condition, () => _condition.value = props.condition, { immediate: true })

</script>

<style scoped>
.menu-item {
  height: 32px;
}

:deep(.ant-timeline-item) {
  padding-bottom: 5px;
}

:deep(.ant-timeline-item-content .condition-item) {
  display: flex;
  justify-content: start;
  align-items: center;
}

:deep(.ant-timeline-item-head) {
  top: 5px;
}

:deep(.ant-timeline-item-tail) {
  height: 100%;
}
</style>
