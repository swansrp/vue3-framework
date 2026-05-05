<template>
  <a-modal
    :open="open"
    :title="`Dataset SQL管理 - ${datasetInfo?.datasetName || '新建'}`"
    width="1000px"
    :footer="null"
    @cancel="handleCancel"
  >
    <a-tabs v-model:active-key="activeTab">
      <!-- 编辑SQL Tab -->
      <a-tab-pane
        key="edit"
        tab="编辑SQL"
      >
        <a-form
          ref="formRef"
          :model="formState"
          :label-col="{ span: 3 }"
          :wrapper-col="{ span: 21 }"
        >
          <a-form-item
            label="数据集名称"
            name="datasetNamePrefix"
            :rules="[{ required: true, message: '请输入数据集名称' }]"
          >
            <a-input
              v-model:value="formState.datasetNamePrefix"
              placeholder="请输入数据集名称(默认table-id)"
            >
              <template #suffix>
                <span style="color: #999;">Dataset</span>
              </template>
            </a-input>
          </a-form-item>

          <a-form-item
            label="备注"
            name="remark"
            :rules="[{ required: true, message: '请输入备注' }]"
          >
            <a-textarea
              v-model:value="formState.remark"
              placeholder="请输入备注"
              :rows="3"
            />
          </a-form-item>

          <a-form-item
            label="数据源"
            name="dataSource"
          >
            <a-input
              v-model:value="formState.dataSource"
              placeholder="默认: master"
            />
          </a-form-item>

          <a-form-item
            label="SQL语句"
            name="sql"
            :rules="[{ required: true, message: '请输入SQL语句' }]"
          >
            <div style="margin-bottom: 10px; display: flex; justify-content: flex-end; gap: 8px;">
              <a-button
                size="small"
                @click="handleFormatSql"
              >
                格式化SQL
              </a-button>
              <a-button
                size="small"
                @click="copySqlFromEditor"
              >
                复制SQL
              </a-button>
            </div>
            <b-ace-editor
              :key="editorKey"
              v-model="formState.sql"
              height="300px"
              lang="sql"
              theme="chrome"
            />
            <div style="margin-top: 10px;">
              <a-space>
                <a-button
                  type="default"
                  :loading="previewLoading"
                  @click="handlePreview"
                >
                  预览解析结果
                </a-button>
                <a-button
                  type="link"
                  @click="showSqlExample"
                >
                  查看SQL示例
                </a-button>
              </a-space>
            </div>
          </a-form-item>

          <!-- 预览结果 -->
          <template v-if="previewResult">
            <a-divider>解析结果预览</a-divider>
            
            <a-descriptions
              title="Dataset表配置"
              :column="1"
              bordered
              size="small"
            >
              <a-descriptions-item
                v-for="(table, index) in previewResult.datasets"
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
                    <strong>JOIN类型:</strong> {{ formatJoinType(table.joinType) }}
                  </div>
                  <div
                    v-if="table.joinCondition"
                    style="width: 100%;"
                  >
                    <strong>JOIN条件:</strong> 
                    <code style="background: var(--bg-hover); padding: 4px 8px; border-radius: 4px; display: inline-block; margin-left: 8px;">
                      {{ table.joinCondition }}
                    </code>
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
                    v-if="col.isAggregate === 'Y'"
                    color="orange"
                  >
                    聚合
                  </a-tag>
                </a-space>
              </a-descriptions-item>
            </a-descriptions>
          </template>

          <a-form-item :wrapper-col="{ offset: 3, span: 21 }">
            <a-space>
              <a-button
                type="primary"
                :loading="confirmLoading"
                @click="handleSave"
              >
                保存
              </a-button>
              <a-button @click="handleCancel">
                取消
              </a-button>
            </a-space>
          </a-form-item>
        </a-form>
      </a-tab-pane>

      <!-- 结构说明 Tab -->
      <a-tab-pane
        key="structure"
        tab="结构说明"
        :disabled="!datasetInfo"
      >
        <a-descriptions
          title="Dataset表配置"
          :column="1"
          bordered
          size="small"
        >
          <a-descriptions-item
            v-for="(table, index) in datasetInfo?.datasets"
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
                <strong>JOIN类型:</strong> {{ joinTypeLabelMap[table.joinType] || table.joinType }}
              </div>
              <div
                v-if="table.joinCondition"
                style="width: 100%;"
              >
                <strong>JOIN条件:</strong>
                <code style="background: var(--bg-hover); padding: 4px 8px; border-radius: 4px; display: inline-block; margin-left: 8px;">
                  {{ table.joinCondition }}
                </code>
              </div>
              <div v-if="table.remark">
                <strong>备注:</strong> {{ table.remark }}
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
            v-for="(col, index) in datasetInfo?.columns"
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
                v-if="col.isAggregate === 'Y'"
                color="orange"
              >
                聚合
              </a-tag>
              <a-tag
                v-if="col.isVisible === 'N'"
                color="red"
              >
                隐藏
              </a-tag>
              <span
                v-if="col.remark"
                style="color: var(--text-tertiary)"
              >
                ({{ col.remark }})
              </span>
            </a-space>
          </a-descriptions-item>
        </a-descriptions>
      </a-tab-pane>

      <!-- 压缩SQL Tab -->
      <a-tab-pane
        key="compact"
        tab="压缩SQL"
        :disabled="!datasetInfo"
      >
        <div class="sql-container">
          <pre class="sql-display">{{ compactSql }}</pre>
          <a-button
            type="primary"
            size="small"
            style="margin-top: 12px"
            @click="copyCompactSql"
          >
            复制压缩SQL
          </a-button>
        </div>
      </a-tab-pane>
    </a-tabs>

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
  </a-modal>
