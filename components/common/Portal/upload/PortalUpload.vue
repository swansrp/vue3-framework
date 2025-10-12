<template>
  <a-modal
    :keyboard="false"
    :mask-closable="false"
    :open="config.show"
    :width="800"
    centered
    @cancel="closeUploadModal"
  >
    <a-button
      ghost
      @click="templateExport"
    >
      下载模版
    </a-button>
    <a-upload-dragger
      v-if="config.type === 'INIT'"
      v-model:file-list="config.file"
      :before-upload="beforeUpload"
      :custom-request="handleFileUpload"
      accept=".xlsx,.xls"
      name="file"
      style="margin-top: 5px"
      @change="handleUploadChange"
      @reject="reject"
    >
      <p class="ant-upload-drag-icon">
        <inbox-outlined />
      </p>
      <p class="ant-upload-text">
        点击或者拖拽文件至此上传
      </p>
      <p class="ant-upload-hint">
        注意请使用系统提供的模版填充数据<br />模版格式不正确可能导致数据无法被处理
      </p>
    </a-upload-dragger>
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
            :title="title + '数据'"
            description=""
          />
        </a-steps>
      </template>
    </a-result>
    <a-result
      v-if="config.type === 'SUCCESS'"
      :sub-title="'已成功保存数据' + config.loaded + '条'"
      status="success"
      title="上传数据成功"
    >
      <template #extra></template>
    </a-result>
    <a-result
      v-if="config.type === 'FAILED'"
      status="error"
      title="上传数据失败"
    >
      <template #extra>
        <a-button
          key="console"
          type="primary"
          @click="resetUploadProgress()"
        >
          重新上传
        </a-button>
      </template>

      <div
        v-if="config.failedReason.length !== 0"
        class="desc"
      >
        <p style="font-size: 16px">
          <strong>上传过程发生了下列错误:</strong>
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
      <a-button
        v-if="config.type === 'SUCCESS'"
        @click="resetUploadProgress()"
      >
        重新上传
      </a-button>
      <a-button
        v-else
        @click="closeUploadModal"
      >
        确定
      </a-button>
    </template>
  </a-modal>
</template>

<script lang="ts" setup>
import { CloseCircleOutlined, InboxOutlined } from '@ant-design/icons-vue'
import { message, UploadChangeParam } from 'ant-design-vue'
import { AxiosProgressEvent } from 'axios'
import { isNumber } from 'lodash'

import { UploadModalType } from '@/framework/components/common/Portal/type'
import { startTimer, stopTimer } from '@/framework/utils/common'
import { TimerType } from '@/framework/utils/type'

const emit = defineEmits<{
  /**
   * templateExport: 模版下载函数
   */
  (e: 'templateExport'): void
  /**
   * upload: 上传文件
   *
   * @param: file 文件
   * @param: onUploadProgress 进度回调函数
   * @param: onSuccess 完成回调函数
   * @param: onFailed  失败回调函数
   */
  (e: 'upload', file: Object, onUploadProgress: Function, onSuccess: Function, onFailed: Function): void
  /**
   * 获取处理进度
   */
  (e: 'uploadProgress', func: Function): void
  /**
   * 关闭弹框后执行操作
   */
  (e: 'afterClose'): void
}>()
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
const stepTitle = ['上传', '校验', '保存']
let needRefresh = false
const uploadProgressTimer: TimerType = {
  timer: {},
  lastTime: 0,
  diff: 2000
}
const resetUploadProgress = () => {
  config.type = 'INIT'
  config.percent = 0
  config.failedReason = []
  config.file = []
  needRefresh = false
  stopTimer(uploadProgressTimer)
}
const setUploadProgress = (percent: number) => {
  config.type = 'UPLOAD'
  config.step = 0
  config.percent = percent || 0
}
const setFailedProgress = () => {
  config.type = 'FAILED'
  config.step = 0
  config.percent = 0
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
      needRefresh = true
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
const templateExport = () => {
  emit('templateExport')
}
const closeUploadModal = () => {
  needRefresh && emit('afterClose')
  resetUploadProgress()
  config.show = false
}
const beforeUpload = (file: any) => {
  const isLt20M = file.size / 1024 / 1024 < 20
  if (!isLt20M) {
    message.error('文件请小于 20MB!')
  }
  return isLt20M
}
const reject = () => {
  message.error('请上传基于模版格式的xlsx文件')
}
const handleUploadChange = (info: UploadChangeParam) => {
  const status = info.file.status
  if (status !== 'uploading') {
    // console.log(info.file, info.fileList)
  }
  if (status === 'done') {
    startTimer(uploadProgressTimer, () => {
      emit('uploadProgress', (resp: any) => {
        updateProgress(resp.payload)
      })
    }, false)
  } else if (status === 'error') {
    message.error(`${info.file.name} file upload failed.`)
  }
}
const handleFileUpload = async (data: { file: any; onProgress?: any; onSuccess?: any }) => {
  const { file, onProgress, onSuccess } = data
  let formData = new FormData()
  formData.append('file', file)
  return emit('upload', formData, (progressEvent: AxiosProgressEvent) => {
    let percent = 0
    if (isNumber(progressEvent.total)) {
      percent = Math.round((progressEvent.loaded * 100) / progressEvent.total)
    }
    onProgress({ percent: percent }, file)
    setUploadProgress(percent)
  }, (resp: any) => {
    onSuccess(resp, file)
  }, () => {
    setFailedProgress()
    stopTimer(uploadProgressTimer)
  })
}
const openUploadModal = (resp: any) => {
  const { step } = resp.payload
  if (step === 'SUCCESS' || step === 'FAILED') {
    resetUploadProgress()
  } else {
    updateProgress(resp.payload)
    startTimer(uploadProgressTimer, () => {
      emit('uploadProgress', (resp: any) => {
        updateProgress(resp.payload)
      })
    })
  }
  config.show = true
}
defineExpose({ openUploadModal })
</script>

<style scoped>

</style>
