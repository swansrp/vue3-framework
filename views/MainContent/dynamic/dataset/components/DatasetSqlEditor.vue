<template>
  <div class="dataset-sql-editor">
    <a-form
      ref="formRef"
      class="base-form"
      :model="formState"
      layout="inline"
    >
      <a-form-item
        label="名称"
        name="datasetNamePrefix"
        :rules="[{ required: true, message: '请输入数据集名称' }]"
      >
        <a-input
          v-model:value="formState.datasetNamePrefix"
          placeholder="数据集名称"
          style="width: 220px"
        >
          <template #suffix>
            <span style="color: #999;">Dataset</span>
          </template>
        </a-input>
      </a-form-item>
      <a-form-item
        label="数据源"
        name="dataSource"
      >
        <a-input
          v-model:value="formState.dataSource"
          placeholder="默认: master"
          style="width: 140px"
        />
      </a-form-item>
      <a-form-item
        class="remark-item"
        label="备注"
        name="remark"
        :rules="[{ required: true, message: '请输入备注' }]"
      >
        <a-input
          v-model:value="formState.remark"
          placeholder="建议格式：分类-描述（用于左侧分组）"
        />
      </a-form-item>
    </a-form>

    <div class="editor-toolbar">
      <a-space>
        <a-button
          type="primary"
          :loading="confirmLoading"
          @click="handleSave"
        >
          <template #icon>
            <SaveOutlined />
          </template>
          保存
        </a-button>
        <a-button
          :loading="previewLoading"
          @click="handlePreview"
        >
          预览解析结果
        </a-button>
      </a-space>
      <a-space>
        <!-- SQL语法校验状态（防抖自动校验，与保存/预览同一后端解析器） -->
        <span
          v-if="syntaxStatus === 'checking'"
          class="syntax-status checking"
        >
          <LoadingOutlined /> 语法校验中...
        </span>
        <span
          v-else-if="syntaxStatus === 'valid'"
          class="syntax-status valid"
        >
          <CheckCircleFilled /> 语法正确
        </span>
        <a-tooltip
          v-else-if="syntaxStatus === 'invalid'"
          :title="syntaxError"
          placement="bottom"
        >
          <span class="syntax-status invalid">
            <CloseCircleFilled /> 语法错误
          </span>
        </a-tooltip>
        <a-button
          size="small"
          @click="handleFormatSql"
        >
          格式化SQL
        </a-button>
        <a-button
          size="small"
          @click="copySql"
        >
          复制SQL
        </a-button>
        <a-button
          size="small"
          type="link"
          @click="exampleModalVisible = true"
        >
          SQL示例
        </a-button>
      </a-space>
    </div>

    <div class="editor-wrapper">
      <b-ace-editor
        :key="editorKey"
        v-model="formState.sql"
        height="100%"
        lang="sql"
        theme="chrome"
        :font-size="16"
        :options="{ scrollPastEnd: 0.5 }"
      />
      <!-- 加载遮罩：不隐藏编辑器容器，避免ace以0高度初始化导致渲染裁剪 -->
      <div
        v-if="sqlLoading"
        class="editor-loading-mask"
      >
        <a-spin tip="SQL加载中..." />
      </div>
    </div>

    <!-- 解析结果预览抽屉 -->
    <a-drawer
      v-model:open="previewDrawerVisible"
      title="解析结果预览"
      width="600"
    >
      <template v-if="previewResult">
        <a-descriptions
          title="Dataset表配置"
          :column="1"
          bordered
          size="small"
        >
          <a-descriptions-item
            v-for="(table, index) in previewResult.tables"
            :key="index"
            :label="`表${index + 1}`"
          >
            <a-space
              direction="vertical"
              size="small"
              style="width: 100%;"
            >
              <div><strong>表名:</strong> {{ table.tableSql }}</div>
              <div><strong>别名:</strong> {{ table.tableAlias }}</div>
              <div v-if="table.joinType">
                <strong>JOIN类型:</strong> {{ joinTypeMap[table.joinType] || table.joinType }}
              </div>
              <div
                v-if="table.joinCondition"
                style="width: 100%;"
              >
                <strong>JOIN条件:</strong>
                <code class="join-condition">{{ table.joinCondition }}</code>
              </div>
            </a-space>
          </a-descriptions-item>
        </a-descriptions>

        <a-descriptions
          title="列配置"
          :column="1"
          bordered
          size="small"
          style="margin-top: 16px"
        >
          <a-descriptions-item
            v-for="(col, index) in previewResult.columns"
            :key="index"
            :label="`列${index + 1}`"
          >
            <a-space>
              <a-tag>{{ col.columnSql }}</a-tag>
              <span>→</span>
              <a-tag color="blue">
                {{ col.columnAlias }}
              </a-tag>
              <a-tag
                v-if="col.isAggregate === 'Y' || col.isAggregate === '1'"
                color="orange"
              >
                聚合
              </a-tag>
            </a-space>
          </a-descriptions-item>
        </a-descriptions>
      </template>
    </a-drawer>

    <!-- SQL示例弹窗 -->
    <a-modal
      v-model:open="exampleModalVisible"
      title="SQL示例"
      width="800px"
      :footer="null"
    >
      <a-tabs>
        <a-tab-pane
          key="simple"
          tab="简单查询"
        >
          <pre class="sql-example">{{ sqlExamples.simple }}</pre>
        </a-tab-pane>
        <a-tab-pane
          key="join"
          tab="多表JOIN"
        >
          <pre class="sql-example">{{ sqlExamples.join }}</pre>
        </a-tab-pane>
        <a-tab-pane
          key="aggregate"
          tab="聚合函数"
        >
          <pre class="sql-example">{{ sqlExamples.aggregate }}</pre>
        </a-tab-pane>
      </a-tabs>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { CheckCircleFilled, CloseCircleFilled, LoadingOutlined, SaveOutlined } from '@ant-design/icons-vue'
