<template>
  <a-modal
    :keyboard="false"
    :maskClosable="false"
    :visible="uploadDialogBox.show"
    :width="800"
    centered
    @cancel="closeUploadModal"
    @ok="confirmUploadModal">
    <a-upload-dragger
      v-model:fileList="uploadDialogBox.file"
      :accept="accept"
      :before-upload="beforeUpload"
      :customRequest="handleFileUpload"
      :max-count="1"
      name="file"
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

import {message} from 'ant-design-vue'
import {uploadFile} from '@/framework/apis/common/common'
import {AxiosProgressEvent} from 'axios'
import {isNumber} from 'lodash'
import {getUploadAccepts, getUploadFileType} from '@/framework/components/common/UploadFile/utils'
import {InboxOutlined} from '@ant-design/icons-vue'

const prop = defineProps<{
  folder?: string,
  fileName?: string,
  url: any
}>()
const emit = defineEmits<{
  /**
   *
   * @param e
   * @param url
   */
  (e: 'update:url', url: any): void
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
const beforeUpload = (file: any) => {
  const isLt20M = file.size / 1024 / 1024 < 20
  if (!isLt20M) {
    message.error('文件请小于 20MB!')
  }
  return isLt20M
}
const handleFileUpload = async (data: { file: any; onProgress?: any; onSuccess?: any }) => {
  const {file, onProgress, onSuccess} = data
  let formData = new FormData()
  formData.append('file', file)
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
const confirmUploadModal = () => {
  console.log(uploadDialogBox.url)
  emit('update:url', uploadDialogBox.url)
  uploadDialogBox.show = false
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
