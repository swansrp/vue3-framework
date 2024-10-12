<template>
  <a-modal
    :keyboard="false"
    :maskClosable="false"
    :open="uploadDialogBox.show"
    :width="800"
    centered
    @cancel="closeUploadModal"
    @ok="confirmUploadModal">
    <a-upload-dragger
      v-model:fileList="uploadDialogBox.file"
      :accept="accept"
      :before-upload="beforeUpload"
      :customRequest="handleFileUpload"
      :directory="directory"
      :max-count="multiple ? undefined : 1"
      :multiple="multiple"
      :name="multiple ? 'files' : 'file'"
      style="margin-top: 30px"
      @change="handleUploadChange"
      @reject="reject">
      <p class="ant-upload-drag-icon">
        <inbox-outlined />
      </p>
      <p class="ant-upload-text">点击或者拖拽文件至此上传</p>
    </a-upload-dragger>
  </a-modal>
</template>

<script lang="ts" setup>

import { message } from 'ant-design-vue'
import { uploadFile } from '@/framework/apis/common/common'
import { AxiosProgressEvent } from 'axios'
import { isNumber } from 'lodash'
import { getUploadAccepts, getUploadFileType } from '@/framework/components/common/UploadFile/utils'
import { InboxOutlined } from '@ant-design/icons-vue'

const prop =withDefaults(defineProps<{
  folder?: string,
  fileName?: string,
  url?: any,
  upload?: any,
  multiple?: boolean,
  directory?: boolean
}>(),{
  folder: undefined,
  fileName: undefined,
  url: undefined,
  upload: undefined,
  multiple: false,
  directory: false
})
const emit = defineEmits<{
  /**
   *
   * @param e
   * @param url
   */
  (e: 'update:url', url: any): void
  (e: 'afterConfirm'): void
}>()

const accept = ref('')
const uploadDialogBox: { show: boolean, uploadFileType: any, file: Array<any>, url: string | null } = reactive({
  show: false,
  uploadFileType: '',
  file: [] as Array<any>,
  url: null
})
const showUploadDialogBox = (fieldType: string) => {
  uploadDialogBox.url = null
  uploadDialogBox.file = []
  uploadDialogBox.show = true
  accept.value = getUploadAccepts(fieldType)
}
const closeUploadModal = () => {
  uploadDialogBox.url = null
  uploadDialogBox.show = false
}
const beforeUpload = (file: any, fileList: any) => {
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
    }).then((resp: any) => {
      onSuccess(resp, file)
    }).catch((resp: any) => {
      onError(resp.payload, '', file)
    })
  } else {
    return uploadFile(formData, (progressEvent: AxiosProgressEvent) => {
      let percent = 0
      if (isNumber(progressEvent.total)) {
        percent = Math.round((progressEvent.loaded * 100) / progressEvent.total)
      }
      onProgress({percent: percent}, file)
    }, getUploadFileType(file), prop.folder, prop.fileName).then((resp: any) => {
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
const handleUploadChange = () => {

}
const reject = () => {
  message.error('不支持该文件格式')
}

defineExpose({showUploadDialogBox})
</script>

<style scoped>

</style>
