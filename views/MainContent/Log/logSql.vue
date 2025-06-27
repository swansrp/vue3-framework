<template>
  <a-drawer
    :open="_show"
    destroy-on-close
    placement="right"
    size="large"
    title="SQL格式化"
    @close="emit('update:show', false)"
  >
    <template #extra>
      <a-button style="margin-right: 8px" @click="emit('update:show', false)">关闭</a-button>
      <a-button type="primary" @click="onCopy">复制</a-button>
    </template>
    <b-ace-editor v-model="data" height="100%" lang="sql" theme="chrome" />
  </a-drawer>
</template>

<script lang="ts" setup>

import { ref } from 'vue'
import BAceEditor from 'bin-editor-next'
import 'brace/ext/emmet'
import 'brace/ext/language_tools'
import 'brace/mode/sql'
import 'brace/snippets/sql'
import 'brace/theme/github.js'
import 'brace/theme/chrome.js'
import { message } from 'ant-design-vue'
import { format } from 'sql-formatter'

const props = withDefaults(
  defineProps<{
    show: boolean
    sql: string
  }>(),
  {
    show: false
  }
)
const emit = defineEmits<{
  (e: 'update:show', value: any): void
}>()
const { show, sql } = toRefs(props)
const _show = ref(show.value)
watch(
  () => show.value,
  () => _show.value = show.value
)

const onCopy = async () => {
  await navigator.clipboard.writeText(data.value)
  message.info('已复制')
  _show.value = false
}

const data = computed(() => {
  const textVa = sql.value
  // 获取带问号的SQL语句
  const statementStartIndex = textVa.indexOf('Preparing: ')
  let statementEndIndex = textVa.length
  for (let i = statementStartIndex; i < textVa.length; i++) {
    if (textVa[i] == "\n") {
      statementEndIndex = i
      break
    }
  }
  let statementStr = textVa.substring(statementStartIndex + "Preparing: ".length, statementEndIndex)
  //获取参数
  const parametersStartIndex = textVa.indexOf('Parameters: ')
  let parametersEndIndex = textVa.length - 1
  for (let i = parametersStartIndex; i < textVa.length; i++) {
    if (textVa[i] == "\n") {
      parametersEndIndex = i
      break
    }
  }
  let _parametersStr = textVa.substring(parametersStartIndex + "Parameters: ".length, parametersEndIndex)
  const parametersStr = _parametersStr.split(",")
  for (let i = 0; i < parametersStr.length; i++) {
    // 如果数据中带括号将使用其他逻辑
    const tempStr = parametersStr[i].substring(0, parametersStr[i].indexOf("("))
    // 获取括号中内容
    const typeStr = parametersStr[i].substring(parametersStr[i].indexOf("(") + 1, parametersStr[i].indexOf(")"))
    // 如果为字符类型
    if (typeStr == "String" || typeStr == "Timestamp") {
      statementStr = statementStr.replace("?", "'" + tempStr.trim() + "'")
    } else {
      // 数值类型
      statementStr = statementStr.replace("?", tempStr.trim())
    }
  }
  return format(statementStr, { language: 'mysql' })
})


onMounted(() => {
})
</script>

<style lang="less" scoped></style>