</template>

<script setup lang="ts">
import type { FormInstance } from 'ant-design-vue'
import { message }from 'ant-design-vue'
import BAceEditor from 'bin-editor-next'
import 'brace/ext/language_tools'
import 'brace/mode/sql'
import 'brace/snippets/sql'
import 'brace/theme/github.js'
import 'brace/theme/chrome.js'
import { computed, nextTick, reactive, ref, watch } from 'vue'

import type { DatasetInfo } from '../types'

import { getSql, parseSql, parseSqlAndSave } from '@/framework/views/MainContent/dynamic/apis/datasetConfigController'
const props = defineProps<{
  open: boolean
  datasetInfo?: DatasetInfo | null
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'ok'): void
}>()

const activeTab = ref('edit')
const formRef = ref<FormInstance>()
const confirmLoading = ref(false)
const previewLoading = ref(false)
const exampleModalVisible = ref(false)
const previewResult = ref<DatasetInfo | null>(null)

// JOIN类型映射
// b-ace-editor 有时不会响应外部异步赋值，这里用 key 强制重新渲染
const editorKey = ref(0)

// 用于避免弹窗频繁开关/切换dataset时，旧请求回写覆盖新内容
const sqlLoadSeq = ref(0)

const joinTypeMap: Record<string, string> = {
  '0': '内联 (INNER)',
  '1': '左联 (LEFT)',
  '2': '右联 (RIGHT)',
  '3': '全联 (FULL)',
}

const joinTypeLabelMap: Record<string, string> = {
  '0': '内联',
  '1': '左联',
  '2': '右联',
  '3': '全联',
}

// JOIN类型转换（SQL关键字）
const joinTypeToSql: Record<string, string> = {
  '0': 'INNER',
  '1': 'LEFT',
  '2': 'RIGHT',
  '3': 'FULL',
}

const formatJoinType = (joinType?: string) => {
  if (!joinType) return ''
  return joinTypeMap[joinType] || joinType
}

const formState = reactive({
  datasetNamePrefix: '',
  remark: '',
  dataSource: 'master',
  sql: '',
})

