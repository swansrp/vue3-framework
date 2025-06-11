<template>
  <div v-if="_.$isNotEmpty(modelValue)" class="pre-file-cont">
    <a-image
      v-if="type === FIELD_TYPE.IMAGE" :height="height" :src="modelValue" :width="width"
      fallback="data:image/png;base64,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" />
    <template v-else>
      <template v-if="type === FIELD_TYPE.AUDIO">
        <video
          ref="videoRef"
          :src="modelValue" height="0" preload width="0" @pause="stopFile(false)"
          @play="playFile(false)"></video>
      </template>
      <div style="position: relative">
        <img
          :src="iconURL"
          :style="{width: isNaN(Number(width))?width:width+'px', height: isNaN(Number(height))?height:height+'px',objectFit:'cover'}"
          alt="file_icon_preview" />
        <div class="icons-box">
          <PauseOutlined
            v-if="playing" :style="{color:'rgb(255,255,255)', fontSize: '16px'}"
            @click.prevent.stop="stopFile" />
          <CaretRightOutlined
            v-else :style="{color:'rgb(255,255,255)', fontSize: '16px'}"
            @click.prevent.stop="playFile" />
        </div>
      </div>
    </template>
    <a-badge dot v-if="deleteAble || downloadAble">
      <a-dropdown>
        <div style="width: 10px; height: 10px; margin-left: -10px; background: transparent"></div>
        <template #overlay>
          <a-menu>
            <a-menu-item v-if="deleteAble" @click="onDelete">
              <CloseCircleOutlined />
              删除
            </a-menu-item>
            <a-menu-item v-if="downloadAble" @click="downFile">
              <DownloadOutlined />
              下载
            </a-menu-item>
          </a-menu>
        </template>
      </a-dropdown>
    </a-badge>
  </div>
  <a-button
    v-else-if="uploadAble"
    :disabled="disabled"
    :type="'dashed'"
    @click="onUpload">
    {{ '点击上传' + title }}
  </a-button>
  <upload-file
    ref="uploadFileModalRef"
    v-model:url="uploadUrl"
    :useOriginalFileName="useOriginalFileName"
    @after-confirm="emit('update:modelValue', uploadUrl)"
  />
</template>

<script lang="ts" setup>
import {ref} from 'vue'
import {downloadUrl} from '@/framework/network/request'
import {getFileName} from '@/framework/utils/file'
import {CaretRightOutlined, CloseCircleOutlined, DownloadOutlined, PauseOutlined} from '@ant-design/icons-vue'
import getImgUrl from '@/framework/assets/imgs/getImgUrl'
import {FIELD_TYPE} from '@/framework/components/common/Portal/type'

const uploadUrl = ref('')
const _ = getInstance()
const uploadFileModalRef = ref()
const audioFile = getImgUrl('file/audio_icon.png')
const ukFile = getImgUrl('file/unknown_file.png')
const props = withDefaults(
  defineProps<{
    type?: string,
    modelValue: string | null,
    title?: string,
    disabled?: boolean,
    width?: string | number,
    height?: string | number,
    deleteAble?: boolean,
    uploadAble?: boolean,
    downloadAble?: boolean,
    useOriginalFileName?: boolean
  }>(),
  {
    type: FIELD_TYPE.IMAGE,
    title: '',
    disabled: false,
    width: 'auto',
    height: 'auto',
    deleteAble: false,
    uploadAble: false,
    downloadAble: true,
    useOriginalFileName: false
  }
)
const {modelValue, width, height, type} = toRefs(props)
const videoRef = ref()
const playing = ref(false)
const iconURL = computed(() => {
  if (props.type === FIELD_TYPE.IMAGE) {
    return props.modelValue
  } else if (props.type === FIELD_TYPE.AUDIO) {
    return audioFile
  } else {
    return ukFile
  }
})
const onUpload = () => {
  console.log('onUpload')
  uploadFileModalRef.value.showUploadDialogBox(type.value)
}
const onDelete = () => {
  emit('delete')
  emit('update:modelValue', null)
}
const playFile = (flag = true) => {
  if (flag) {
    const videos = document.getElementsByTagName('video')
    for (let i = 0; i < videos.length; i++) {
      videos[i].pause()
    }
    videoRef.value.play()
  }
  playing.value = true
}

const stopFile = (flag = true) => {
  if (flag) {
    videoRef.value.pause()
  }
  playing.value = false
}

const downFile = () => {
  console.log('downFile')
  props.modelValue && downloadUrl(props.modelValue as string, getFileName(props.modelValue as string) || 'download.file')
}
const emit = defineEmits<{
  (e: 'delete'): void
  (e: 'update:modelValue', value: string|null): void
}>()
watch(
  () => uploadUrl.value,
  () => console.log('uploadUrl', uploadUrl.value)
)
onMounted(() => {
})
</script>

<style lang="less" scoped>
.pre-file-cont {
  display: flex;
  justify-content: center;

  video {
    position: absolute;
  }

  .icons-box {
    margin-left: -20px;
    width: 100%;
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-10%);
    display: flex;
    justify-content: center;
    align-items: center;
  }

  &:hover {
    i {
      display: inline-block;
    }
  }
}
</style>