import type { FormInstance } from 'ant-design-vue'
import { message } from 'ant-design-vue'
// @ts-ignore
import BAceEditor from 'bin-editor-next'
import 'brace/ext/language_tools'
import 'brace/mode/sql'
import 'brace/snippets/sql'
import 'brace/theme/chrome.js'
import { format } from 'sql-formatter'
import { onBeforeUnmount, reactive, ref, watch } from 'vue'

import type { DatasetInfo, DatasetTableInfo, DatasetColumnInfo } from '../types'

import { getSql, parseSql, parseSqlAndSave } from '@/framework/views/MainContent/dynamic/apis/datasetConfigController'

const props = defineProps<{
  // null 表示新建模式
  dataset?: DatasetInfo | null
}>()

const emit = defineEmits<{
  (e: 'saved', datasetId: number | undefined): void
}>()

const formRef = ref<FormInstance>()
const confirmLoading = ref(false)
const previewLoading = ref(false)
const sqlLoading = ref(false)
const previewDrawerVisible = ref(false)
const exampleModalVisible = ref(false)
const previewResult = ref<{ tables: DatasetTableInfo[], columns: DatasetColumnInfo[] } | null>(null)

// b-ace-editor 有时不会响应外部异步赋值，这里用 key 强制重新渲染
const editorKey = ref(0)
// 避免快速切换dataset时，旧请求回写覆盖新内容
const sqlLoadSeq = ref(0)

const joinTypeMap: Record<string, string> = {
  '0': '内联 (INNER)',
  '1': '左联 (LEFT)',
  '2': '右联 (RIGHT)',
  '3': '全联 (FULL)',
}

const formState = reactive({
  datasetNamePrefix: '',
  remark: '',
  dataSource: 'master',
  sql: '',
})

// SQL语法自动校验（复用后端 parseSql，与保存/预览同一解析器）
const syntaxStatus = ref<'idle' | 'checking' | 'valid' | 'invalid'>('idle')
const syntaxError = ref('')
const syntaxCheckSeq = ref(0)
let syntaxTimer: ReturnType<typeof setTimeout> | null = null

