<template>
  <a-layout>
    <a-layout-sider
      :width="width"
      class="side-wrapper"
    >
      <div style="margin: 10px">
        <slot name="side"></slot>
      </div>
    </a-layout-sider>
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
const { width } = toRefs(props)
onMounted(() => {
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
</style>