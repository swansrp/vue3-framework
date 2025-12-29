<template>
  <context-holder />
  <content-layout
    :width="250"
    height="100vh"
  >
    <template #side>
      <a-form
        :label-col="labelCol"
        :wrapper-col="wrapperCol"
        layout="vertical"
      >
        <a-form-item label="平台">
          <a-tree-select
            v-model:value="logStore.moduleId"
            :tree-data="platformOptions"
            multiple
            placeholder="选择平台"
            show-search
            style="width: 200px"
            tree-checkable
            @change="onChangeEnvTypeModule"
          />
        </a-form-item>
        <a-form-item label="环境">
          <a-radio-group
            v-model:value="logStore.envType"
            @change="onChangeEnvType"
          >
            <a-radio-button
              v-for="option in environmentOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </a-radio-button>
          </a-radio-group>
        </a-form-item>
        <a-form-item label="日志级别">
          <a-select
            v-model:value="logStore.logLevel"
            :options="levelOptions"
            mode="multiple"
            placeholder="选择级别"
            show-search
            style="width: 200px"
            @change="onChangelogLevel"
          />
        </a-form-item>
        <a-form-item label="除外词条">
          <log-filter
            :local-storage-key="BLOCK_LOG"
            title="除外词条"
            width="180"
            @change="getLog().then(() => scrollToBottom(logContainer, true))"
          />
        </a-form-item>
        <a-form-item label="过滤词条">
          <log-filter
            :local-storage-key="FILTER_LOG"
            title="过滤词条"
            width="180"
            @change="getLog().then(() => scrollToBottom(logContainer, true))"
          />
        </a-form-item>
      </a-form>
    </template>
    <template #content>
      <div class="search-bar">
        <!-- 第一行：模糊查询input -->
        <a-input
          v-model:value="searchText"
          placeholder="输入关键字进行搜索"
          style="width: 1500px;"
          @press-enter="getLog"
        />
        <!-- 第二行：时间查询和查询按钮 -->
        <div class="time-query-row">
          <!-- 时间查询 -->
          <a-range-picker
            v-model:value="logStore.timeRange"
            :locale="locale"
            :presets="[
              {label: '5分钟', value:[dayjs().subtract(5, 'minute'), dayjs()]},
              {label: '10分钟', value:[dayjs().subtract(10, 'minute'), dayjs()]},
              {label: '30分钟', value:[dayjs().subtract(30, 'minute'), dayjs()]},
              {label: '1小时', value:[dayjs().subtract(1, 'hour'), dayjs()]},
              {label: '2小时', value:[dayjs().subtract(2, 'hour'), dayjs()]},
              {label: '6小时', value:[dayjs().subtract(6, 'hour'), dayjs()]},
              {label: '12小时', value:[dayjs().subtract(12, 'hour'), dayjs()]},
              {label: '1天', value:[dayjs().subtract(1, 'day'), dayjs()]},
              {label: '2天', value:[dayjs().subtract(2, 'day'), dayjs()]},
              {label: '3天', value:[dayjs().subtract(3, 'day'), dayjs()]},
              {label: '5天', value:[dayjs().subtract(5, 'day'), dayjs()]},
              {label: '7天', value:[dayjs().subtract(7, 'day'), dayjs()]},
            ]"
            format="YYYY-MM-DD HH:mm:ss"
            show-time
            style="width: 400px;margin-left: 20px;"
            @change="onChangeTimeRange"
          />
          <!-- 查询按钮，跨两行 -->
          <a-button
            style="margin-left: 10px;"
            type="primary"
            @click="getLog()"
          >
            <template #icon>
              <SearchOutlined />
            </template>
          </a-button>
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
          <a-button
            style="margin-left: 10px;"
            type="primary"
            @click="showDownloadModal = true"
          >
            <template #icon>
              <DownloadOutlined />
            </template>
          </a-button>
          <!-- 实时刷新按钮 -->
          <a-dropdown>
            <template #overlay>
              <a-menu @click="handleMenuClick">
                <a-menu-item
                  v-for="(item, index) in intervalTimeLabel"
                  :key="index"
                >
                  {{ item }}
                </a-menu-item>
              </a-menu>
            </template>
            <a-button
              style="margin-left: 10px;"
              type="primary"
            >
              {{ intervalTimeLabel[intervalSelected] }}
              <DownOutlined />
            </a-button>
          </a-dropdown>
        </div>
      </div>
      <div
        ref="logContainer"
        class="log-container"
      >
        <a-spin
          :indicator="indicator"
          :spinning="loading"
          size="large"
          tip="加载中..."
          wrapper-class-name="spinClass"
        >
          <a-empty v-if="!loading && data.size === 0" />
          <div
            v-else
            class="log-list"
          >
            <div
              v-for="({expand, log}, index) in data.values()"
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
                    <a-menu-item
                      v-if="isNotEmpty(data)"
                      key="clear"
                    >
                      清空
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
                    <span
                      :class="[isNotEmpty(log.requestId) ? 'createTimeCss' : '', getLogLevelClass(log.logLevel)]"
                      @click="queryByRequestId(log)"
                    >{{ formatDate(log.createTime) }}</span>
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
                  <!-- 收起状态（expand=true）或 无法展开（expand=null）：显示原始内容 -->
                  <span
                    v-if="expand !== false"
                    :class="['contentCss', getLogLevelClass(log.logLevel)]"
                    v-html="strLF2HtmlLF(log.content)"
                  ></span>
                  <!-- 展开状态（expand=false）：将 Markdown 转换为 HTML 并显示 -->
                  <span
                    v-else
                    :class="['contentCss', getLogLevelClass(log.logLevel), 'markdown-content']"
                    v-html="marked.parse(log.content)"
                  ></span>
                </div>
              </a-dropdown>
            </div>
          </div>
        </a-spin>
      </div>
    </template>
  </content-layout>
  <log-context-draw
    v-model:show="showContextLog"
    :data="contextData"
    :expand-width="EXPAND_WIDTH"
  />
  <log-json-draw
    v-if="isNotEmpty(jsonData)"
    v-model:show="showJson"
    :data="jsonData"
  />
  <log-sql-draw
    v-model:show="showSql"
    :sql="sqlData"
  />
  <a-modal
    v-model:open="showDownloadModal"
    :confirm-loading="downloadLoading"
    title="下载日志"
    @ok="handleDownloadConfirm"
  >
    <a-form
      :label-col="{ span: 6 }"
      :wrapper-col="{ span: 18 }"
      layout="horizontal"
    >
      <a-form-item label="时间范围">
        <a-range-picker
          v-model:value="downloadTimeRange"
          :locale="locale"
          :presets="[
            {label: '5分钟', value:[dayjs().subtract(5, 'minute'), dayjs()]},
            {label: '10分钟', value:[dayjs().subtract(10, 'minute'), dayjs()]},
            {label: '30分钟', value:[dayjs().subtract(30, 'minute'), dayjs()]},
            {label: '1小时', value:[dayjs().subtract(1, 'hour'), dayjs()]},
            {label: '2小时', value:[dayjs().subtract(2, 'hour'), dayjs()]},
            {label: '6小时', value:[dayjs().subtract(6, 'hour'), dayjs()]},
            {label: '12小时', value:[dayjs().subtract(12, 'hour'), dayjs()]},
            {label: '1天', value:[dayjs().subtract(1, 'day'), dayjs()]},
            {label: '2天', value:[dayjs().subtract(2, 'day'), dayjs()]},
            {label: '3天', value:[dayjs().subtract(3, 'day'), dayjs()]},
            {label: '5天', value:[dayjs().subtract(5, 'day'), dayjs()]},
            {label: '7天', value:[dayjs().subtract(7, 'day'), dayjs()]},
          ]"
          format="YYYY-MM-DD HH:mm:ss"
          show-time
          style="width: 100%;"
        />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script lang="ts" setup>
