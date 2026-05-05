<template>
  <div class="dimension-section">
    <div
      class="section-header"
      @click="toggleCollapse"
    >
      <h4>维度选择</h4>
      <a-button
        class="collapse-btn"
        size="small"
        type="text"
      >
        <DownOutlined v-if="!collapsed" />
        <RightOutlined v-else />
      </a-button>
    </div>

    <div
      v-show="!collapsed"
      class="section-content"
    >
      <!-- 一级维度 -->
      <div class="dimension-item">
        <div class="dimension-header">
          <span>一级维度（横坐标）</span>
          <span class="required">*</span>
          <a-button
            v-if="firstDimension"
            class="clear-btn"
            size="small"
            type="text"
            @click="clearFirstDimension"
          >
            清空
          </a-button>
        </div>
        <div
          :class="{
            'has-content': firstDimension,
            'drag-over': dragOverFirst,
            'drag-forbidden': dragOverFirst && dragData && isDuplicateDimension(dragData.value?.key || '', 'first')
          }"
          class="drop-zone compact"
          @dragleave="onDragLeaveFirst"
          @drop="onDropFirstDimension"
          @dragover.prevent="onDragOverFirst"
        >
          <!-- 禁止拖入的视觉提示 -->
          <div
            v-if="dragOverFirst && dragData && isDuplicateDimension(dragData.value?.key || '', 'first')"
            class="drop-forbidden-overlay"
          >
            <div class="forbidden-icon">
              ✕
            </div>
            <div class="forbidden-text">
              禁止重复选择
            </div>
          </div>

          <!-- 正常状态显示 -->
          <template v-else>
            <div
              v-if="!firstDimension"
              class="drop-placeholder"
            >
              拖拽指标到此处
            </div>
            <div
              v-else
              class="dimension-content"
            >
              <div class="dimension-info-line">
                <span class="dimension-title">{{ firstDimension.title }}</span>
                <span class="info-text">{{ firstDimension.items?.length || 0 }}个指标项</span>
              </div>
            </div>
          </template>
        </div>
      </div>

      <!-- 二级维度 -->
      <div class="dimension-item">
        <div class="dimension-header">
          <span>二级维度（数据集）</span>
          <span
            v-if="!firstDimension"
            class="dimension-tip"
          >需先选择一级维度</span>
          <a-button
            v-if="secondDimension"
            class="clear-btn"
            size="small"
            type="text"
            @click="clearSecondDimension"
          >
            清空
          </a-button>
        </div>
        <div
          :class="{
            'has-content': secondDimension,
            'drag-over': dragOverSecond && firstDimension,
            'drag-forbidden': (dragOverSecond && dragData && isDuplicateDimension(dragData.value?.key || '', 'second')) || !firstDimension,
            'disabled': !firstDimension
          }"
          class="drop-zone compact"
          @dragleave="onDragLeaveSecond"
          @drop="onDropSecondDimension"
          @dragover.prevent="onDragOverSecond"
        >
          <!-- 禁止拖入的视觉提示 -->
          <div
            v-if="dragOverSecond && dragData && isDuplicateDimension(dragData.value?.key || '', 'second')"
            class="drop-forbidden-overlay"
          >
            <div class="forbidden-icon">
              ✕
            </div>
            <div class="forbidden-text">
              禁止重复选择
            </div>
          </div>

          <!-- 正常状态显示 -->
          <template v-else>
            <div
              v-if="!secondDimension"
              :class="{ 'warning-hint': !firstDimension }"
              class="drop-placeholder"
            >
              {{ firstDimension ? '拖拽指标到此处（可选）' : '请先选择一级维度' }}
            </div>
            <div
              v-else
              class="dimension-content"
            >
              <div class="dimension-info-line">
                <span class="dimension-title">{{ secondDimension?.title }}</span>
                <span class="info-text">{{ secondDimension.items?.length || 0 }}个指标项</span>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { DownOutlined, RightOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { inject, ref } from 'vue'

import { generateDistinctColors, getRandomColor } from '@/framework/utils/colorUtils'

// 接口定义
interface IndicatorItem {
  key: string
  title: string
  color?: string
  isLeaf?: boolean
  condition?: string
}

interface IndicatorGroup {
  key: string
  title: string
  children?: IndicatorGroup[]
  items?: IndicatorItem[]
  color?: string
  isLeaf?: boolean
}

interface DragData {
  key: string
  title: string
  isLeaf: boolean
  items?: IndicatorItem[]
}

// Props
const props = defineProps<{
  firstDimension: IndicatorGroup | null
  secondDimension: IndicatorGroup | null
  filterDimension: IndicatorGroup | null
}>()

// Emits
const emit = defineEmits<{
  'update:firstDimension': [dimension: IndicatorGroup | null]
  'update:secondDimension': [dimension: IndicatorGroup | null]
  'dimensionChanged': []
}>()

// 折叠状态
const collapsed = ref(false)

// 拖拽状态管理
const dragOverFirst = ref(false)
const dragOverSecond = ref(false)

// 防抖状态，避免鼠标在框内移动时频闪
let dragOverFirstChecked = false
let dragOverSecondChecked = false

// 注入全局拖拽数据
const dragData = inject<{ value: DragData | null }>('dragData')


// 拖拽悬停事件
const onDragOverFirst = (e: DragEvent) => {
  e.preventDefault()

  // 如果已经检查过，直接返回，避免频闪
  if (dragOverFirstChecked) {
    return
  }

  dragOverFirst.value = true
  dragOverFirstChecked = true

  // 检查是否允许放置
  if (dragData?.value && !isDuplicateDimension(dragData.value.key, 'first')) {
    document.body.style.cursor = 'copy'
  } else {
    document.body.style.cursor = 'not-allowed'
  }
}

const onDragLeaveFirst = (e: DragEvent) => {
  // 检查鼠标是否真正离开了容器，而不是进入子元素
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const x = e.clientX
  const y = e.clientY

  // 如果鼠标仍在容器范围内，不触发离开事件
  if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
    return
  }

  dragOverFirst.value = false
  dragOverFirstChecked = false // 重置检查状态
  document.body.style.cursor = 'default'
}

