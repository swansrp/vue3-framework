<template>
  <editor
    :id="tinymceId"
    v-model="myValue"
    api-key="hmop6n54x4a23otrfzloqevvscda12c1tv52r1fuyz4c5o6n"
    :init="init"
    :disabled="disabled"
  />
</template>


<script setup lang="ts">
//JS部分
//在js中引入所需的主题和组件
import tinymce from 'tinymce/tinymce'
import 'tinymce/skins/content/default/content.css'
import Editor from '@tinymce/tinymce-vue'
import 'tinymce/themes/silver'
import 'tinymce/themes/silver/theme'
import 'tinymce/icons/default' //引入编辑器图标icon，不引入则不显示对应图标
import 'tinymce/models/dom' // 这里是个坑 一定要引入

//在TinyMce.vue中接着引入相关插件
import 'tinymce/icons/default/icons'
import 'tinymce/plugins/image' // 插入上传图片插件
import 'tinymce/plugins/media' // 插入视频插件
import 'tinymce/plugins/table' // 插入表格插件
import 'tinymce/plugins/lists' // 列表插件
import 'tinymce/plugins/advlist' // 高级列表插件
import 'tinymce/plugins/wordcount' // 字数统计插件
import 'tinymce/plugins/code' // 源码
import 'tinymce/plugins/fullscreen' //全屏

//接下来定义编辑器所需要的插件数据
import { reactive, ref } from 'vue'

3
import { uploadFile } from '@/framework/apis/common/common'
import { UPLOAD_FILE_TYPE } from '@/framework/components/common/Portal/type'
const emits = defineEmits(['getContent'])
//这里我选择将数据定义在props里面，方便在不同的页面也可以配置出不同的编辑器，当然也可以直接在组件中直接定义
const props = defineProps({
  value: {
    type: String,
    default: () => {
      return ''
    },
  },
  baseUrl: {
    type: String,
    default: '',
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  plugins: {
    type: [String, Array],
    default: 'lists advlist table image',
  },//必填
  toolbar: {
    type: [String, Array],
    default:
      'bold italic underline | formatselect | fontselect | fontsizeselect | forecolor backcolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link image table code | undo redo | removeformat',
  },
})
//用于接收外部传递进来的富文本
const myValue = ref(props.value)
const tinymceId = ref('vue-tinymce-' + +new Date() + ((Math.random() * 1000).toFixed(0) + ''))
// 这个函数必须在这里定义，因为import.meta.url指向当前文件所在的路径
const getAssetsFile = (url: string) => new URL(`./${url}`, import.meta.url).href
//定义一个对象 init初始化
const init = reactive({
  selector: '#' + tinymceId.value, //富文本编辑器的id,
  relative_urls : true,
  license_key: 'gpl',
  language_url: getAssetsFile('langs/zh_CN.js'), // 语言包的路径，具体路径看自己的项目，文档后面附上中文js文件
  language: 'zh_CN', //语言
  skin_url: new URL(`./skins/ui/oxide`, import.meta.url).href,
  width: '100%', //编辑器宽度：100%自适应
  height: 600, //编辑器高度
  branding: false, //是否禁用"Powered by TinyMCE"
  menubar: true, //顶部菜单栏显示
  image_dimensions: false, //去除宽高属性
  plugins: props.plugins,  //这里的数据是在props里面就定义好了的
  toolbar: props.toolbar, //这里的数据是在props里面就定义好了的
  font_formats: 'Arial=arial,helvetica,sans-serif; 宋体=SimSun; 微软雅黑=Microsoft Yahei; Impact=impact,chicago;', //字体
  fontsize_formats: '11px 12px 14px 16px 18px 24px 36px 48px 64px 72px', //文字大小
  // paste_convert_word_fake_lists: false, // 插入word文档需要该属性
  paste_webkit_styles: 'all',
  paste_merge_formats: true,
  nonbreaking_force_tab: false,
  paste_auto_cleanup_on_paste: false,
  file_picker_types: 'file',
  content_css: new URL(`./skins/content/default/content.css`, import.meta.url).href,
  //图片上传
  images_upload_handler: (blobInfo: any, progress: any) => new Promise((resolve, reject) => {
    const file = blobInfo.blob()
    
    // 限制图片大小：5MB
    if (file.size / 1024 / 1024 > 5) {
      reject({ message: '上传失败，图片大小请控制在 5M 以内', remove: true })
      return
    }

    // 构造FormData
    const formData = new FormData()
    formData.append('file', file, blobInfo.filename())

    // 使用项目统一的uploadFile函数上传
    uploadFile(
      formData,
      (progressEvent: any) => {
        // 计算上传进度
        if (progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          progress(percent)
        }
      },
      UPLOAD_FILE_TYPE.IMG, // 文件类型：图片
      'wiki/images'  // 存储文件夹
    )
      .then((res: any) => {
        if (res.payload && res.payload.url) {
          // 返回图片URL给编辑器
          resolve(res.payload.url)
        } else {
          reject('上传失败，未返回图片地址')
        }
      })
      .catch((error: any) => {
        console.error('图片上传失败:', error)
        reject('图片上传失败，请稍后重试')
      })
  }),

  // 文件选择器（用于插入图片对话框的“浏览”按钮）
  file_picker_callback: (callback: Function, _value: any, meta: any) => {
    // 仅处理图片类型
    if (meta.filetype === 'image') {
      // 创建一个隐藏的文件输入框
      const input = document.createElement('input')
      input.setAttribute('type', 'file')
      input.setAttribute('accept', 'image/*')

      input.onchange = function() {
        const file = (input as any).files[0]
        if (!file) return

        // 限制图片大小
        if (file.size / 1024 / 1024 > 5) {
          alert('图片大小请控制在 5M 以内')
          return
        }

        const formData = new FormData()
        formData.append('file', file)

        // 上传图片
        uploadFile(
          formData,
          () => {}, // 进度回调
          UPLOAD_FILE_TYPE.IMG,
          'wiki/images'
        )
          .then((res: any) => {
            if (res.payload && res.payload.url) {
              // 调用callback返回图片URL
              callback(res.payload.url, { alt: file.name })
            }
          })
          .catch((error: any) => {
            console.error('图片上传失败:', error)
            alert('图片上传失败，请稍后重试')
          })
      }

      // 触发文件选择
      input.click()
    }
  }
})

//监听外部传递进来的的数据变化
watch(
  () => props.value,
  () => {
    myValue.value = props.value
    emits('getContent', myValue.value)
  }
)
//监听富文本中的数据变化
watch(() => myValue.value, () => emits('getContent', myValue.value))
//在onMounted中初始化编辑器
onMounted(() => tinymce.init({}))
</script>

