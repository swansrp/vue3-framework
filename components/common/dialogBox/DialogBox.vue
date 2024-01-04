<template>
  <a-modal
    v-model:visible="visible"
    :body-style="{overflow: 'auto'}"
    :mask-closable="maskClosable"
    :width="width"
    :wrap-class-name="isFull ? 'full-modal' : 'box-modal'"
    destroyOnClose
    @cancel="$emit('update:visible', false)">
    <slot></slot>
    <template v-if="title" #title>
      <div class="title">
        <img v-if="iconPath" :src="iconPath" alt="" class="icon-img" />
        {{ title }}
      </div>
    </template>
    <template #footer>
      <slot v-if="props.footer" name="footer"></slot>
      <div v-else></div>
    </template>
  </a-modal>
</template>
<script lang="ts" setup>

let visible = ref(false)
let title = ref('具体内容')
let isFull = ref(false)
let iconPath = ref('')
let width = ref<string | number | undefined>('100%')
let maskClosable = ref(false)

const props = defineProps<{
  title: string,
  visible: boolean,
  isFull?: boolean,
  iconPath?: string,
  width?: number | undefined
  maskClosable?: boolean,
  footer?: boolean,
}>()

defineEmits(['update:visible'])

watch(() => props.isFull, value => isFull.value = value, {immediate: true})
watch(() => props.visible, value => visible.value = value)
watch(() => props.title, value => title.value = value || '', {immediate: true})
watch(() => props.iconPath, value => iconPath.value = value || '', {immediate: true})
watch(() => props.maskClosable, value => maskClosable.value = !!value, {immediate: true})
watch(() => props.width, value => {
  if (!isFull.value && width.value) width.value = value
}, {immediate: true})

</script>
<style lang="scss">
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

.box-modal {
  margin: 0 auto;
  margin-top: -30px;
}

.title {
  display: flex;
  align-items: center;
}

.icon-img {
  width: 25px;
  height: 25px;
  margin-right: 5px;
}

</style>