const onDragOverSecond = (e: DragEvent) => {
  e.preventDefault()

  // 如果没有一级维度，不允许拖入
  if (!props.firstDimension) {
    document.body.style.cursor = 'not-allowed'
    return
  }

  // 如果已经检查过，直接返回，避免频闪
  if (dragOverSecondChecked) {
    return
  }

  dragOverSecond.value = true
  dragOverSecondChecked = true

  // 检查是否允许放置
  if (dragData?.value && !isDuplicateDimension(dragData.value.key, 'second')) {
    document.body.style.cursor = 'copy'
  } else {
    document.body.style.cursor = 'not-allowed'
  }
}

const onDragLeaveSecond = (e: DragEvent) => {
  // 检查鼠标是否真正离开了容器，而不是进入子元素
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const x = e.clientX
  const y = e.clientY

  // 如果鼠标仍在容器范围内，不触发离开事件
  if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
    return
  }

  dragOverSecond.value = false
  dragOverSecondChecked = false // 重置检查状态
  document.body.style.cursor = 'default'
}

// 放置事件处理
const onDropFirstDimension = (e: DragEvent) => {
  e.preventDefault()
  dragOverFirst.value = false
  document.body.style.cursor = 'default'

  if (!dragData?.value) {
    return
  }

  const isDuplicate = isDuplicateDimension(dragData.value.key, 'first')

  if (!isDuplicate) {
    // 为一级维度的所有项生成不同的颜色
    const itemCount = dragData.value.items?.length || 0
    const distinctColors = generateDistinctColors(itemCount)

    const newFirstDimension: IndicatorGroup = {
      key: dragData.value.key,
      title: dragData.value.title,
      items: dragData.value.items?.map((item, index) => ({
        ...item,
        color: distinctColors[index] || getRandomColor()
      })) || []
    }

    emit('update:firstDimension', newFirstDimension)
    emit('dimensionChanged')
  } else {
    // 在放置时显示消息提示
    message.warning(`"指标${dragData.value.title}"已在其他维度中选择，请选择其他指标`)
  }
}

const onDropSecondDimension = (e: DragEvent) => {
  e.preventDefault()
  dragOverSecond.value = false
  document.body.style.cursor = 'default'

  if (!dragData?.value) {
    return
  }

  // 检查是否有一级维度
  if (!props.firstDimension) {
    message.warning('请先选择一级维度，再选择二级维度')
    return
  }

  const isDuplicate = isDuplicateDimension(dragData.value.key, 'second')

  if (!isDuplicate) {
    const newSecondDimension: IndicatorGroup = {
      key: dragData.value.key,
      title: dragData.value.title,
      items: dragData.value.items?.map((item) => ({ ...item })) || []
    }

    emit('update:secondDimension', newSecondDimension)
    emit('dimensionChanged')
  } else {
    // 在放置时显示消息提示
    message.warning(`"指标${dragData.value.title}"已在其他维度中选择，请选择其他指标`)
  }
}

