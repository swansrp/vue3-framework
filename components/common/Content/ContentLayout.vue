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
    <div id="resize"></div>
    <a-layout-content
      style="margin-left: 10px; margin-right: 10px">
      <slot name="content"></slot>
    </a-layout-content>
  </a-layout>
</template>

<script lang="ts" setup>
const props = withDefaults(
  defineProps<{
    width?: string
  }>(),
  {
    width: '15%'
  }
)
const _width = ref(props.width)
const widthValue = ref(0)
const dragControllerDiv = () => {
  const resize = document.getElementById("resize")
  const side = document.getElementById("side")
  widthValue.value = side?.offsetLeft || 0
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
        widthValue.value += moveLen
        _width.value = widthValue.value + 'px'
      };
      document.onmouseup = () => {
        // 颜色恢复
        resize.style.background = ""
        document.onmousemove = null
        document.onmouseup = null
      }
      return false
    }
  }
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