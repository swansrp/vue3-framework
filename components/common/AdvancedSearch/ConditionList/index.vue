<template>
  <div style="margin-top: 10px;padding-left: 10px;padding-top: 6px;">
    <a-timeline>
      <a-timeline-item v-if="propertySelectOptions.length">
        <AndOrSelect v-model:value="condition.andOr" />
      </a-timeline-item>
      <template v-if="condition.conditionList.length">
        <a-timeline-item v-for="(item, idx) in condition.conditionList" :key="item.id">
          <div v-if="item.isShow" class="condition-item">
            <a-tooltip placement="bottom" title="删除当前条件">
              <minus-circle-outlined style="color: red" @click="onClickDeleteCondition(item.id)" />
            </a-tooltip>
            <Condition
              v-model:property="item.property"
              v-model:relation="item.relation"
              v-model:value="item.value"
              :property-select-options="propertySelectOptions"
              style="margin-left: 5px" />
          </div>
          <template v-if="item.conditionList && item.conditionList.length">
            <ConditionList
              :condition="condition.conditionList[idx]"
              :index="idx"
              @delete-current-condition-list="deleteCurrentConditionList" />
          </template>
        </a-timeline-item>
      </template>
    </a-timeline>
    <template v-if="!propertySelectOptions.length">
      <a-tooltip placement="right" title="当前配置关系没有任何属性，不可添加查询条件">
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
          <a-menu-item key="1" class="menu-item">
            <PlusSquareOutlined />
            添加条件
          </a-menu-item>
          <a-menu-item key="2" class="menu-item">
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
import {Ref} from 'vue'
import {MenuProps} from 'ant-design-vue'
import {ValueLabel} from '@/framework/utils/type'
import {genEmptyCondition} from './funs'
import {ConditionType} from '../type'
import pinia from '@/framework/store'
import Condition from '../Condition/index.vue'
import AndOrSelect from '../AndOrSelect/index.vue'
import ConditionList from '../ConditionList/index.vue'
import {useAdvancedSearch} from '@/framework/store/AdvancedSearch'
import {
  ApartmentOutlined,
  DownOutlined,
  MinusCircleOutlined,
  PlusCircleOutlined,
  PlusSquareOutlined
} from '@ant-design/icons-vue'
import {ConditionListType} from '@/framework/components/common/AdvancedSearch/ConditionList/type'


const condition: Ref = ref()
const propertySelectOptions: Ref<Array<ValueLabel>> = ref([])
const props = defineProps<{ condition: ConditionType | ConditionListType, index: number }>()
const {index} = toRefs(props)

const useAdvancedSearchStore = useAdvancedSearch(pinia)
const emit = defineEmits(['update:condition', 'deleteCurrentConditionList'])

const onClickDeleteCondition = (id: number) => {
  console.log('onClickDeleteCondition', condition.value.conditionList, id)
  condition.value.conditionList = condition.value.conditionList.filter((condition: any) => id !== condition.id)
  if (condition.value.conditionList.length === 0)
    emit('deleteCurrentConditionList', index.value)
  emit('update:condition', condition.value)
}

const deleteCurrentConditionList = (idx: number) => {
  console.log('deleteCurrentConditionList', condition.value.conditionList, idx)
  condition.value.conditionList = condition.value.conditionList.filter((_: any, i: number) => i !== idx)
  if (condition.value.conditionList.length === 0)
    emit('deleteCurrentConditionList', index.value)
}


const handleAddMenuClick: MenuProps['onClick'] = ({key}) => {
  if (+key === 1) {
    condition.value.conditionList.push(genEmptyCondition())
  } else if (+key === 2) {
    const emptyCondition = genEmptyCondition()
    emptyCondition.isShow = false
    emptyCondition.conditionList = [genEmptyCondition()]
    condition.value.conditionList.push(emptyCondition)
  }
}

onBeforeMount(() => propertySelectOptions.value = useAdvancedSearchStore.getConditionLabelValueTypeOption())

watch(() => props.condition, () => condition.value = props.condition, {immediate: true})

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