const sqlExamples = {
  simple: `-- 简单查询示例（--**为手动设置字段中文备注）
SELECT 
  id, -- 主键ID
  order_no AS orderNo, -- 订单编号
  amount, -- 订单金额
  status -- 状态
FROM t_order
WHERE status = 1`,

  join: `-- 多表JOIN示例（--**为手动设置字段中文备注）
SELECT 
  o.id, -- 主键ID
  o.order_no AS orderNo, -- 订单编号
  o.amount, --订单金额
  c.name AS customerName, -- 客户名称
  c.phone AS customerPhone -- 客户电话
FROM t_order o
LEFT JOIN t_customer c ON o.customer_id = c.id
WHERE o.status = 1`,

  aggregate: `-- 聚合函数示例（--**为手动设置字段中文备注）
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

// 格式化的SQL（用于查看）
const formattedSql = computed(() => {
  if (!props.datasetInfo?.datasets || !props.datasetInfo?.columns) {
    return '// 无数据'
  }

  const { datasets, columns } = props.datasetInfo

  // 构建SELECT子句
  const selectPart = columns
    .filter(col => col.isVisible !== 'N')
    .map(col => {
      if (col.columnSql === col.columnAlias) {
        return `  ${col.columnSql}`
      }
      return `  ${col.columnSql} AS ${col.columnAlias}`
    })
    .join(',\n')

  // 构建FROM子句
  const mainTable = datasets[0]
  const fromPart = `FROM ${mainTable.tableSql} ${mainTable.tableAlias}`

  // 构建JOIN子句
  const joinParts = datasets
    .slice(1)
    .map(table => {
      const joinTypeStr = joinTypeToSql[table.joinType || ''] || table.joinType || 'INNER'
      return `${joinTypeStr} JOIN ${table.tableSql} ${table.tableAlias} ON ${table.joinCondition}`
    })
    .join('\n')

  // 组合完整SQL
  let sql = `SELECT\n${selectPart}\n${fromPart}`
  if (joinParts) {
    sql += `\n${joinParts}`
  }

  // 如果有聚合字段，添加GROUP BY提示
  const hasAggregate = columns.some(col => col.isAggregate === 'Y')
  if (hasAggregate) {
    const nonAggregateFields = columns
      .filter(col => col.isAggregate !== 'Y' && col.isVisible !== 'N')
      .map(col => col.columnSql)
      .join(', ')
    if (nonAggregateFields) {
      sql += `\nGROUP BY ${nonAggregateFields}`
    }
  }

  return sql
})

// 压缩的SQL（单行）
const compactSql = computed(() => {
  return formattedSql.value.replace(/\n\s*/g, ' ').replace(/\s+/g, ' ').trim()
})

watch(() => props.open, (val) => {
  if (val) {
    // 使用nextTick确保datasetInfo已经更新
    nextTick(() => {
      if (props.datasetInfo) {
        // 编辑模式 - 使用formattedSql（格式化后的SQL）
        const fullName = props.datasetInfo.datasetName || ''
        formState.datasetNamePrefix = fullName.endsWith('Dataset') 
          ? fullName.slice(0, -7) 
          : fullName
        formState.remark = props.datasetInfo.remark || ''
        formState.dataSource = props.datasetInfo.dataSource || 'master'
        // 回显SQL：优先从后端拉取“带备注注释”的SQL；失败则回退本地拼装
        formState.sql = buildFormattedSql(props.datasetInfo)
        // 强制重建编辑器以保证初始内容渲染
        editorKey.value++

        const datasetId = (props.datasetInfo as any)?.id
        if (datasetId) {
          const curSeq = ++sqlLoadSeq.value
          getSql({ datasetId, includeRemarks: true }, false, false, false)
            .then(async (res: any) => {
              // 只处理最新一次打开/切换触发的请求
              if (curSeq !== sqlLoadSeq.value) return
              const sql = res?.payload?.sql
              if (res?.status?.code === 0 && typeof sql === 'string' && sql.trim()) {
                // 等编辑器渲染完成后再赋值，避免不刷新
                await nextTick()
                if (curSeq !== sqlLoadSeq.value) return
                formState.sql = sql
                // 重新创建编辑器实例以确保第三方组件把值显示出来
                editorKey.value++
              }
            })
            .catch(() => {
              // 静默回退：不影响用户继续编辑/保存
            })
        }
        activeTab.value = 'edit' // 直接显示编辑tab
      } else {
        // 新建模式
        resetForm()
        editorKey.value++
        activeTab.value = 'edit'
      }
      previewResult.value = null
    })
  }
})

const resetForm = () => {
  formState.datasetNamePrefix = ''
  formState.remark = ''
  formState.dataSource = 'master'
  formState.sql = ''
  formRef.value?.clearValidate()
  editorKey.value++
}

// 构建格式化的SQL（用于渲染到编辑器）
const buildFormattedSql = (dataset: DatasetInfo): string => {
  if (!dataset.datasets || !dataset.columns) {
    return ''
  }

  const { datasets, columns } = dataset

  // 构建SELECT子句
  const selectPart = columns
    .filter(col => col.isVisible !== 'N')
    .map(col => {
      if (col.columnSql === col.columnAlias) {
        return `  ${col.columnSql}`
      }
      return `  ${col.columnSql} AS ${col.columnAlias}`
    })
    .join(',\n')

  // 构建FROM子句
  const mainTable = datasets[0]
  const fromPart = `FROM ${mainTable.tableSql} ${mainTable.tableAlias}`

  // 构建JOIN子句
  const joinParts = datasets
    .slice(1)
    .map(table => {
      const joinTypeStr = joinTypeToSql[table.joinType || ''] || table.joinType || 'INNER'
      return `${joinTypeStr} JOIN ${table.tableSql} ${table.tableAlias} ON ${table.joinCondition}`
    })
    .join('\n')

  // 组合完整SQL
  let sql = `SELECT\n${selectPart}\n${fromPart}`
  if (joinParts) {
    sql += `\n${joinParts}`
  }

  // 如果有聚合字段，添加GROUP BY提示
  const hasAggregate = columns.some(col => col.isAggregate === 'Y')
  if (hasAggregate) {
    const nonAggregateFields = columns
      .filter(col => col.isAggregate !== 'Y' && col.isVisible !== 'N')
      .map(col => col.columnSql)
      .join(', ')
    if (nonAggregateFields) {
      sql += `\nGROUP BY ${nonAggregateFields}`
    }
  }

  return sql
}

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
        tableId: props.datasetInfo?.tableId || '',
        dataSource: formState.dataSource,
        datasets: res.payload?.tables || [],
        columns: res.payload?.columns || []
      }
      message.success('解析成功')
    }
  } catch (error) {
    console.error('预览失败:', error)
    message.error('预览失败')
  } finally {
    previewLoading.value = false
  }
}

const showSqlExample = () => {
  exampleModalVisible.value = true
}

const handleFormatSql = () => {
  if (!formState.sql) {
    message.warning('请先输入SQL语句')
    return
  }
  
  try {
    // 简单的SQL格式化：添加换行和缩进
    let formatted = formState.sql
      .replace(/\s+/g, ' ') // 合并多个空格
      .replace(/\s*,\s*/g, ',\n  ') // 逗号后换行
      .replace(/\bSELECT\b/gi, 'SELECT\n  ')
      .replace(/\bFROM\b/gi, '\nFROM ')
      .replace(/\b(INNER|LEFT|RIGHT|FULL)\s+JOIN\b/gi, '\n$1 JOIN ')
      .replace(/\bWHERE\b/gi, '\nWHERE ')
      .replace(/\bGROUP\s+BY\b/gi, '\nGROUP BY ')
      .replace(/\bORDER\s+BY\b/gi, '\nORDER BY ')
      .replace(/\bHAVING\b/gi, '\nHAVING ')
      .replace(/\bON\b/gi, 'ON ')
      .trim()

    formState.sql = formatted
    message.success('SQL格式化成功')
  } catch (error) {
    console.error('格式化失败:', error)
    message.error('SQL格式化失败')
  }
}

const handleSave = async () => {
  try {
    await formRef.value?.validate()
    confirmLoading.value = true

    // 拼接完整的数据集名称
    const fullDatasetName = formState.datasetNamePrefix + 'Dataset'

    // 统一使用 parseSqlAndSave 进行新增和修改
    await parseSqlAndSave({
      datasetId: props.datasetInfo?.id,  // 编辑时传入id，新建时为undefined
      datasetName: fullDatasetName,
      sql: formState.sql,
      dataSource: formState.dataSource,
      remark: formState.remark,
    }, true, false)
    
    message.success('保存成功')
    emit('ok')
  } catch (error) {
    console.error('保存失败:', error)
  } finally {
    confirmLoading.value = false
  }
}

// 从编辑器复制SQL
const copySqlFromEditor = () => {
  if (!formState.sql) {
    message.warning('没有SQL可复制')
    return
  }
  navigator.clipboard.writeText(formState.sql)
  message.success('SQL已复制到剪贴板')
}

const copyCompactSql = () => {
  navigator.clipboard.writeText(compactSql.value)
  message.success('压缩SQL已复制到剪贴板')
}

const handleCancel = () => {
  emit('update:open', false)
  resetForm()
  // 关闭时推进序号，废弃未完成的SQL拉取请求
  sqlLoadSeq.value++
  previewResult.value = null
}
</script>

<style scoped lang="less">
.sql-example {
  background: var(--bg-hover);
  padding: 12px;
  border-radius: 4px;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
  line-height: 1.6;
  overflow-x: auto;
}

.sql-container {
  .sql-display {
    background: var(--bg-hover);
    padding: 16px;
    border-radius: 4px;
    font-family: 'Consolas', 'Monaco', monospace;
    font-size: 13px;
    line-height: 1.6;
    overflow-x: auto;
    max-height: 500px;
    overflow-y: auto;
  }
}

:deep(.ant-form-item) {
  margin-bottom: 16px;
}

:deep(.ant-descriptions-item-label) {
  width: 80px;
  font-weight: 500;
}
</style>
