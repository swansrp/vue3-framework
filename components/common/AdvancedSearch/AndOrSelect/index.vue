<template>
  <a-select
    size="small"
    v-model:value="value"
    style="width: 60px; margin-left: -30px"
    @change="onChange">
    <a-select-option value="0">与</a-select-option>
    <a-select-option value="1">或</a-select-option>
  </a-select>
</template>

<script setup lang="ts">
let value = ref('0')
const props = defineProps<{value: string}>()
const emit = defineEmits(['update:value'])
const onChange = () => emit('update:value', value.value)

watch(() => props.value, () => value.value = props.value)
</script>
