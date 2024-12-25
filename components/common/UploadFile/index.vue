<template>
  <a-modal
    :keyboard="false"
    :maskClosable="false"
    :open="uploadDialogBox.show"
    :width="800"
    centered
    @cancel="closeUploadModal"
    @ok="confirmUploadModal">
    <a-button v-if="isNotEmpty(template) && isNotEmpty(templateName)" ghost @click="template(templateName)">下载模版
    </a-button>
    <a-upload-dragger
      v-if="config.type === 'INIT'"
      v-model:fileList="uploadDialogBox.file"
      :accept="accept"
      :before-upload="beforeUpload"
      :customRequest="handleFileUpload"
      :directory="directory"
      :max-count="multiple ? undefined : 1"
      :multiple="multiple"
      :name="multiple ? 'files' : 'file'"
      :style="{marginTop: (isNotEmpty(template) && isNotEmpty(templateName)) ? '5px' : '30px'}"
      listType="text"
      @change="handleUploadChange"
      @reject="reject">
      <p class="ant-upload-drag-icon">
        <inbox-outlined />
      </p>
      <p class="ant-upload-text">点击或者拖拽文件至此上传</p>
    </a-upload-dragger>
    <a-result
      v-if="['UPLOAD', 'VALIDATE', 'SAVE'].indexOf(config.type) !== -1"
      :title="'正在' + stepTitle[config.step] + '数据...'">
      <template #icon>
        <a-steps
          :current="config.step"
          :percent="config.percent">
          <a-step
            v-for="title in stepTitle"
            :key="title"
            :title="title + '数据'"
            description="" />
        </a-steps>
      </template>
    </a-result>
    <a-result
      v-if="config.type === 'SUCCESS'"
      :sub-title="'已成功保存数据' + config.loaded + '条'"
      status="success"
      title="上传数据成功"
    >
      <template #extra>

      </template>
    </a-result>
    <a-result
      v-if="config.type === 'FAILED'"
      status="error"
      title="上传数据失败"
    >
      <template #extra>
        <a-button key="console" type="primary" @click="resetUploadProgress()">重新上传</a-button>
      </template>

      <div v-if="config.failedReason.length !== 0" class="desc">
        <p style="font-size: 16px">
          <strong>上传过程发生了下列错误:</strong>
        </p>
        <p v-for="reason in config.failedReason" :key="reason">
          <close-circle-outlined :style="{ color: 'red' }" />
          {{ reason }}
        </p>
      </div>
    </a-result>
    <a-progress
      v-if="!multiple && _handleProgress"
      :percent="_handleProgress"
      :status="_handleProgress < 0 ? 'exception' : undefined" />
    <template #footer>
      <div v-if="['UPLOAD', 'VALIDATE', 'SAVE'].indexOf(config.type) === -1">
        <a-button @click="closeUploadModal">取消</a-button>
        <a-button type="primary" @click="confirmUploadModal">确定</a-button>
      </div>
    </template>
  </a-modal>
</template>

<script lang="ts" setup>

import { message } from 'ant-design-vue'
import { uploadFile } from '@/framework/apis/common/common'
import { AxiosProgressEvent } from 'axios'
import { isNumber } from 'lodash'
import { getUploadAccepts, getUploadFileType } from '@/framework/components/common/UploadFile/utils'
import { CloseCircleOutlined, InboxOutlined } from '@ant-design/icons-vue'
import { isNotEmpty, startTimer, stopTimer } from '@/framework/utils/common'
import { UploadModalType } from '@/framework/components/common/Portal/type'
import { TimerType } from '@/framework/utils/type'
import { Ref } from 'vue'

const stepTitle = ['上传', '校验', '保存']
const prop = withDefaults(defineProps<{
  folder?: string,
  fileName?: string,
  useOriginalFileName?: boolean,
  url?: any,
  upload?: any,
  uploadParam?: any,
  template?: any,
  templateName?: any,
  progress?: any,
  multiple?: boolean,
  directory?: boolean,
  handleProgress?: number
}>(), {
  folder: undefined,
  fileName: undefined,
  useOriginalFileName: false,
  url: undefined,
  upload: undefined,
  uploadParam: undefined,
  template: undefined,
  templateName: '数据模版.xlsx',
  progress: undefined,
  multiple: false,
  directory: false,
  handleProgress: undefined
})
const emit = defineEmits<{
  /**
   *
   * @param e
   * @param url
   */
  (e: 'update:url', url: any): void
  (e: 'uploadComplete'): void
  (e: 'afterConfirm'): void
}>()
const {handleProgress, uploadParam, useOriginalFileName} = toRefs(prop)
const _handleProgress: Ref<number | undefined> = ref(undefined)
watch(
  () => handleProgress.value,
  () => _handleProgress.value = handleProgress.value
)
const accept = ref('')
const uploadDialogBox: { show: boolean, uploadFileType: any, file: Array<any>, url: string | null } = reactive({
  show: false,
  uploadFileType: '',
  file: [] as Array<any>,
  url: null
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
  const {step, loaded, comments, total} = resp
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
const showUploadDialogBox = (fieldType = '') => {
  uploadDialogBox.url = null
  uploadDialogBox.file = []
  uploadDialogBox.show = true
  accept.value = getUploadAccepts(fieldType)
  resetUploadProgress()

}
const closeUploadModal = () => {
  resetUploadProgress()
  uploadDialogBox.url = null
  uploadDialogBox.show = false
}
const beforeUpload = (file: any, fileList: any) => {
  console.trace(file, fileList)
  const isLt20M = file.size / 1024 / 1024 < 20
  if (!isLt20M) {
    message.error('文件请小于 20MB!')
  }
  return isLt20M
}
const handleFileUpload = async (data: { file: any; onProgress?: any; onSuccess?: any; onError?: any }) => {
  const {file, onProgress, onSuccess, onError} = data
  let formData = new FormData()
  formData.append('file', file)
  if (prop.upload) {
    prop.upload(formData, (progressEvent: AxiosProgressEvent) => {
      let percent = 0
      if (isNumber(progressEvent.total)) {
        percent = Math.round((progressEvent.loaded * 100) / progressEvent.total)
      }
      onProgress({percent: percent}, file)
      if (isNotEmpty(prop.progress)) {
        setUploadProgress(percent)
      }
    }, uploadParam.value).then((resp: any) => {
      onSuccess(resp, file)
    }).catch((resp: any) => {
      setFailedProgress()
      onError(resp.payload, '', file)
    })
  } else {
    return uploadFile(formData, (progressEvent: AxiosProgressEvent) => {
      let percent = 0
      if (isNumber(progressEvent.total)) {
        percent = Math.round((progressEvent.loaded * 100) / progressEvent.total)
      }
      onProgress({percent: percent}, file)
    }, getUploadFileType(file), prop.folder, useOriginalFileName.value ? file.name : prop.fileName).then((resp: any) => {
      onSuccess(resp, file)
      uploadDialogBox.url = resp.payload.url
    })
  }
}
const confirmUploadModal = () => {
  emit('update:url', uploadDialogBox.url)
  uploadDialogBox.show = false
  emit('afterConfirm')
}
const handleUploadChange = (file: any) => {
  if (file.event?.percent === 100) {
    emit('uploadComplete')
    if (isNotEmpty(prop.progress)) {
      startTimer(uploadProgressTimer, () => {
        prop.progress().then((resp: any) => updateProgress(resp.payload))
      }, false)
    }
  } else {
    _handleProgress.value = undefined
  }
}
const reject = () => {
  message.error('不支持该文件格式')
}

defineExpose({showUploadDialogBox, updateProgress})
</script>

<style scoped>

</style>