const checkSyntax = async () => {
  const curSeq = ++syntaxCheckSeq.value
  const sql = formState.sql?.trim()
  if (!sql) {
    syntaxStatus.value = 'idle'
    return
  }
  syntaxStatus.value = 'checking'
  try {
    const res = await parseSql({
      sql,
      dataSource: formState.dataSource
    } as any, false, false, false)
    if (curSeq !== syntaxCheckSeq.value) return
    if (res.status?.code === 0) {
      syntaxStatus.value = 'valid'
      syntaxError.value = ''
    } else {
      syntaxStatus.value = 'invalid'
      syntaxError.value = res.status?.msg || 'SQL解析失败'
    }
  } catch (error: any) {
    if (curSeq !== syntaxCheckSeq.value) return
    syntaxStatus.value = 'invalid'
    syntaxError.value = error?.message || 'SQL解析失败'
  }
}

// 输入停止1秒后自动校验
watch(() => formState.sql, () => {
  if (syntaxTimer) clearTimeout(syntaxTimer)
  if (!formState.sql?.trim()) {
    syntaxCheckSeq.value++
    syntaxStatus.value = 'idle'
    return
  }
  syntaxTimer = setTimeout(checkSyntax, 1000)
})

onBeforeUnmount(() => {
  if (syntaxTimer) clearTimeout(syntaxTimer)
})

const sqlExamples = {
  simple: `-- 简单查询示例（--为手动设置字段中文备注）
SELECT 
  id, -- 主键ID
  order_no AS orderNo, -- 订单编号
  amount, -- 订单金额
  status -- 状态
FROM t_order
WHERE status = 1`,

  join: `-- 多表JOIN示例（--为手动设置字段中文备注）
SELECT 
  o.id, -- 主键ID
  o.order_no AS orderNo, -- 订单编号
  o.amount, --订单金额
  c.name AS customerName, -- 客户名称
  c.phone AS customerPhone -- 客户电话
FROM t_order o
LEFT JOIN t_customer c ON o.customer_id = c.id
WHERE o.status = 1`,

  aggregate: `-- 聚合函数示例（--为手动设置字段中文备注）
SELECT 
  o.customer_id AS customerId, -- 客户ID
  c.name AS customerName, -- 客户名称
  COUNT(o.id) AS orderCount, -- 订单数量
  SUM(o.amount) AS totalAmount, -- 订单总金额
  AVG(o.amount) AS avgAmount, -- 平均订单金额
  MAX(o.created_at) AS lastOrderTime -- 最后下单时间
FROM t_order o
LEFT JOIN t_customer c ON o.customer_id = c.id
WHERE o.status = 1
GROUP BY o.customer_id, c.name`
}

// 安全格式化：语法异常时原样返回，不阻断回显
const SQL_FORMAT_OPTIONS = {
  language: 'mysql',
  tabWidth: 2,
  keywordCase: 'upper',
} as const

const formatSqlText = (sql: string): string => {
  try {
    return format(sql, SQL_FORMAT_OPTIONS)
  } catch (error) {
    console.warn('SQL自动格式化失败，按原文展示:', error)
    return sql
  }
}

// 切换dataset时重新加载表单与SQL
watch(() => props.dataset, (dataset) => {
  const curSeq = ++sqlLoadSeq.value
  previewResult.value = null
  formRef.value?.clearValidate()

  if (!dataset) {
    // 新建模式
    formState.datasetNamePrefix = ''
    formState.remark = ''
    formState.dataSource = 'master'
    formState.sql = ''
    editorKey.value++
    return
  }

  const fullName = dataset.datasetName || ''
  formState.datasetNamePrefix = fullName.endsWith('Dataset')
    ? fullName.slice(0, -7)
    : fullName
  formState.remark = dataset.remark || ''
  formState.dataSource = dataset.dataSource || 'master'
  formState.sql = ''
  editorKey.value++

  if (dataset.id) {
    sqlLoading.value = true
    getSql({ datasetId: dataset.id, includeRemarks: true }, false, false)
      .then((res: any) => {
        if (curSeq !== sqlLoadSeq.value) return
        const sql = res?.payload?.sql
        if (res?.status?.code === 0 && typeof sql === 'string') {
          // 点开自动格式化展示
          formState.sql = formatSqlText(sql)
          editorKey.value++
        }
      })
      .catch(() => {
        if (curSeq === sqlLoadSeq.value) message.error('SQL加载失败')
      })
      .finally(() => {
        if (curSeq === sqlLoadSeq.value) sqlLoading.value = false
      })
  }
}, { immediate: true })

