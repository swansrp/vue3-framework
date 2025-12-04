<template>
  <a-modal
    :keyboard="false"
    :mask-closable="false"
    :open="uploadDialogBox.show"
    :width="800"
    centered
    @cancel="closeUploadModal"
    @ok="confirmUploadModal"
  >
    <a-result
      v-if="['UPLOAD', 'VALIDATE', 'SAVE'].indexOf(config.type) !== -1"
      :title="'正在' + stepTitle[config.step] + '数据...'"
    >
      <template #icon>
        <a-steps
          :current="config.step"
          :percent="config.percent"
        >
          <a-step
            v-for="title in stepTitle"
            :key="title"
            :title="title"
            description=""
          />
        </a-steps>
      </template>
      <template #subTitle>
        <div style="margin-top: 16px; font-size: 14px; color: #666;">
          <div style="margin-bottom: 8px;">
            <span style="font-weight: 500;">进度：</span>
            <span style="color: #1890ff; font-weight: 600;">{{ config.percent.toFixed(2) }}%</span>
            <span style="margin-left: 12px;">({{ config.loaded }} / {{ config.total }})</span>
          </div>
          <div v-if="config.startTime > 0">
            <span style="font-weight: 500;">已持续：</span>
            <span style="color: #fa8c16; font-weight: 600;">{{ formatTime(getElapsedTime()) }}</span>
            <span v-if="config.estimatedTime > 0" style="margin-left: 24px;">
              <span style="font-weight: 500;">预计剩余：</span>
              <span style="color: #52c41a; font-weight: 600;">{{ formatTime(config.estimatedTime) }}</span>
            </span>
          </div>
        </div>
      </template>
    </a-result>
    <a-result
      v-if="config.type === 'SUCCESS'"
      :sub-title="'已成功处理数据' + config.loaded + '条'"
      status="success"
      title="完成"
    >
      <template #extra></template>
    </a-result>
    <a-result
      v-if="config.type === 'FAILED'"
      status="error"
      title="失败"
    >
      <div
        v-if="config.failedReason.length !== 0"
        class="desc"
      >
        <p style="font-size: 16px">
          <strong>处理过程发生了下列错误:</strong>
        </p>
        <p
          v-for="reason in config.failedReason"
          :key="reason"
        >
          <close-circle-outlined :style="{ color: 'red' }" />
          {{ reason }}
        </p>
      </div>
    </a-result>
    <template #footer>
      <div v-if="['UPLOAD', 'VALIDATE', 'SAVE'].indexOf(config.type) === -1">
        <a-button @click="closeUploadModal">
          取消
        </a-button>
        <a-button
          type="primary"
          @click="confirmUploadModal"
        >
          确定
        </a-button>
      </div>
    </template>
  </a-modal>
</template>

<script lang="ts" setup>

import { CloseCircleOutlined } from '@ant-design/icons-vue'

import { UploadModalType } from '@/framework/components/common/Portal/type'
import { startTimer, stopTimer } from '@/framework/utils/common'
import { TimerType } from '@/framework/utils/type'

