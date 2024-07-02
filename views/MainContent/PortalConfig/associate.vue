<template>
  <portal
    :default-sort-column="[{property:'displayOrder', type:1}]"
    table-id="SysPortalAssociate" />
</template>

<script lang="ts" setup>
const props = withDefaults(
  defineProps<{
    modelValue: any
  }>(),
  {
    modelValue: ''
  }
)
const emit = defineEmits<{
  (e: 'update:modelValue', value: any): void
}>()
onMounted(() => {
})
</script>

<style lang="less" scoped></style>