// 检查是否重复维度
const isDuplicateDimension = (key: string, current: 'first' | 'second' | null) => {
  if (current === 'first') {
    // 检查是否与二级维度或筛选维度重复
    return props.secondDimension?.key === key
  } else if (current === 'second') {
    // 检查是否与一级维度或筛选维度重复
    return props.firstDimension?.key === key
  } else {
    // 检查是否已存在于任何维度（用于拖拽开始时的检查）
    return props.firstDimension?.key === key ||
        props.secondDimension?.key === key
  }
}

// 清空维度
const clearFirstDimension = () => {
  emit('update:firstDimension', null)
  emit('dimensionChanged')
}

const clearSecondDimension = () => {
  emit('update:secondDimension', null)
  emit('dimensionChanged')
}

// 折叠切换
const toggleCollapse = () => {
  collapsed.value = !collapsed.value
}

</script>

<style lang="less" scoped>
.dimension-section {
  margin-bottom: 24px;

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
    user-select: none;
    margin-bottom: 16px;
    padding: 8px 12px;
    border-radius: 4px;
    transition: all 0.3s;

    &:hover {
      background-color: var(--bg-hover);
    }

    h4 {
      margin: 0;
      font-size: 14px;
      font-weight: 600;
      color: var(--text-primary);
    }

    .collapse-btn {
      color: var(--text-tertiary);
      transition: all 0.2s;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;

      &:hover {
        color: var(--accent);
        background-color: var(--accent-soft);
      }
    }
  }

  .dimension-item {
    margin-bottom: 16px;

    .dimension-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
      font-size: 13px;
      color: var(--text-secondary);

      .required {
        color: var(--danger);
      }

      .dimension-tip {
        color: var(--text-tertiary);
        font-size: 12px;
        font-style: italic;
        margin-left: auto;
      }

      .clear-btn {
        margin-left: auto;
        color: var(--text-primary);
      }
    }

    .drop-zone {
      min-height: 50px;
      border: 2px dashed var(--border-subtle);
      border-radius: 6px;
      padding: 8px 12px;
      transition: all 0.3s ease;
      background: var(--bg-hover);
      position: relative;
      display: flex;
      align-items: center;

      &.drag-over {
        border-color: var(--accent);
        background: var(--success-soft);
      }

      &.drag-forbidden {
        border-color: var(--border-subtle) !important;
        background: var(--bg-hover) !important;

        .drop-placeholder {
          opacity: 0.3;
        }
      }

      &.has-content {
        border-color: var(--success);
        background: var(--bg-elevated);
      }

      &.disabled {
        background: var(--bg-hover);
        border-color: var(--border-subtle);
        border-style: dashed;
        opacity: 0.6;
        cursor: not-allowed;

        .drop-placeholder {
          color: var(--text-tertiary);
        }
      }

      .drop-forbidden-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background: var(--bg-overlay);
        border-radius: 4px;
        z-index: 10;
        pointer-events: none;

        .forbidden-icon {
          font-size: 30px;
          color: var(--danger);
          margin-bottom: 5px;
          font-weight: bold;
          text-shadow: 0 0 8px var(--bg-overlay);
          animation: pulse 1.5s ease-in-out infinite alternate;
        }

        .forbidden-text {
          color: var(--danger);
          font-size: 14px;
          font-weight: 600;
          text-align: center;
          text-shadow: 0 0 4px rgba(0, 0, 0, 0.3);
        }
      }

      .drop-placeholder {
        text-align: center;
        color: var(--text-tertiary);
        font-size: 12px;
        width: 100%;

        &.warning-hint {
          color: var(--text-tertiary);
          font-weight: 400;
          position: relative;

          &::before {
            content: 'ᵢ';
            margin-right: 4px;
            font-size: 12px;
            opacity: 0.7;
            color: var(--text-tertiary);
          }
        }
      }

      .dimension-content {
        width: 100%;

        .dimension-info-line {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;

          .dimension-title {
            font-weight: 600;
            color: var(--text-primary);
            flex: 1;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .info-text {
            color: #52c41a;
            font-size: 12px;
            margin-left: 12px;
            flex-shrink: 0;
          }
        }
      }
    }
  }
}

@keyframes pulse {
  0% {
    transform: scale(1);
  }

  100% {
    transform: scale(1.1);
  }
}
</style>
