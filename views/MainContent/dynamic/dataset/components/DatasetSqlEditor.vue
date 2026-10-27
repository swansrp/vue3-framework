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
        <a-select
          v-model:value="formState.dataSource"
          :options="dsNameOptions"
          placeholder="默认: master"
          style="width: 160px"
          show-search
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
          :title="syntaxErrorTitle"
          placement="bottom"
        >
          <span
            class="syntax-status invalid"
            @click="jumpToError"
          >
            <CloseCircleFilled /> 检测到语法错误
          </span>
        </a-tooltip>
        <a-button
          size="small"
          @click="handleAddAsAliases"
        >
          一键加AS
        </a-button>
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
        @init="onEditorInit"
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
import { computed, onBeforeUnmount, reactive, ref, shallowRef, watch } from 'vue'

import type { DatasetInfo, DatasetTableInfo, DatasetColumnInfo } from '../types'

import { listDataSourceNames } from '@/framework/apis/dataSource'
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

// 可用数据源下拉（yml 静态定义 + 数据源管理配置，后端 /forge/datasource/admin/names）
const dsNameOptions = ref<Array<{ value: string, label: string }>>([])
const loadDsNames = async () => {
  try {
    const res = await listDataSourceNames()
    const names: string[] = Array.isArray(res?.payload) ? res.payload : []
    dsNameOptions.value = names.map((n) => ({ value: n, label: n }))
  } catch (e) {
    console.error('加载可用数据源失败:', e)
  }
}
loadDsNames()

// SQL语法自动校验（复用后端 parseSql，与保存/预览同一解析器）
const syntaxStatus = ref<'idle' | 'checking' | 'valid' | 'invalid'>('idle')
const syntaxError = ref('')
const errorPos = ref<{ line: number, column: number } | null>(null)
const syntaxCheckSeq = ref(0)
let syntaxTimer: ReturnType<typeof setTimeout> | null = null

// ace 实例（@init 拿到；editorKey 重挂载后会重新触发）
const aceEditor = shallowRef<any>(null)
const lastErrorMark = ref<{ row: number, column: number, text: string } | null>(null)

const onEditorInit = (editor: any) => {
  aceEditor.value = editor
  if (lastErrorMark.value) {
    editor.session?.setAnnotations([{ ...lastErrorMark.value, type: 'error' }])
  }
}

const clearErrorMark = () => {
  lastErrorMark.value = null
  errorPos.value = null
  aceEditor.value?.session?.setAnnotations([])
}

// JSqlParser 报错形如 "Lexical error at line 95, column 33. Encountered: <EOF>"
const parseErrorPos = (raw: string) => {
  const m = raw.match(/at line (\d+), column (\d+)/)
  return m ? { line: +m[1], column: +m[2] } : null
}

// 去掉异常类名与重复的行列句，<EOF> 翻译成大白话
const humanizeReason = (raw: string) => {
  let r = raw
    .replace(/^SQL解析失败:\s*/, '')
    .replace(/net\.sf\.jsqlparser\.[\w.]*?Exception:\s*/g, '')
    .replace(/(Lexical error|Parse error|Encountered unexpected token:) at line \d+, column \d+\.\s*/i, '')
  if (/Encountered: <EOF>/i.test(r)) {
    r = 'SQL 在这里意外结束，常见原因：引号或注释没闭合'
  }
  return r.replace(/\s+/g, ' ').trim()
}

const syntaxErrorTitle = computed(() => {
  if (!syntaxError.value) return ''
  const pos = errorPos.value ? `第 ${errorPos.value.line} 行 第 ${errorPos.value.column} 列：` : ''
  return pos + syntaxError.value
})

// 点击"检测到语法错误"跳到出错行
const jumpToError = () => {
  if (errorPos.value && aceEditor.value) {
    aceEditor.value.gotoLine(errorPos.value.line, errorPos.value.column - 1, true)
    aceEditor.value.focus()
  }
}

const applyErrorResult = (rawMsg: string) => {
  syntaxStatus.value = 'invalid'
  errorPos.value = parseErrorPos(rawMsg)
  syntaxError.value = humanizeReason(rawMsg)
  const editor = aceEditor.value
  if (errorPos.value) {
    const mark = {
      row: errorPos.value.line - 1,
      column: errorPos.value.column - 1,
      text: syntaxError.value,
    }
    lastErrorMark.value = mark
    editor?.session?.setAnnotations([{ ...mark, type: 'error' }])
  } else {
    lastErrorMark.value = null
    editor?.session?.setAnnotations([])
  }
}

const checkSyntax = async () => {
  const curSeq = ++syntaxCheckSeq.value
  const sql = formState.sql?.trim()
  if (!sql) {
    syntaxStatus.value = 'idle'
    clearErrorMark()
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
      clearErrorMark()
    } else {
      applyErrorResult(res.status?.details || res.status?.msg || 'SQL解析失败')
    }
  } catch (error: any) {
    if (curSeq !== syntaxCheckSeq.value) return
    applyErrorResult(error?.message || 'SQL解析失败')
  }
}

