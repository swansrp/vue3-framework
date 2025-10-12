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
const config = reactive({
  show: false,
  type: 'INIT',
  step: 0,
  file: [],
  total: 0,
  loaded: 0,
  percent: 0,
  failedReason: []
} as UploadModalType)
const resetUploadProgress = () => {
  config.type = 'INIT'
  config.percent = 0
  config.failedReason = []
  config.file = []
  stopTimer(uploadProgressTimer)
}
const updateProgress = (resp: any) => {
  const { step, loaded, comments, total } = resp
  console.debug('updateProgress', step, loaded, comments, total)
  config.type = step
  config.loaded = loaded
  config.total = total
  config.failedReason = comments || []
  if (total !== 0) config.percent = loaded / total * 100
  switch (step) {
    case 'INIT':
      config.file = []
      stopTimer(uploadProgressTimer)
      break
    case 'UPLOAD':
      config.step = 0
      break
    case 'VALIDATE':
      config.step = 1
      break
    case 'SAVE':
      config.step = 2
      break
    case 'SUCCESS':
      stopTimer(uploadProgressTimer)
      break
    case 'FAILED':
      config.file = []
      stopTimer(uploadProgressTimer)
      break
    default:
      break
  }
}
const show = () => {
  resetUploadProgress()
  uploadDialogBox.show = true
  startTimer(uploadProgressTimer, () => {
    _progress.value().then((resp: any) => updateProgress(resp.payload))
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

defineExpose({ show, updateProgress })
</script>

<style scoped>

</style>
