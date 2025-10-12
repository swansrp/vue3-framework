<template>
  <context-holder />
  <a-drawer
    :open="_show"
    destroy-on-close
    height="100vh"
    placement="bottom"
    title="上下文"
    @close="emit('update:show', false)"
  >
    <template #extra>
      <a-checkbox
        v-model:checked="state.checkAll"
        :indeterminate="state.indeterminate"
        @change="onCheckAllChange"
      >
        ALL
      </a-checkbox>
      <a-checkbox-group
        v-model:value="state.checkedList"
        :options="plainOptions"
      />
      <a-button
        style="margin-left: 10px;"
        type="primary"
        @click="expandAllLog"
      >
        <template #icon>
          <ColumnHeightOutlined v-if="!expandAll" />
          <VerticalAlignMiddleOutlined v-if="expandAll" />
        </template>
      </a-button>
    </template>
    <div
      ref="logContainer"
      class="log-container"
    >
      <div class="log-list">
        <div
          v-for="({expand, log}, index) in dataSource"
          :key="index"
          :style="{height: expand === false ? 'auto' : '30px'}"
          class="log-item tip"
        >
          <a-dropdown :trigger="['contextmenu']">
            <template #overlay>
              <a-menu @click="handleContextMenuClick($event, log)">
                <a-menu-item key="json">
                  JSON格式化
                </a-menu-item>
                <a-menu-item
                  v-if="isSQL(log.content)"
                  key="sql"
                >
                  SQL格式化
                </a-menu-item>
              </a-menu>
            </template>
            <div>
              <a-tooltip
                :overlay-style="{ maxWidth: '500px'}"
                :title="`${log.className}-${log.methodName}`"
                color="#777"
                placement="topLeft"
              >
                <span :class="[getLogLevelClass(log.logLevel)]">{{ formatDate(log.createTime) }}</span>
              </a-tooltip>
              <a-button
                size="small"
                type="text"
                @click="expandLog(data.get(log.logId))"
              >
                <template #icon>
                  <PlusOutlined
                    v-if="expand"
                    style="color: blue"
                  />
                  <MinusOutlined
                    v-else
                    :style="{color: expand === null ? 'grey' : 'blue'}"
                  />
                </template>
              </a-button>
              <span
                v-if="expand"
                :class="['contentCss', getLogLevelClass(log.logLevel)]"
                v-html="log.content.substring(0, expandWidth)"
              ></span>
              <span
                v-else
                :class="['contentCss', getLogLevelClass(log.logLevel)]"
                v-html="log.content"
              ></span>
            </div>
          </a-dropdown>
        </div>
      </div>
    </div>
  </a-drawer>
  <log-json-draw
    v-if="isNotEmpty(jsonData)"
    v-model:show="showJson"
    :data="jsonData"
  />
  <log-sql-draw
    v-model:show="showSql"
    :sql="sqlData"
  />
</template>

<script lang="ts" setup>
import { ColumnHeightOutlined, MinusOutlined, PlusOutlined, VerticalAlignMiddleOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { ref } from 'vue'

import LogJsonDraw from './logJson.vue'
import LogSqlDraw from './logSql.vue'
import { expandLog, formatDate, getLogLevelClass, isJson, isSQL } from './logUtil'

import { isNotEmpty, scrollToBottom } from '@/framework/utils/common'

const [messageApi, contextHolder] = message.useMessage()
const logContainer = ref()
const props = withDefaults(
  defineProps<{
    show: boolean
    data: any
    expandWidth: number
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
const dataSource = computed(() => {
  const log = [] as Array<any>
  data.value.forEach((value: any) => {
    state.checkedList.indexOf(value.log.logLevel) !== -1 ? log.push(value) : log.length
  })
  return log
})
watch(
  () => show.value,
  () => _show.value = show.value
)
// json格式化
const showJson = ref(false)
const jsonData = ref('')
// sql格式化
const showSql = ref(false)
const sqlData = ref('')
// 展开
const expandAll = ref(false)
const expandAllLog = () => {
  data.value.forEach((value: any) => {
    if (value.expand !== null) {
      value.expand = expandAll.value
    }
  })
  expandAll.value = !expandAll.value
  nextTick(() => {
    scrollToBottom(logContainer, true)
  })
}
// 右键功能
const handleContextMenuClick = (arg: any, log: any) => {
  switch (arg.key) {
    case 'json':
      const jsonContent = isJson(log.content)
      if (jsonContent) {
        showJson.value = true
        jsonData.value = jsonContent
      } else {
        messageApi.error('不包含json字符串')
      }
      break
    case 'sql':
      sqlData.value = ''
      const info = data.value.get(log.logId)
      if (info) {
        for (let [_, value] of data.value) {
          if (value.log.threadName === info.log.threadName &&
            value.log.requestId === info.log.requestId &&
            value.log.logSeq > info.log.logSeq) {
            sqlData.value = info.log.content + '\n' + value.log.content
            showSql.value = true
            break
          }
        }
        if (isEmpty(sqlData.value)) {
          messageApi.error('没找到SQL日志')
        }
      } else {
        messageApi.error('不包含SQL字符串')
      }
      break
    default:
      break
  }
}
// 日志等级过滤
const plainOptions = ['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL']
const state = reactive({
  indeterminate: false,
  checkAll: true,
  checkedList: ['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL']
})
const onCheckAllChange = (e: any) => {
  Object.assign(state, {
    checkedList: e.target.checked ? plainOptions : [],
    indeterminate: false
  })
}
watch(
  () => state.checkedList,
  val => {
    state.indeterminate = !!val.length && val.length < plainOptions.length
    state.checkAll = val.length === plainOptions.length
  }
)
onMounted(() => {
})
</script>

<style lang="less" scoped src="./css/logView.less"></style>