// 输入停止1秒后自动校验
watch(() => formState.sql, () => {
  if (syntaxTimer) clearTimeout(syntaxTimer)
  if (!formState.sql?.trim()) {
    syntaxCheckSeq.value++
    syntaxStatus.value = 'idle'
    clearErrorMark()
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

// ==================== 一键加 AS ====================
// 给 SELECT 列表里没写别名的简单列引用(d.pmp_code)补 AS 驼峰别名(pmpCode)。
// 只动顶层 SELECT 到 FROM 之间的列：已有别名(AS 或隐式)、函数、运算式、星号一律跳过；
// -- 行注释、/* 块注释、字符串字面量不参与逗号拆分，插入点在列表达式末尾，行尾注释原地不动。
const SQL_IDENT_SRC = '(?:[A-Za-z_][\\w$]*|"[^"]*"|`[^`]*`)'
const SQL_SIMPLE_REF_RE = new RegExp('^' + SQL_IDENT_SRC + '(?:\\s*\\.\\s*' + SQL_IDENT_SRC + ')*$')
const SQL_IDENT_GLOBAL_RE = new RegExp(SQL_IDENT_SRC, 'g')
// 生成裸别名会撞语法的关键字，这类列保持原样让用户自己定别名
const SQL_RESERVED_ALIASES = new Set([
  'order', 'group', 'from', 'where', 'select', 'table', 'key', 'index', 'left', 'right',
  'join', 'on', 'as', 'by', 'union', 'all', 'distinct', 'having', 'limit', 'case', 'when',
  'then', 'else', 'end', 'and', 'or', 'not', 'in', 'is', 'null', 'like', 'exists',
  'between', 'asc', 'desc', 'insert', 'update', 'delete', 'set', 'values', 'into',
  'partition', 'rows', 'range', 'window', 'over', 'with', 'using', 'natural', 'cross',
  'inner', 'outer', 'full',
])

// pmp_code -> pmpCode，PMP_CODE -> pmpCode，DY -> dy；已是驼峰/小写的原样返回
const toCamelAlias = (raw: string): string | null => {
  if (!/^[\w$]+$/.test(raw)) return null
  if (raw.includes('_')) {
    return raw.toLowerCase()
      .split('_')
      .filter(Boolean)
      .map((part, idx) => (idx === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)))
      .join('')
  }
  if (raw === raw.toUpperCase() && /[A-Z]/.test(raw)) return raw.toLowerCase()
  return raw
}

const addSelectAliases = (sql: string): { sql: string, added: number } => {
  const isWord = (c: string | undefined) => !!c && /[A-Za-z0-9_$]/.test(c)
  type Segment = { exprStart: number, exprEnd: number, isFirst: boolean }
  const segments: Segment[] = []
  let selectEnd = -1
  let fromStart = -1
  let state: 'code' | 'line' | 'block' | 'quote' | 'dquote' | 'backtick' = 'code'
  let depth = 0
  let exprStart = -1
  let exprEnd = -1
  let isFirst = true

  const inList = () => selectEnd >= 0 && fromStart < 0
  const markCode = (from: number, to: number) => {
    if (!inList()) return
    if (exprStart < 0) exprStart = from
    exprEnd = to
  }
  const closeSegment = () => {
    segments.push({ exprStart, exprEnd, isFirst })
    exprStart = -1
    exprEnd = -1
    isFirst = false
  }

  let i = 0
  while (i < sql.length) {
    const c = sql[i]
    const next = sql[i + 1]

    if (state === 'line') {
      if (c === '\n') state = 'code'
      i++
      continue
    }
    if (state === 'block') {
      if (c === '*' && next === '/') {
        state = 'code'
        i += 2
        continue
      }
      i++
      continue
    }
    if (state === 'quote') {
      if (!/\s/.test(c)) markCode(i, i)
      if (c === '\\' && next !== undefined) {
        i += 2
        continue
      }
      if (c === "'") {
        if (next === "'") {
          i += 2
          continue
        }
        state = 'code'
      }
      i++
      continue
    }
    if (state === 'dquote') {
      if (!/\s/.test(c)) markCode(i, i)
      if (c === '"') {
        if (next === '"') {
          i += 2
          continue
        }
        state = 'code'
      }
      i++
      continue
    }
    if (state === 'backtick') {
      if (!/\s/.test(c)) markCode(i, i)
      if (c === '`') {
        if (next === '`') {
          i += 2
          continue
        }
        state = 'code'
      }
      i++
      continue
    }

    // code 态
    if (c === '-' && next === '-') {
      state = 'line'
      i += 2
      continue
    }
    if (c === '/' && next === '*') {
      state = 'block'
      i += 2
      continue
    }
    if (c === "'") {
      state = 'quote'
      markCode(i, i)
      i++
      continue
    }
    if (c === '"') {
      state = 'dquote'
      markCode(i, i)
      i++
      continue
    }
    if (c === '`') {
      state = 'backtick'
      markCode(i, i)
      i++
      continue
    }
    if (c === '(') {
      depth++
      markCode(i, i)
      i++
      continue
    }
    if (c === ')') {
      depth--
      markCode(i, i)
      i++
      continue
    }
    if (c === ',' && depth === 0 && inList()) {
      closeSegment()
      i++
      continue
    }
    if (isWord(c) && !isWord(sql[i - 1])) {
      let j = i
      while (j < sql.length && isWord(sql[j])) j++
      const word = sql.slice(i, j).toLowerCase()
      if (word === 'select' && depth === 0 && selectEnd < 0) {
        selectEnd = j
      } else if (word === 'from' && depth === 0 && selectEnd >= 0) {
        fromStart = i
        break
      } else {
        markCode(i, j - 1)
      }
      i = j
      continue
    }
    if (!/\s/.test(c)) markCode(i, i)
    i++
  }

  if (selectEnd < 0 || fromStart < 0) return { sql, added: 0 }
  closeSegment()

  // 先收集已有的 AS 别名与本次将生成的新别名，撞名时后者跳过（避免产出重复列别名）
  const usedAliases = new Set<string>()
  for (const seg of segments) {
    if (seg.exprStart < 0 || seg.exprEnd < seg.exprStart) continue
    const expr = sql.slice(seg.exprStart, seg.exprEnd + 1)
    const m = expr.match(/\bas\s+([A-Za-z_][\w$]*|"[^"]*"|`[^`]*`)\s*$/i)
    if (m) usedAliases.add(m[1].replace(/^["`]|["`]$/g, '').toLowerCase())
  }

  const insertions: Array<{ at: number, text: string }> = []
  for (const seg of segments) {
    if (seg.exprStart < 0 || seg.exprEnd < seg.exprStart) continue
    let expr = sql.slice(seg.exprStart, seg.exprEnd + 1)
    if (seg.isFirst) {
      expr = expr.replace(/^(distinct|all)\s+/i, '')
    }
    if (!SQL_SIMPLE_REF_RE.test(expr)) continue
    const idents = expr.match(SQL_IDENT_GLOBAL_RE)
    const lastIdent = idents ? idents[idents.length - 1] : ''
    const raw = lastIdent.replace(/^["`]|["`]$/g, '')
    const alias = toCamelAlias(raw)
    if (!alias || alias === raw) continue
    if (SQL_RESERVED_ALIASES.has(alias.toLowerCase()) || usedAliases.has(alias.toLowerCase())) continue
    usedAliases.add(alias.toLowerCase())
    insertions.push({ at: seg.exprEnd + 1, text: ` AS ${alias}` })
  }

  if (!insertions.length) return { sql, added: 0 }
  let result = sql
  for (let k = insertions.length - 1; k >= 0; k--) {
    result = result.slice(0, insertions[k].at) + insertions[k].text + result.slice(insertions[k].at)
  }
  return { sql: result, added: insertions.length }
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
          // 外层 WHERE 不进表/列配置（保存时转存了常驻条件），回显时随 /sql 响应拼回去，
          // 再次保存才不会把已转存的常驻条件清掉（必须同源取，列表接口不带该字段）
          const baseFilter = res?.payload?.baseFilter
          const where = baseFilter ? `\nWHERE ${baseFilter}` : ''
          // 点开自动格式化展示
          formState.sql = formatSqlText(sql + where)
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
    } as any, false, false, false)

    if (res.status?.code === 0) {
      previewResult.value = {
        tables: res.payload?.tables || [],
        columns: res.payload?.columns || []
      }
      previewDrawerVisible.value = true
    }
  } catch (error: any) {
    console.error('预览失败:', error)
    // 表单校验失败不弹错（字段旁已标红）；后端拒绝（如SQL解析失败）弹出具体原因
    if (error?.message) message.error(error.message)
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

const handleAddAsAliases = () => {
  if (!formState.sql?.trim()) {
    message.warning('请先输入SQL语句')
    return
  }
  try {
    const { sql, added } = addSelectAliases(formState.sql)
    if (!added) {
      message.info('没有需要补别名的列（已有AS别名的、函数、表达式、星号都跳过）')
      return
    }
    formState.sql = sql
    editorKey.value++
    message.success(`已为 ${added} 列补上AS别名`)
  } catch (error) {
    console.error('加AS失败:', error)
    message.error('加AS失败，请检查SQL语法')
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
      // 常驻条件已无独立输入框：SQL 里的外层 WHERE 就是唯一来源（后端 SQL 优先转存）；
      // 恒提交空串，SQL 没 WHERE 时即清除常驻条件
      baseFilter: '',
    } as any, true, false, false)

    emit('saved', res?.payload?.datasetId ?? props.dataset?.id)
  } catch (error: any) {
    console.error('保存失败:', error)
    // 表单校验失败不弹错（字段旁已标红）；后端拒绝（如SQL解析失败）弹出具体原因
    if (error?.message) message.error(error.message)
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
      cursor: pointer;
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