const handlePreview = async () => {
  try {
    await formRef.value?.validate()
    previewLoading.value = true

    const res = await parseSql({
      sql: formState.sql,
      dataSource: formState.dataSource
    } as any, false, false)

    if (res.status?.code === 0) {
      previewResult.value = {
        tables: res.payload?.tables || [],
        columns: res.payload?.columns || []
      }
      previewDrawerVisible.value = true
    }
  } catch (error) {
    console.error('预览失败:', error)
    message.error('预览失败')
  } finally {
    previewLoading.value = false
  }
}

const handleFormatSql = () => {
  if (!formState.sql) {
    message.warning('请先输入SQL语句')
    return
  }

  try {
    // 使用 sql-formatter 格式化：注释保持同行，JOIN多条件自动缩进换行
    formState.sql = format(formState.sql, SQL_FORMAT_OPTIONS)
    editorKey.value++
    message.success('SQL格式化成功')
  } catch (error) {
    console.error('格式化失败:', error)
    message.error('SQL格式化失败，请检查SQL语法')
  }
}

const handleSave = async () => {
  try {
    await formRef.value?.validate()
    if (!formState.sql?.trim()) {
      message.warning('请输入SQL语句')
      return
    }
    confirmLoading.value = true

    const res = await parseSqlAndSave({
      datasetId: props.dataset?.id,  // 编辑时传入id，新建时为undefined
      datasetName: formState.datasetNamePrefix + 'Dataset',
      sql: formState.sql,
      dataSource: formState.dataSource,
      remark: formState.remark,
    } as any, true, false)

    emit('saved', res?.payload?.datasetId ?? props.dataset?.id)
  } catch (error) {
    console.error('保存失败:', error)
  } finally {
    confirmLoading.value = false
  }
}

const copySql = () => {
  if (!formState.sql) {
    message.warning('没有SQL可复制')
    return
  }
  navigator.clipboard.writeText(formState.sql)
  message.success('SQL已复制到剪贴板')
}
</script>

<style scoped lang="less">
.dataset-sql-editor {
  height: 100%;
  display: flex;
  flex-direction: column;

  .base-form {
    padding: 12px 12px 0;
    row-gap: 8px;

    .remark-item {
      flex: 1;
      min-width: 260px;
      margin-right: 0;

      :deep(.ant-form-item-control) {
        flex: 1;
      }
    }
  }

  .editor-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
  }

  .syntax-status {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 13px;

    &.checking {
      color: var(--text-tertiary, #999);
    }

    &.valid {
      color: #52c41a;
    }

    &.invalid {
      color: #ff4d4f;
      cursor: help;
    }
  }

  .editor-wrapper {
    position: relative;
    flex: 1;
    min-height: 0;
    margin: 0 12px 12px;
    border: 1px solid var(--border-color, #d9d9d9);
    border-radius: 4px;
    overflow: hidden;

    :deep(.ace_editor) {
      height: 100% !important;
      font-family: 'Consolas', 'Monaco', 'Courier New', monospace !important;
    }

    .editor-loading-mask {
      position: absolute;
      inset: 0;
      z-index: 10;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(255, 255, 255, 0.6);
    }
  }
}

.join-condition {
  background: var(--bg-hover);
  padding: 4px 8px;
  border-radius: 4px;
  display: inline-block;
  margin-left: 8px;
}

.sql-example {
  background: var(--bg-hover);
  padding: 12px;
  border-radius: 4px;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
  line-height: 1.6;
  overflow-x: auto;
}
</style>
