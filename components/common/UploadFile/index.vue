<template>
  <a-modal
    :closable="['UPLOAD', 'VALIDATE', 'SAVE'].indexOf(config.type) === -1"
    :keyboard="['UPLOAD', 'VALIDATE', 'SAVE'].indexOf(config.type) === -1"
    :mask-closable="false"
    :open="uploadDialogBox.show"
    :width="800"
    centered
    @cancel="closeUploadModal"
    @ok="confirmUploadModal"
  >
    <a-button
      v-if="isNotEmpty(_template) && isNotEmpty(templateName) && ['UPLOAD', 'VALIDATE', 'SAVE'].indexOf(config.type) === -1"
      ghost
      @click="_template(templateName)"
    >
      下载模版
    </a-button>
    <a-upload-dragger
      v-if="config.type === 'INIT'"
      v-model:file-list="uploadDialogBox.file"
      :accept="accept"
      :before-upload="beforeUpload"
      :custom-request="handleFileUpload"
      :directory="directory"
      :max-count="multiple ? undefined : 1"
      :multiple="multiple"
      :name="multiple ? 'files' : 'file'"
      :style="{marginTop: (isNotEmpty(template) && isNotEmpty(templateName)) ? '5px' : '30px'}"
      list-type="text"
      @change="handleUploadChange"
      @reject="reject"
    >
      <p class="ant-upload-drag-icon">
        <inbox-outlined />
      </p>
      <p class="ant-upload-text">
        点击或者拖拽文件至此上传
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
            <span
              v-if="config.estimatedTime > 0"
              style="margin-left: 24px;"
            >
              <span style="font-weight: 500;">预计剩余：</span>
              <span style="color: #52c41a; font-weight: 600;">{{ formatTime(config.estimatedTime) }}</span>
            </span>
          </div>
        </div>
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
    <a-progress
      v-if="!multiple && _handleProgress"
      :percent="_handleProgress"
      :status="_handleProgress < 0 ? 'exception' : undefined"
    />
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

import { CloseCircleOutlined, InboxOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { AxiosProgressEvent } from 'axios'
import { isNumber } from 'lodash'
import { Ref } from 'vue'

import { uploadFile } from '@/framework/apis/common/common'
import { downloadTemplate, getUploadParseProgress, uploadParse } from '@/framework/apis/upload'
import { UploadModalType } from '@/framework/components/common/Portal/type'
import { getUploadAccepts, getUploadFileType } from '@/framework/components/common/UploadFile/utils'
import { isNotEmpty, startTimer, stopTimer } from '@/framework/utils/common'
import { TimerType } from '@/framework/utils/type'



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
  excelParseUrl?: string
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
  handleProgress: undefined,
  excelParseUrl: undefined
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
const { handleProgress, uploadParam, useOriginalFileName, excelParseUrl } = toRefs(prop)
const _handleProgress: Ref<number | undefined> = ref(undefined)
const _progress = ref(prop.progress)
const _upload = ref(prop.upload)
const _template = ref(prop.template)
watch(
  () => handleProgress.value,
  () => _handleProgress.value = handleProgress.value
)
watch(
  () => excelParseUrl.value,
  () => {
      if (excelParseUrl.value) {
        _progress.value = _progress.value ? _progress.value : () => getUploadParseProgress(excelParseUrl.value)
        _upload.value = _upload.value ? _upload.value : uploadParse(excelParseUrl.value)
        _template.value = _template.value ? _template.value : downloadTemplate(excelParseUrl.value)
      }
  },
  {
    immediate:true
  }
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
// 用于触发已持续时间的实时更新
const currentTime = ref(0)
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
  currentTime.value = 0
  progressErrorCount.value = 0
  stopTimer(uploadProgressTimer)
  stopTimer(elapsedTimeTimer)
}
const setUploadProgress = (percent: number) => {
  config.type = 'UPLOAD'
  config.step = 0
  config.percent = percent || 0
  if (!config.startTime) {
    const now = Date.now()
    config.startTime = now
    currentTime.value = now
    // 启动已持续时间更新定时器
    startTimer(elapsedTimeTimer, () => {
      currentTime.value = Date.now()
    }, false)
  }
}
const setFailedProgress = () => {
  config.type = 'FAILED'
  config.step = 0
  config.percent = 0
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
      currentTime.value = 0
      progressErrorCount.value = 0
      stopTimer(uploadProgressTimer)
      stopTimer(elapsedTimeTimer)
      break
    case 'UPLOAD':
      config.step = 0
      if (!config.startTime) {
        const now = Date.now()
        config.startTime = now
        currentTime.value = now
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
      currentTime.value = 0
      progressErrorCount.value = 0
      stopTimer(uploadProgressTimer)
      stopTimer(elapsedTimeTimer)
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
  console.debug(file, fileList)
  const isLt20M = file.size / 1024 / 1024 < 20
  if (!isLt20M) {
    message.error('文件请小于 20MB!')
  }
  return isLt20M
}
const handleFileUpload = async (data: { file: any; onProgress?: any; onSuccess?: any; onError?: any }) => {
  const { file, onProgress, onSuccess, onError } = data
  let formData = new FormData()
  formData.append('file', file)
  if (_upload.value) {
    _upload.value(formData, (progressEvent: AxiosProgressEvent) => {
      let percent = 0
      if (isNumber(progressEvent.total)) {
        percent = Math.round((progressEvent.loaded * 100) / progressEvent.total)
      }
      onProgress({ percent: percent }, file)
      if (isNotEmpty(_progress.value))  {
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
      onProgress({ percent: percent }, file)
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
    if (_progress.value) {
      progressErrorCount.value = 0 // 重置错误计数
      startTimer(uploadProgressTimer, () => {
        _progress.value().then((resp: any) => {
          updateProgress(resp.payload)
        }).catch((error: any) => {
          progressErrorCount.value++
          console.error(`进度查询失败 (${progressErrorCount.value}/${MAX_ERROR_COUNT}):`, error)
          if (progressErrorCount.value >= MAX_ERROR_COUNT) {
            console.error('进度查询连续失败5次，停止轮询')
            message.error('进度查询失败，请刷新页面重试')
            stopTimer(uploadProgressTimer)
            stopTimer(elapsedTimeTimer)
            setFailedProgress()
          }
        })
      }, false)
    }
  } else {
    _handleProgress.value = undefined
  }
}
const reject = () => {
  message.error('不支持该文件格式')
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
  if (!config.startTime || config.startTime <= 0) return 0
  // 使用 currentTime.value 确保响应式更新
  const elapsed = Math.floor((currentTime.value - config.startTime) / 1000)
  // 确保不返回负数
  return elapsed > 0 ? elapsed : 0
}

defineExpose({ showUploadDialogBox, updateProgress })
</script>

<style scoped>

</style>
