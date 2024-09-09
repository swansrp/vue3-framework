<template>
  <a-modal
    v-model:open="_visible"
    :body-style="{overflow: 'auto'}"
    :mask-closable="_maskClosable"
    :width="_width"
    :wrap-class-name="_isFull ? 'full-modal' : 'box-modal'"
    destroyOnClose
    @cancel="$emit('update:visible', false)">
    <slot></slot>
    <template v-if="_title" #title>
      <div class="title">
        <img v-if="_iconPath" :src="_iconPath" alt="" class="icon-img" />
        {{ _title }}
      </div>
    </template>
    <template #footer>
      <slot v-if="props.footer" name="footer"></slot>
      <div v-else></div>
    </template>
  </a-modal>
</template>
<script lang="ts" setup>

let _visible = ref(false)
let _title = ref('具体内容')
let _isFull = ref(false)
let _iconPath = ref('')
let _width = ref<string | number | undefined>('100%')
let _maskClosable = ref(false)

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

watch(() => props.isFull, value => _isFull.value = value, {immediate: true})
watch(() => props.visible, value => _visible.value = value)
watch(() => props.title, value => _title.value = value || '', {immediate: true})
watch(() => props.iconPath, value => _iconPath.value = value || '', {immediate: true})
watch(() => props.maskClosable, value => _maskClosable.value = !!value, {immediate: true})
watch(() => props.width, value => {
  if (!_isFull.value && _width.value) _width.value = value
}, {immediate: true})

</script>
<style lang="scss" scoped>
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
  margin: -30px auto 0;
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