import {
  ColumnHeightOutlined,
  DownloadOutlined,
  DownOutlined,
  LoadingOutlined,
  MinusOutlined,
  PlusOutlined,
  SearchOutlined,
  VerticalAlignMiddleOutlined
} from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import locale from 'ant-design-vue/es/date-picker/locale/zh_CN'
import dayjs from 'dayjs'
import { marked } from 'marked'
import { ref } from 'vue'

import LogContextDraw from './logContext.vue'
import LogFilter from './logFilter.vue'
import { LogInfo } from './logInfo'
import LogJsonDraw from './logJson.vue'
import LogSqlDraw from './logSql.vue'
import { expandLog, formatDate, getLogLevelClass, isJson, isSQL } from './logUtil'
import { useLogStore } from '../../../store/log'

import { queryLog } from '@/framework/apis/log/log'
import { LogBoardReq } from '@/framework/apis/log/logBoardReq'
import { dictStore, useTreeStore } from '@/framework/store/common'
import { BLOCK_LOG, FILTER_LOG } from '@/framework/store/log/constant'
import { isNotEmpty, localStorageMethods, scrollToBottom, strLF2HtmlLF } from '@/framework/utils/common'


const props = withDefaults(
  defineProps<{
    fetch?: Function,
    levelDict?: string,
    platformDict?: string
  }>(),
  {
    fetch: queryLog,
    levelDict: 'LOG_LEVEL_DICT',
    platformDict: 'LOG_MODULE_TREE_DICT'
  }
)

