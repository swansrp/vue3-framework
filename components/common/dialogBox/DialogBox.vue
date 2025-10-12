<template>
  <a-modal
    v-model:open="_visible"
    :body-style="{overflow: 'auto'}"
    :mask-closable="_maskClosable"
    :width="_width"
    :wrap-class-name="_isFull ? 'full-modal' : 'box-modal'"
    :z-index="_isFull ? 999 : 1000"
    destroy-on-close
    @cancel="$emit('update:visible', false)"
  >
    <slot></slot>
    <template #title>
      <slot name="title">
        <div
          v-if="_title"
          ref="modalTitleRef"
          class="dialog-title"
          :style="{ cursor: draggable ? 'move' : 'auto'}"
        >
          <img
            v-if="_iconPath"
            :src="_iconPath"
            alt=""
            class="icon-img"
          />
          {{ _title }}
        </div>
      </slot>
    </template>
    <template #footer>
      <slot name="footer">
        <slot
          v-if="props.footer"
          name="footer"
        ></slot>
        <div v-else></div>
      </slot>
    </template>
    <template
      v-if="!_isFull && draggable"
      #modalRender="{ originVNode }"
    >
      <div :style="transformStyle">
        <component :is="originVNode" />
      </div>
    </template>
  </a-modal>
</template>
<script lang="ts" setup>
import { useDraggable } from '@vueuse/core'
import { computed, CSSProperties, ref, watch, watchEffect } from 'vue'

import { useRouteStore } from '@/framework/store/route'

const routerStore = useRouteStore()
let _visible = ref(false)
let _title = ref('具体内容')
let _isFull = ref(false)
let _iconPath = ref('')
let _width = ref<string | number | undefined>('100%')
let _maskClosable = ref(false)

const props = withDefaults(
  defineProps<{
    title?: string,
    visible: boolean,
    draggable?: boolean,
    isFull?: boolean,
    iconPath?: string,
    width?: number | string
    maskClosable?: boolean,
    footer?: boolean,
  }>(),
  {
    title: '',
    draggable: false,
    isFull: false,
    iconPath: '',
    width: '100%',
    maskClosable: false,
    footer: false
  }
)
const emit = defineEmits<{
  (e: 'update:visible', value: any): void
  (e: 'open'): void
  (e: 'close'): void
}>()
const { visible } = toRefs(props)
watch(() => props.isFull, value => _isFull.value = value, { immediate: true })
watch(() => visible.value, value => {
    _visible.value = value
    if (value) {
      emit('open')
    } else {
      emit('close')
    }
  },
  {
    immediate: true
  }
)
watch(() => props.title, value => _title.value = value || '', { immediate: true })
watch(() => props.iconPath, value => _iconPath.value = value || '', { immediate: true })
watch(() => props.maskClosable, value => _maskClosable.value = !!value, { immediate: true })
watch(() => props.width, value => {
  if (!_isFull.value && _width.value) _width.value = value
}, { immediate: true })
watch(
  () => _visible.value,
  () => {
    routerStore.blockReturn(_visible.value, () => {
      _visible.value = false
      emit('update:visible', false)
    }),
      { immediate: true }
  }
)
/** 拖拽 */
const transformStyle = computed<CSSProperties>(() => {
  return {
    transform: `translate(${ transformX.value }px, ${ transformY.value }px)`
  }
})
const modalTitleRef = ref<HTMLElement>()
const { x, y, isDragging } = useDraggable(modalTitleRef)
const startX = ref<number>(0)
const startY = ref<number>(0)
const startedDrag = ref(false)
const transformX = ref(0)
const transformY = ref(0)
const preTransformX = ref(0)
const preTransformY = ref(0)
const dragRect = ref({ left: 0, right: 0, top: 0, bottom: 0 })
watch([x, y], () => {
  if (!startedDrag.value && modalTitleRef.value) {
    startX.value = x.value
    startY.value = y.value
    const bodyRect = document.body.getBoundingClientRect()
    const titleRect = modalTitleRef.value.getBoundingClientRect()
    dragRect.value.right = bodyRect.width - titleRect.width
    dragRect.value.bottom = bodyRect.height - titleRect.height
    preTransformX.value = transformX.value
    preTransformY.value = transformY.value
  }
  startedDrag.value = true
})
watch(isDragging, () => {
  if (!isDragging) {
    startedDrag.value = false
  }
})
watchEffect(() => {
  if (startedDrag.value) {
    transformX.value =
      preTransformX.value +
      Math.min(Math.max(dragRect.value.left, x.value), dragRect.value.right) -
      startX.value
    transformY.value =
      preTransformY.value +
      Math.min(Math.max(dragRect.value.top, y.value), dragRect.value.bottom) -
      startY.value
  }
})
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
  margin: -30px auto 0;
}

.dialog-title {
  display: flex;
  align-items: center;
}

.icon-img {
  width: 25px;
  height: 25px;
  margin-right: 5px;
}

</style>

