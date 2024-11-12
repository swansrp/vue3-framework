<template>
  <a-layout>
    <a-layout-sider
      id="side"
      :width="_width"
      class="side-wrapper"
    >
      <div style="margin: 10px">
        <slot name="side"></slot>
      </div>
    </a-layout-sider>
    <div id="resize">
      <a-button
        v-if="collapsed"
        style="position: relative;left: -15px; top: 40vh; bottom: 0; z-index: 1000" type="link"
        @click="toggleCollapsed">
        <RightOutlined style="color: gray" />
      </a-button>
      <a-button
        v-else
        style="position: relative;left: -25px; top: 40vh; bottom: 0; z-index: 1000" type="link"
        @click="toggleCollapsed">
        <LeftOutlined style="color: gray" />
      </a-button>
    </div>
    <a-layout-content
      style="margin-left: 10px; margin-right: 10px">
      <slot name="content"></slot>
    </a-layout-content>
  </a-layout>
</template>

<script lang="ts" setup>
import { LeftOutlined, RightOutlined } from '@ant-design/icons-vue'
import bus from '@/framework/mitt'
import { Ref } from 'vue'
const props = withDefaults(
  defineProps<{
    width?: number
  }>(),
  {
    width: 200
  }
)
const emit = defineEmits<{
  (e: 'resize'): void
}>()
const _width:Ref<string|number> = ref(props.width)
const widthValue:Ref<number> = ref(props.width)
const dragControllerDiv = () => {
  const resize = document.getElementById("resize")
  if (resize) {
    let startX = resize.offsetLeft
    resize.onmousedown = () => {
      // 颜色改变提醒
      resize.style.background = "#818181"
      document.onmousemove = (e) => {
        // 计算并应用位移量
        let endX = e.clientX
        let moveLen = endX - startX
        startX = endX
        widthValue.value = Number(widthValue.value) + moveLen
        _width.value = widthValue.value
        notifyResize()
      };
      document.onmouseup = () => {
        // 颜色恢复
        resize.style.background = ""
        document.onmousemove = null
        document.onmouseup = null
        notifyResize()
      }
      return false
    }
  }
}
const toggleCollapsed = () => {
  if(collapsed.value) {
    _width.value = widthValue.value
  } else {
    _width.value = '0'
  }
  notifyResize()
  collapsed.value = !collapsed.value
}
const collapsed = ref(false)
const notifyResize = () => {
  emit('resize')
  bus.emit('portal:table:resize')
}
onMounted(() => {
  dragControllerDiv()
})
</script>

<style lang="less" scoped>
.side-wrapper {
  background-color: white;
  box-sizing: border-box;
  overflow: auto;
  height: calc(100vh - 150px);
  box-shadow: 0 4px 10px 0 rgba(69, 89, 120, 0.5);
  margin: 10px 15px;
}

#resize {
  background: rgba(69, 89, 120, 0.05);
  width: 5px;
  height: calc(100vh - 130px);
  cursor: w-resize;
}
</style>