const [messageApi, contextHolder] = message.useMessage()
//控制日志滚动条到最下面
const logContainer = ref()
const logStore = useLogStore()
const indicator = h(LoadingOutlined, {
  style: {
    fontSize: '30px'
  },
  spin: true
})
const labelCol = { style: { width: '150px' } }
const wrapperCol = { span: 14 }
const environmentOptions = ref([
  { label: '预生产', value: 'pre' },
  { label: '生产', value: 'prod' }
])
const levelOptions = ref([])
const platformOptions = ref([])

const searchText = ref('')
const loading = ref(false)
const data = ref<Map<number, { expand: boolean | null, log: LogInfo }>>(new Map())
const EXPAND_WIDTH = 200
const expandAll = ref(false)

// 下载弹框相关状态
const showDownloadModal = ref(false)
const downloadTimeRange = ref<[Dayjs | null, Dayjs | null]>([null, null])
const downloadLoading = ref(false)

// 配置 marked 支持 GFM 表格
marked.setOptions({
  breaks: true,
  gfm: true,
  tables: true
})

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

const downloadLog = async () => {
  try {
    downloadLoading.value = true
    let req: LogBoardReq = {
      ...logStore.getAllParams,
      content: searchText.value,
      logLevel: undefined,
      startAt: downloadTimeRange.value[0]?.format('YYYY-MM-DD HH:mm:ss.SSS'),
      endAt: downloadTimeRange.value[1]?.format('YYYY-MM-DD HH:mm:ss.SSS')
    }

    const resp = await props.fetch(req)
    if (resp?.payload && resp.payload.length > 0) {
      // 生成日志内容
      let logContent = ''
      for (let index = resp.payload.length - 1; index >= 0; index--) {
        const log = resp.payload[index]
        // 按照logback格式: %d %-5level[%thread][%X{IP}][%X{REQUEST_ID}][%X{logToken}]%logger{15}|(%file:%line)%m%n
        const logLevel = (log.logLevel || '').padEnd(5, ' ')
        const threadName = log.threadName || ''
        const requestIp = log.requestIp || ''
        const requestId = log.requestId || ''
        const traceId = log.traceId || ''
        const methodName = log.methodName || ''
        const content = log.content || ''
        
        logContent += `${formatDate(log.createTime)} ${logLevel}[${threadName}][${requestIp}][${requestId}][${traceId}]|(${methodName})${content}\n`
      }

      // 生成文件名
      const moduleIds = logStore.moduleId.join('_') || 'all'
      const startTime = downloadTimeRange.value[0]!.format('YYYYMMDDHHmmss')
      const endTime = downloadTimeRange.value[1]!.format('YYYYMMDDHHmmss')
      const fileName = `log_${logStore.envType}_${moduleIds}_${startTime}_${endTime}.txt`

      // 创建下载
      const blob = new Blob([logContent], { type: 'text/plain;charset=utf-8' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      messageApi.success(`日志已下载: ${fileName}`)
      showDownloadModal.value = false
    } else {
      messageApi.warning('没有找到日志数据')
    }
  } catch (error) {
    console.error('下载日志失败:', error)
    messageApi.error('下载日志失败')
  } finally {
    downloadLoading.value = false
  }
}

const handleDownloadConfirm = () => {
  // 检查是否选择了时间范围
  if (!downloadTimeRange.value[0] || !downloadTimeRange.value[1]) {
    messageApi.warning('请选择时间范围')
    return
  }
  downloadLog()
}
// 日志上下文
const contextData = ref<Map<number, { expand: boolean | null, log: LogInfo }>>(new Map())
const showContextLog = ref(false)
// json格式化
const showJson = ref(false)
const jsonData = ref('')
// sql格式化
const showSql = ref(false)
const sqlData = ref('')

const queryByRequestId = (log: any) => {
  if (isNotEmpty(log.requestId)) {
    const requestId = log.requestId
    contextData.value.clear()
    let req: LogBoardReq = {
      ...logStore.getAllParams,
      requestId: requestId,
      startAt: undefined,
      endAt: undefined,
      logLevel: []
    }
    props.fetch(req).then((resp: any) => {
      for (let index = resp.payload.length - 1; index >= 0; index--) {
        const log = resp.payload[index]
        contextData.value.set(log.logId, { expand: log.content.length > EXPAND_WIDTH ? true : null, log })
      }
      showContextLog.value = true
    })
  }
}
const handleLogData = (resp: any, refresh = false) => {
  if (!refresh) {
    data.value.clear()
  }
  if(resp.payload?.length > 5000) {
    messageApi.error({ content: () => '日志过多,无法解析' })
    return
  }
  const blockLog = JSON.parse(localStorageMethods.getLocalStorage(BLOCK_LOG, JSON.stringify([])))
  const filterLog = JSON.parse(localStorageMethods.getLocalStorage(FILTER_LOG, JSON.stringify([])))
  for (let index = resp.payload.length - 1; index >= 0; index--) {
    const log = resp.payload[index]
    if (!data.value.has(log.logId)) {
      const block = blockLog.filter((tag: any) => log.content.indexOf(tag) !== -1)
      if (block.length === 0) {
        const filter = filterLog.filter((tag: any) => log.content.indexOf(tag) !== -1)
        if (filterLog.length === 0 || filter.length !== 0) {
          data.value.set(log.logId, { expand: log.content.length > EXPAND_WIDTH ? true : null, log })
        }
      }
    }
  }
}
const getLog = async (refresh = false) => {
  loading.value = !refresh
  let req: LogBoardReq = {
    ...logStore.getAllParams,
    content: searchText.value
  }
  if (refresh) {
    const array = [...data.value.values()]
    const info = array[array.length - 1]
    const lastLog = info?.log
    if (lastLog) {
      req.startAt = dayjs(lastLog.createTime).format('YYYY-MM-DD HH:mm:ss.SSS')
    }
    req.endAt = dayjs().format('YYYY-MM-DD HH:mm:ss.SSS')
  }
  const forceScrollToBottom = (data.value.size === 0)
  await props.fetch(req).then((resp: any) => handleLogData(resp, refresh)).finally(() => {
    loading.value = false
    scrollToBottom(logContainer, forceScrollToBottom)
  })
}
const onChangeEnvTypeModule = () => {
  logStore.setModuleId(logStore.moduleId)
  getLog().then(() => scrollToBottom(logContainer, true))
}
const onChangeEnvType = () => {
  logStore.setEnvType(logStore.envType)
  getLog().then(() => scrollToBottom(logContainer, true))
}
const onChangelogLevel = () => {
  logStore.setLogLevel(logStore.logLevel)
  getLog().then(() => scrollToBottom(logContainer, true))
}
const onChangeTimeRange = () => {
  if(logStore.timeRange[0] != null || logStore.timeRange[1] != null) {
    intervalSelected.value = 0
    if(refreshInterval) {
      clearInterval(refreshInterval)
      refreshInterval = null
    }
  } else {
    intervalSelected.value = 3
  }
  getLog().then(() => scrollToBottom(logContainer, true))
}
// 添加状态变量控制实时刷新
const intervalSelected = ref(3)
const intervalTimeLabel = ref(['停止', '1s', '5s', '10s', '30s', '1mins', '5mins', '10mins'])
const intervalTimeValue = [0, 1, 5, 10, 30, 60, 300, 600]
let refreshInterval: ReturnType<typeof setInterval> | null = null // 用于存储定时器的引用
const handleMenuClick = (arg: any) => {
  intervalSelected.value = arg.key
}

// 右键功能
const handleContextMenuClick = (arg: any, log: LogInfo) => {
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
    case 'clear':
      if(data.value.size > 0) {
        const array = [...data.value.values()]
        const lastLog = array[array.length - 1]?.log
        logStore.setTimeRange([dayjs(lastLog.createTime), null])
        data.value.clear()
      }
      break
    default:
      break
  }
}
watch(
  () => intervalSelected.value,
  () => {
    if (refreshInterval) {
      clearInterval(refreshInterval)
      refreshInterval = null
    }
    if (intervalSelected.value !== 0) {
      refreshInterval = setInterval(() => {
        getLog(true) // 每秒钟执行一次 fetchLogs
      }, intervalTimeValue[intervalSelected.value] * 1000)
    }
  }
)

const dict = dictStore()
const treeDict = useTreeStore()

onMounted(() => {
  getLog(false).then(() => {
    scrollToBottom(logContainer, true)
    if (intervalSelected.value !== 0) {
      refreshInterval = setInterval(() => {
        getLog(true) // 每秒钟执行一次 fetchLogs
      }, intervalTimeValue[intervalSelected.value] * 1000)
    }
  })
  dict.getDict(props.levelDict).then((data: any) => levelOptions.value = data)
  treeDict.getTree(props.platformDict).then((data: any) => platformOptions.value = data)
})
// 在组件销毁时清除定时器
onBeforeUnmount(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }
})
</script>
<style lang="less" scoped src="./css/logView.less"></style>