<template>
  <div class="pre-file-cont">
    <div v-if="type === FIELD_TYPE.IMAGE" style="position:relative;display: inline-block">
      <template v-if="_.$isNotEmpty(props.modelValue)">
        <div
          style="position: absolute; top: 0; right: 0;  z-index: 999; background-color: transparent;  line-height: 0">
          <a-dropdown>
            <PushpinFilled style="fontSize: 7px; color: rgba(255,0,0,0.5)" />
            <template #overlay>
              <a-menu>
                <a-menu-item v-if="downloadAble" key="1">
                  <div @click="downFile">下载</div>
                </a-menu-item>
                <a-menu-item v-if="uploadAble" key="2">
                  <div @click="onUpload">上传</div>
                </a-menu-item>
                <a-menu-item v-if="deleteAble" key="3">
                  <div @click="emit('delete')">删除</div>
                </a-menu-item>
              </a-menu>
            </template>
          </a-dropdown>
        </div>
        <a-image :height="height" :src="modelValue" :width="width" />
      </template>
    </div>
    <template v-else>
      <div style="position:relative;display: inline-block">
        <video
          v-if="type === FIELD_TYPE.AUDIO" ref="videoRef"
          :src="modelValue" height="0" preload width="0" @pause="stopFile(false)"
          @play="playFile(false)"></video>
        <div class="icons-box">
          <template v-if="type === FIELD_TYPE.AUDIO">
            <PauseOutlined
              v-if="playing" :style="{marginLeft: '10px',color:'rgb(255,255,255)', fontSize: '16px'}"
              @click.prevent.stop="stopFile" />
            <CaretRightOutlined
              v-else :style="{marginLeft: '10px',color:'rgb(255,255,255)', fontSize: '16px'}"
              @click.prevent.stop="playFile" />
          </template>
        </div>
        <div
          v-if="_.$isNotEmpty(props.modelValue)"
          style="position: absolute; top:24px; right: 0;  z-index: 999; background-color: transparent;  line-height: 0">
          <a-dropdown>
            <PushpinFilled style="fontSize: 7px; color: rgba(255,0,0,0.5)" />
            <template #overlay>
              <a-menu>
                <a-menu-item v-if="downloadAble" key="1">
                  <div @click="downFile">下载</div>
                </a-menu-item>
                <a-menu-item v-if="uploadAble" key="2">
                  <div @click="onUpload">上传</div>
                </a-menu-item>
                <a-menu-item v-if="deleteAble" key="3">
                  <div @click="emit('delete')">删除</div>
                </a-menu-item>
              </a-menu>
            </template>
          </a-dropdown>
        </div>
        <img
          :src="iconURL"
          :style="{width: isNaN(Number(width))?width:width+'px', height: isNaN(Number(height))?height:height+'px',objectFit:'cover'}"
          alt="file_icon_preview" />
      </div>
    </template>
    <upload-file
      v-if="uploadAble"
      ref="uploadFileModalRef"
      v-model:url="uploadUrl"
      :useOriginalFileName="useOriginalFileName"
      @after-confirm="emit('update:modelValue', uploadUrl)"
    />
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue'
import { downloadUrl } from '@/framework/network/request'
import { getFileName } from '@/framework/utils/file'
import { CaretRightOutlined, PauseOutlined, PushpinFilled } from '@ant-design/icons-vue'
import getImgUrl from '@/framework/assets/imgs/getImgUrl'
import { FIELD_TYPE } from '@/framework/components/common/Portal/type'

const uploadUrl = ref('')
const _ = getInstance()
const uploadFileModalRef = ref()
const audioFile = getImgUrl('file/audio_icon.png')
const ukFile = getImgUrl('file/unknown_file.png')
const props = withDefaults(
  defineProps<{
    type: FIELD_TYPE,
    modelValue: string | null,
    width?: string | number,
    height?: string | number,
    deleteAble?: boolean,
    uploadAble?: boolean,
    downloadAble?: boolean,
    useOriginalFileName?: boolean
  }>(),
  {
    type: FIELD_TYPE.IMAGE,
    width: 'auto',
    height: 'auto',
    deleteAble: false,
    uploadAble: false,
    downloadAble: true,
    useOriginalFileName: false
  }
)
const {width, height, type} = toRefs(props)
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
  props.modelValue &&
  downloadUrl(props.modelValue as string, getFileName(props.modelValue as string) || 'download.file')
}
const emit = defineEmits<{
  (e: 'delete'): void
  (e: 'update:modelValue', value: string): void
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

  video {
    position: absolute;
  }

  .icons-box {
    margin-left: -20px;
    width: 100%;
    height: 22px;
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(0%);
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