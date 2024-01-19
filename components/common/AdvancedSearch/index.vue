<template>
  <div id="advancedSearch" :style="{width}">
    <Entity class="search-item" v-model:query-data="queryData[0]" />
  </div>
  <a-button type="primary" style="margin-left: 15px" @click="queryGraphData">查询数据</a-button>
</template>

<script setup lang="ts">
import {Ref} from "vue"
import Entity from "./Entity/index.vue"
import 'ant-design-vue/lib/message/style/index.css'
import {useAdvancedSearch} from "@/framework/store/AdvancedSearch"
import {QueryDataType} from "./type"
import pinia from "@/framework/store";
import {getDictList} from "@/framework/apis/common/common";
import {ValueLabel} from "@/framework/utils/type";
import {genEmptyCondition} from "@/framework/components/common/AdvancedSearch/ConditionList/funs";


const useAdvancedSearchStore = useAdvancedSearch(pinia)
const queryData:Ref<Array<QueryDataType>> = ref([{ condition: { conditionList: [genEmptyCondition()], andOr: '0' }}])

const props = defineProps<{width?: number, columns: Array<any>}>()
const width = computed(() => props.width ? props.width + 'px' : '1000px')
const {columns} = toRefs(props)

const emit = defineEmits(['queryGraphData'])
const queryGraphData = () => emit('queryGraphData', {conditions: queryData.value, pageSize: 200})

onBeforeMount(() => {
  let filterColumns = columns.value.filter((item: any) => item.filterAble)
  filterColumns = filterColumns.map((item: any) => ({label: item.title, value: item.key, fieldType: item.fieldType, referenceDictOption: item.referenceDictOption})) as any
  useAdvancedSearchStore.setConditionLabelValueTypeOption(filterColumns)
  getDictList('PORTAL_CONDITION_DICT')
    .then(res => res.payload.forEach((item: ValueLabel) => useAdvancedSearchStore.setSelectConditionMap(item.value, item)))
})

</script>

<style scoped>
#advancedSearch {
  max-height: calc(100% - 150px);
  height: auto;
  overflow: auto;
}
</style>
