<template>
  <dialog-box
    v-model:visible="_show"
    :title="config.title"
    is-full>
    <dashboard :tableId="config.tableId" />
  </dialog-box>
</template>

<script lang="ts" setup>
import Dashboard from '@/framework/components/common/Portal/dashboard/dashboard.vue'

const props = withDefaults(
    defineProps<{
      show: boolean
      config: any
    }>(),
    {}
)
const { config, show } = toRefs(props)
const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
}>()
const _show = ref(props.show)
watch(
    () => show.value,
    () => _show.value = show.value
)
watch(
    () => _show.value,
    () => emit('update:show', _show.value)
)
</script>


<style lang="less" scoped>
.hr-indicator-dashboard {
  height: 90vh;
}
</style>