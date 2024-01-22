<template>
  <div class="entity-wrapper">
    <ConditionList v-model:condition="condition" :index="-1" />
  </div>
</template>

<script setup lang="ts">
import {Ref} from "vue"
import {ConditionType} from '../type'
import ConditionList from "../ConditionList/index.vue"


const props = defineProps<{condition: ConditionType}>()
const condition:Ref<ConditionType|undefined> = ref()

watch(() => props.condition, () => condition.value = props.condition, {immediate: true})

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
