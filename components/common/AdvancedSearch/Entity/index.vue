<template>
  <div class="entity-wrapper">
    <ConditionList
      v-model:condition="_condition"
      :advanced="advanced ?? false"
      :index="-1"
    />
  </div>
</template>

<script setup lang="ts">
import { Ref } from 'vue'

import ConditionList from '../ConditionList/index.vue'
import { ConditionType } from '../type'

import { ConditionListType } from '@/framework/components/common/AdvancedSearch/ConditionList/type'

const props = defineProps<{condition: ConditionType, advanced?: boolean}>()
// ConditionList 的 condition 是必填(不接受 undefined) ⇒ 初值取传入条件, 不再声明 undefined
const _condition: Ref<ConditionType | ConditionListType> = ref(props.condition)

watch(() => props.condition, () => _condition.value = props.condition, { immediate: true })

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
