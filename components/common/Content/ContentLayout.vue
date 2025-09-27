<template>
  <a-layout :style="{width: '100%', overflow:'auto', height: props.height}">
    <a-layout-sider
      id="side"
      :width="_width"
      class="side-wrapper"
    >
      <div style="margin: 10px">
        <slot name="side"></slot>
      </div>
    </a-layout-sider>
    <div id="resize" class="resize-container">
      <!-- 拖拽控制条 -->
      <div class="drag-handle">
        <div class="drag-indicator">
          <div class="drag-dot"></div>
          <div class="drag-dot"></div>
          <div class="drag-dot"></div>
        </div>
      </div>
      
      <!-- 折叠/展开按钮 -->
      <div class="collapse-button-wrapper">
        <a-button
          v-if="collapsed"
          class="collapse-button collapse-button-expand"
          type="text"
          size="small"
          @click="toggleCollapsed">
          <RightOutlined />
        </a-button>
        <a-button
          v-else
          class="collapse-button collapse-button-collapse"
          type="text"
          size="small"
          @click="toggleCollapsed">
          <LeftOutlined />
        </a-button>
      </div>
    </div>
    <a-layout-content
      style="margin-left: 10px; margin-right: 10px; height: 100%; overflow: auto">
      <slot name="content"></slot>
    </a-layout-content>
  </a-layout>

</template>

<script lang="ts" setup>
import {LeftOutlined, RightOutlined} from '@ant-design/icons-vue'
import bus, { PORTAL_RESIZE } from '@/framework/mitt'
import {Ref} from 'vue'

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
  background-color: white;
  box-sizing: border-box;
  overflow: auto;
  height: calc(100% - 20px);
  box-shadow: 0 4px 10px 0 rgba(69, 89, 120, 0.5);
  margin: 10px 15px;
}

.resize-container {
  position: relative;
  width: 8px;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.drag-handle {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  cursor: w-resize;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.15s ease;
  will-change: background-color, transform;
  
  &:hover {
    background: rgba(24, 144, 255, 0.1);
    
    .drag-indicator {
      opacity: 1;
      transform: scale(1.1);
    }
  }
  
  &.dragging {
    background: rgba(24, 144, 255, 0.2);
    transition: none;
    
    .drag-indicator {
      opacity: 1;
      transform: scale(1.2);
      transition: none;
    }
  }
}

.drag-indicator {
  display: flex;
  flex-direction: column;
  gap: 3px;
  opacity: 0.4;
  transition: all 0.15s ease;
  will-change: opacity, transform;
}

.drag-dot {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: #8c8c8c;
  transition: background-color 0.15s ease;
  will-change: background-color;
}

.drag-handle:hover .drag-dot,
.drag-handle.dragging .drag-dot {
  background: #1890ff;
}

.collapse-button-wrapper {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 10;
}

.collapse-button {
  width: 24px;
  height: 40px;
  border-radius: 0 8px 8px 0;
  background: #fff;
  border: 1px solid #d9d9d9;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
  color: #666;
  will-change: color, border-color, box-shadow, transform;
  
  &:hover {
    color: #1890ff;
    border-color: #1890ff;
    box-shadow: 2px 0 12px rgba(24, 144, 255, 0.2);
    transform: translateX(2px);
  }
  
  &:active {
    transform: translateX(1px);
    transition: transform 0.1s ease;
  }
}

.collapse-button-expand {
  border-radius: 8px 0 0 8px;
  left: -24px;
  
  &:hover {
    transform: translateX(-2px);
  }
  
  &:active {
    transform: translateX(-1px);
    transition: transform 0.1s ease;
  }
}

.collapse-button-collapse {
  left: 0;
}
</style>