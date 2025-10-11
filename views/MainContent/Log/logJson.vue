<template>
  <a-drawer
    :open="_show"
    destroy-on-close
    placement="right"
    size="large"
    title="JSON格式化"
  >
    <template #extra>
      <a-button
        style="margin-right: 8px"
        @click="emit('update:show', false)"
      >
        关闭
      </a-button>
      <a-button
        type="primary"
        @click="onCopy"
      >
        复制
      </a-button>
    </template>
    <b-ace-editor
      v-model="data"
      height="100%"
      theme="chrome"
    />
  </a-drawer>
</template>

<script lang="ts" setup>

import BAceEditor from 'bin-editor-next'
import { ref } from 'vue'
import 'brace/ext/emmet'
import 'brace/ext/language_tools'
import 'brace/mode/json'
import 'brace/snippets/json'
import 'brace/theme/github.js'
import 'brace/theme/chrome.js'
import { message } from 'ant-design-vue'

const props = withDefaults(
  defineProps<{
    show: boolean
    data: string
  }>(),
  {
    show: false
  }
)
const emit = defineEmits<{
  (e: 'update:show', value: any): void
}>()
const { show, data } = toRefs(props)
const _show = ref(show.value)
watch(
  () => show.value,
  () => _show.value = show.value
)

watch(
  () => _show.value,
  () => emit('update:show', _show.value)
)

const onCopy = async () => {
  await navigator.clipboard.writeText(data.value)
  message.info('已复制')
  _show.value = false
}
onMounted(() => {
})
</script>

<style lang="less" scoped></style>