const stepTitle = ['请求', '校验', '处理']
const prop = withDefaults(defineProps<{
  progress: () => Promise<any>
}>(), {})
const _progress = ref(prop.progress)
const emit = defineEmits<{
  (e: 'afterConfirm'): void
}>()
const uploadDialogBox: { show: boolean } = reactive({
  show: false
})
const uploadProgressTimer: TimerType = {
  timer: {},
  lastTime: 0,
  diff: 2000
}
// 用于触发已持续时间的实时更新
const currentTime = ref(Date.now())
const elapsedTimeTimer: TimerType = {
  timer: {},
  lastTime: 0,
  diff: 1000 // 每秒更新一次
}
// 错误计数器
const progressErrorCount = ref(0)
const MAX_ERROR_COUNT = 5
const config = reactive({
  show: false,
  type: 'INIT',
  step: 0,
  file: [],
  total: 0,
  loaded: 0,
  percent: 0,
  failedReason: [],
  startTime: 0,
  estimatedTime: 0
} as UploadModalType)
const resetUploadProgress = () => {
  config.type = 'INIT'
  config.percent = 0
  config.failedReason = []
  config.file = []
  config.startTime = 0
  config.estimatedTime = 0
  progressErrorCount.value = 0
  stopTimer(uploadProgressTimer)
  stopTimer(elapsedTimeTimer)
}
const updateProgress = (resp: any) => {
  const { step, loaded, comments, total } = resp
  console.debug('updateProgress', step, loaded, comments, total)
  // 重置错误计数器（成功获取到进度数据）
  progressErrorCount.value = 0
  config.type = step
  config.loaded = loaded
  config.total = total
  config.failedReason = comments || []
  if (total !== 0) {
    config.percent = loaded / total * 100
    // 计算预计剩余时间
    if (config.startTime && loaded > 0) {
      const elapsed = Date.now() - config.startTime
      const rate = loaded / elapsed // 每毫秒处理的数量
      const remaining = total - loaded
      config.estimatedTime = Math.ceil(remaining / rate / 1000) // 转换为秒
    }
  }
  switch (step) {
    case 'INIT':
      config.file = []
      config.startTime = 0
      config.estimatedTime = 0
      progressErrorCount.value = 0
      stopTimer(uploadProgressTimer)
      stopTimer(elapsedTimeTimer)
      break
    case 'UPLOAD':
      config.step = 0
      if (!config.startTime) {
        config.startTime = Date.now()
        // 启动已持续时间更新定时器
        startTimer(elapsedTimeTimer, () => {
          currentTime.value = Date.now()
        }, false)
      }
      break
    case 'VALIDATE':
      config.step = 1
      break
    case 'SAVE':
      config.step = 2
      break
    case 'SUCCESS':
      config.estimatedTime = 0
      progressErrorCount.value = 0
      stopTimer(uploadProgressTimer)
      stopTimer(elapsedTimeTimer)
      break
    case 'FAILED':
      config.file = []
      config.startTime = 0
      config.estimatedTime = 0
      progressErrorCount.value = 0
      stopTimer(uploadProgressTimer)
      stopTimer(elapsedTimeTimer)
      break
    default:
      break
  }
}
const show = () => {
  resetUploadProgress()
  uploadDialogBox.show = true
  progressErrorCount.value = 0 // 重置错误计数
  config.startTime = Date.now()
  // 启动已持续时间更新定时器
  startTimer(elapsedTimeTimer, () => {
    currentTime.value = Date.now()
  }, false)
  startTimer(uploadProgressTimer, () => {
    _progress.value().then((resp: any) => {
      updateProgress(resp.payload)
    }).catch((error: any) => {
      progressErrorCount.value++
      console.error(`进度查询失败 (${progressErrorCount.value}/${MAX_ERROR_COUNT}):`, error)
      if (progressErrorCount.value >= MAX_ERROR_COUNT) {
        console.error('进度查询连续失败5次，停止轮询')
        stopTimer(uploadProgressTimer)
        stopTimer(elapsedTimeTimer)
        config.type = 'FAILED'
        config.failedReason = ['进度查询失败，请刷新页面重试']
      }
    })
  }, true)
}
const closeUploadModal = () => {
  resetUploadProgress()
  uploadDialogBox.show = false
}
const confirmUploadModal = () => {
  uploadDialogBox.show = false
  emit('afterConfirm')
}

// 格式化时间显示
const formatTime = (seconds: number): string => {
  if (seconds < 60) {
    return `${seconds}秒`
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${minutes}分${secs}秒`
  } else {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${hours}小时${minutes}分钟`
  }
}
// 获取已持续时间（秒）
const getElapsedTime = (): number => {
  if (!config.startTime) return 0
  // 使用 currentTime.value 确保响应式更新
  return Math.floor((currentTime.value - config.startTime) / 1000)
}

defineExpose({ show, updateProgress })
</script>

<style scoped>

</style>
