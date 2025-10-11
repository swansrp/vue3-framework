<template>
  <div class="entity-wrapper">
    <ConditionList
      v-model:condition="_condition"
      :advanced="advanced"
      :index="-1"
    />
  </div>
</template>

<script setup lang="ts">
import { Ref } from 'vue'

import ConditionList from '../ConditionList/index.vue'
import { ConditionType } from '../type'

const props = defineProps<{condition: ConditionType, advanced?: boolean}>()
const _condition:Ref<ConditionType|undefined> = ref()

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
