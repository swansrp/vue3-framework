<template>
  <div class="drawer-container">
    <!-- Drawer -->
    <div
      :class="[ placement, {open: visible}]"
      :style="{ width: drawerWidth + 'px' }"
      class="drawer-panel"
    >
      <!-- Header -->
      <div class="drawer-header">
        <span class="drawer-title">{{ title }}</span>
        <span v-if="closable" class="drawer-close" @click="emitClose">✖</span>
      </div>

      <!-- Body -->
      <div class="drawer-body">
        <slot name="drawerBody"></slot>
      </div>

      <!-- Footer -->
      <div v-if="$slots.footer" class="drawer-footer">
        <slot name="footer"></slot>
      </div>

      <!-- 拖动宽度控制条 -->
      <div
        :class="placement"
        class="resizer"
        @mousedown="startResize"
      ></div>
    </div>

    <!-- 主体内容 -->
    <div
      :class="{ shifted: visible }"
      :style="shiftStyle"
      class="drawer-main"
    >
      <slot></slot>
    </div>
  </div>
</template>

<script setup>
import {computed, onBeforeUnmount, onMounted, ref, watch} from 'vue'
import bus, {PORTAL_RESIZE} from '@/framework/mitt'

const props = defineProps({
  visible: Boolean,
  title: String,
  closable: {type: Boolean, default: true},
  width: {type: String, default: '300'}, // 单位 px
  placement: {type: String, default: 'left'}, // 'left' or 'right'
  escToClose: {type: Boolean, default: true}
})
const {visible, placement} = toRefs(props)
const emit = defineEmits(['update:visible'])

const defaultWidth = parseInt(props.width || '300')
const minWidth = 200
const maxWidth = 800

const drawerWidth = ref(defaultWidth)
const emitClose = () => emit('update:visible', false)
watch(
  () => props.visible,
  (val) => {
    if (val) {
      drawerWidth.value = defaultWidth
    }
  })

const shiftStyle = computed(() => {
  bus.emit(PORTAL_RESIZE)
  if (!props.visible) return {}
  return props.placement === 'left'
    ? { marginLeft: drawerWidth.value + 'px' }
    : { marginRight: drawerWidth.value + 'px' }
})

const startResize = (e) => {
  const startX = e.clientX
  const startWidth = drawerWidth.value

  const onMouseMove = (moveEvent) => {
    const delta = moveEvent.clientX - startX
    let newWidth = props.placement === 'left'
      ? startWidth + delta
      : startWidth - delta
    drawerWidth.value = Math.max(minWidth, Math.min(maxWidth, newWidth))
  }

  const onMouseUp = () => {
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup', onMouseUp)
  }

  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
}

const onKeydown = (e) => {
  if (e.key === 'Escape' && props.visible && props.escToClose) {
    emitClose()
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
})
</script>

<style scoped>
.drawer-container {
  display: flex;
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
}

/* Drawer */
.drawer-panel {
  position: absolute;
  top: 0;
  bottom: 0;
  background-color: #fff;
  transition: transform 0.3s ease;
  display: flex;
  flex-direction: column;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);
  z-index: 100;
}

.drawer-panel.left {
  left: 0;
  transform: translateX(-100%);
}

.drawer-panel.right {
  right: 0;
  transform: translateX(100%);
}

.drawer-panel.left.open {
  transform: translateX(0);
}

.drawer-panel.right.open {
  transform: translateX(0);
}

.drawer-header {
  padding: 16px;
  font-weight: bold;
  font-size: 16px;
  display: flex;
  justify-content: space-between;
  border-bottom: 1px solid #f0f0f0;
}

.drawer-title {
  flex: 1;
}

.drawer-close {
  cursor: pointer;
}

.drawer-body {
  flex: 1;
  overflow: auto;
  padding: 16px;
}

.drawer-footer {
  border-top: 1px solid #f0f0f0;
  padding: 12px 16px;
  background-color: #fafafa;
}

/* Main Content */
.drawer-main {
  flex: 1;
  transition: transform 0.3s ease;
  overflow: auto;
  height: 100%;
}

/* 拖动条样式 */
.resizer {
  width: 6px;
  cursor: ew-resize;
  position: absolute;
  top: 0;
  bottom: 0;
  z-index: 999;
}

.resizer.left {
  right: 0;
}

.resizer.right {
  left: 0;
}
</style>