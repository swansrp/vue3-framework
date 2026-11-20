<template>
  <a-layout
    :class="{ 'layout-collapsed': collapsed }"
    :style="{width: '100%', overflow:'auto', height: props.height}"
  >
    <a-layout-sider
      id="side"
      :width="_width"
      class="side-wrapper"
    >
      <div class="side-panel">
        <slot name="side"></slot>
      </div>
    </a-layout-sider>
    <div
      id="resize"
      class="resize-container"
    >
      <!-- 拖拽控制条 -->
      <div class="drag-handle"></div>

      <!-- 折叠/展开按钮 -->
      <div
        class="collapse-button-wrapper"
        :class="{ 'is-collapsed': collapsed }"
      >
        <a-tooltip
          :title="collapsed ? '展开侧栏' : '收起侧栏'"
          placement="right"
        >
          <a-button
            class="collapse-button"
            type="text"
            size="small"
            :aria-label="collapsed ? '展开侧栏' : '收起侧栏'"
            @click="toggleCollapsed"
          >
            <RightOutlined v-if="collapsed" />
            <LeftOutlined v-else />
          </a-button>
        </a-tooltip>
      </div>
    </div>
    <a-layout-content class="content-panel">
      <slot name="content"></slot>
    </a-layout-content>
  </a-layout>
</template>

<script lang="ts" setup>
import { LeftOutlined, RightOutlined } from '@ant-design/icons-vue'
import { Ref } from 'vue'

import bus, { PORTAL_RESIZE } from '@/framework/mitt'

const props = withDefaults(
  defineProps<{
    width?: number | string
    height?: number | string
  }>(),
  {
    width: 200,
    height: 'calc(100vh - 130px)'
  }
)
const emit = defineEmits<{
  (e: 'resize'): void
}>()
const _width: Ref<string | number> = ref(props.width)
const widthValue: Ref<number> = ref(200)
const dragControllerDiv = () => {
  const resizeContainer = document.getElementById('resize')
  const dragHandle = resizeContainer?.querySelector('.drag-handle') as HTMLElement
  
  if (resizeContainer && dragHandle) {
    widthValue.value = document.getElementById('side')?.offsetWidth || 0
    let startX = 0
    let isDragging = false
    let animationFrameId: number | null = null
    
    const handleMouseDown = (e: MouseEvent) => {
      // 只响应左键点击
      if (e.button !== 0) return
      
      isDragging = true
      startX = e.clientX
      
      // 添加拖拽状态样式
      dragHandle.classList.add('dragging')
      document.body.style.cursor = 'w-resize'
      document.body.style.userSelect = 'none'
      
      // 使用 requestAnimationFrame 优化性能
      const handleMouseMove = (e: MouseEvent) => {
        if (!isDragging) return
        
        // 取消之前的动画帧
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId)
        }
        
        // 使用 requestAnimationFrame 确保流畅的动画
        animationFrameId = requestAnimationFrame(() => {
          const endX = e.clientX
          const moveLen = endX - startX
          startX = endX
          
          const newWidth = Number(widthValue.value) + moveLen
          // 限制最小和最大宽度
          if (newWidth >= 150 && newWidth <= 800) {
            widthValue.value = newWidth
            _width.value = widthValue.value
            // 使用防抖来减少 notifyResize 的调用频率
            debouncedNotifyResize()
          }
        })
      }
      
      const handleMouseUp = () => {
        isDragging = false
        
        // 取消待处理的动画帧
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId)
          animationFrameId = null
        }
        
        // 移除拖拽状态样式
        dragHandle.classList.remove('dragging')
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
        
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
        
        // 拖拽结束时立即通知一次
        notifyResize()
      }
      
      document.addEventListener('mousemove', handleMouseMove, { passive: true })
      document.addEventListener('mouseup', handleMouseUp)
      
      // 阻止默认行为但不阻止事件冒泡
      e.preventDefault()
    }
    
    dragHandle.addEventListener('mousedown', handleMouseDown)
    
    // 添加右键菜单支持（避免被拖拽事件阻止）
    dragHandle.addEventListener('contextmenu', (e) => {
      e.stopPropagation()
    })
  }
}

// 防抖通知函数
const debouncedNotifyResize = (() => {
  let timeoutId: number | null = null
  return () => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    timeoutId = window.setTimeout(() => {
      notifyResize()
    }, 16) // 约60fps的更新频率
  }
})()
const toggleCollapsed = () => {
  if (collapsed.value) {
    _width.value = widthValue.value
  } else {
    _width.value = '0'
  }
  notifyResize()
  collapsed.value = !collapsed.value
}
const collapsed = ref(false)
const notifyResize = () => {
  emit('resize')
  bus.emit(PORTAL_RESIZE)
}
onMounted(() => {
  dragControllerDiv()
})
</script>

<style lang="less" scoped>
.side-wrapper {
  background-color: var(--bg-elevated);
  box-sizing: border-box;
  overflow: auto;
  overscroll-behavior: contain;
  height: calc(100% - 20px);
  margin: 10px 15px;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
}

.side-panel {
  box-sizing: border-box;
  height: 100%;
  padding: 10px;
  display: flex;
  flex-direction: column;
}

// 收起后侧栏宽度为 0：隐藏卡片边框/阴影，避免 0 宽元素在左缘留下一道竖线
.layout-collapsed .side-wrapper {
  border-width: 0;
  box-shadow: none;
  visibility: hidden;
}

.resize-container {
  position: relative;
  flex: none;
  width: 8px;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.drag-handle {
  position: absolute;
  inset: 0;
  cursor: w-resize;
  background: transparent;
  transition: background-color var(--transition-fast);

  @media (hover: hover) {
    &:hover {
      background: var(--accent-soft);
    }
  }

  &.dragging {
    background: var(--accent-mid);
    transition: none;
  }
}

.collapse-button-wrapper {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 10;
  display: flex;

  // 收起后侧栏宽度为 0，按钮整体右移，避免半个按钮被裁掉
  &.is-collapsed {
    left: calc(50% + 12px);
  }
}

.collapse-button-wrapper .collapse-button {
  width: 20px;
  height: 48px;
  min-width: 20px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-hover);
  background: var(--bg-elevated);
  box-shadow: var(--shadow-sm);
  color: var(--text-secondary);
  transition: color var(--transition-fast), border-color var(--transition-fast), background-color var(--transition-fast), box-shadow var(--transition-fast);

  :deep(.anticon) {
    font-size: 11px;
  }

  @media (hover: hover) {
    &:hover {
      color: var(--accent);
      border-color: var(--accent-mid);
      background: var(--bg-elevated);
      box-shadow: var(--shadow-glow);
    }
  }

  &:active {
    color: var(--accent);
    background: var(--accent-soft);
  }

  &:focus-visible {
    color: var(--accent);
    border-color: var(--accent);
  }
}

.content-panel {
  margin-left: 10px;
  margin-right: 10px;
  height: 100%;
  overflow: auto;
  overscroll-behavior: contain;
}
</style>