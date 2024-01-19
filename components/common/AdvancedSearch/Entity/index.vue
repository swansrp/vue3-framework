<template>
  <div class="entity-wrapper">
    <ConditionList v-model:condition="queryData.condition" :index="-1" />
  </div>
</template>

<script setup lang="ts">
import {Ref} from "vue"
import {QueryDataType} from "../type"
import ConditionList from "../ConditionList/index.vue"


const props = defineProps<{queryData: QueryDataType}>()
const queryData:Ref<QueryDataType|undefined> = ref()

watch(() => props.queryData, () => queryData.value = props.queryData, {immediate: true})

</script>

<style scoped>
.entity-wrapper {
  border-radius: 8px;
  border: 1px solid #D9D9D9;
  background-color: #F8F8FA;
  margin: 10px;
  padding: 15px;
  box-sizing: border-box;
}
</style>
