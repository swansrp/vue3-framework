<template>
  <a-modal
    :open="config.modal.show"
    :title="config.modal.data[config.nameKey]"
    width="100%"
    wrap-class-name="full-modal"
    @cancel="() => emit('cancel')"
    @close="() => emit('close')"
    @ok="() => emit('confirm')">
    <portal-bind-tab
      :bind-tabs="bindTabs"
      :entity-id="config.modal.data[config.rowKey]"
      :entity-name="config.tableId" />
  </a-modal>
</template>

<script lang="ts" setup>
import { TableConfigType } from '@/framework/components/common/Portal/type'
import { PortalBindType } from '@/framework/components/common/Portal/bind/type'

const props = withDefaults(
  defineProps<{
    config: TableConfigType,
    bindTabs: Array<PortalBindType>,
  }>(),
  {}
)
const {config} = toRefs(props)
const emit = defineEmits<{
  /**
   * cancel: 取消弹框
   */
  (e: 'cancel'): void
  /**
   * close: 关闭弹框
   */
  (e: 'close'): void
  /**
   * confirm: 确定弹框
   */
  (e: 'confirm'): void
  (e: 'update:config', config: TableConfigType): void
}>()
watch(config, (config) => {
  emit('update:config', config)
}, {deep: true})
onMounted(() => {
})
</script>

<style lang="less" scoped>
.full-modal {
  .ant-modal {
    max-width: 100%;
    top: 0;
    padding-bottom: 0;
    margin: 0;
  }

  .ant-modal-content {
    display: flex;
    flex-direction: column;
    height: calc(100vh);
  }

  .ant-modal-body {
    flex: 1;
  }
}
</style>