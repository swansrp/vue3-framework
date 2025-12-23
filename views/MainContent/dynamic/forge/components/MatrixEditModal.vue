<template>
  <a-modal
    v-model:open="visible"
    :title="title"
    width="800px"
    @ok="handleOk"
    @cancel="handleCancel"
  >
    <a-tabs v-model:active-key="activeTab">
      <!-- 基本信息Tab -->
      <a-tab-pane
        key="basic"
        tab="基本信息"
      >
        <a-form
          ref="formRef"
          :model="formData"
          :label-col="{ span: 6 }"
          :wrapper-col="{ span: 16 }"
        >
          <a-form-item
            label="表名"
            name="tableName"
            :rules="tableNameRules"
          >
            <a-input
              v-model:value="formData.tableName"
              placeholder="请输入表名，如: user_info"
              :disabled="!!formData.id || props.readonly"
            >
              <template #addonBefore>
                biz_
              </template>
            </a-input>
            <div
              v-if="!formData.id"
              style="margin-top: 4px; color: #999; font-size: 12px;"
            >
              完整表名：biz_{{ formData.tableName }}
            </div>
          </a-form-item>
          <a-form-item
            label="表注释"
            name="tableComment"
            :rules="[{ required: true, message: '请输入表注释' }]"
          >
            <a-input
              v-model:value="formData.tableComment"
              placeholder="如: 用户评估信息表"
              :disabled="props.readonly"
            />
          </a-form-item>
          <a-form-item
            label="数据源"
            name="dataSource"
          >
            <a-input
              v-model:value="formData.dataSource"
              placeholder="默认: master"
              :disabled="!!formData.id || props.readonly"
            />
          </a-form-item>
          <a-form-item
            label="存储引擎"
            name="engine"
          >
            <a-select
              v-model:value="formData.engine"
              :disabled="!!formData.id || props.readonly"
            >
              <a-select-option value="InnoDB">
                InnoDB
              </a-select-option>
              <a-select-option value="MyISAM">
                MyISAM
              </a-select-option>
            </a-select>
          </a-form-item>
          <a-form-item
            label="字符集"
            name="charset"
          >
            <a-select
              v-model:value="formData.charset"
              :disabled="!!formData.id || props.readonly"
            >
              <a-select-option value="utf8mb4">
                utf8mb4
              </a-select-option>
              <a-select-option value="utf8">
                utf8
              </a-select-option>
            </a-select>
          </a-form-item>
          <a-form-item
            label="排序"
            name="sort"
          >
            <a-input-number
              v-model:value="formData.sort"
              :min="0"
              style="width: 100%"
              :disabled="!!formData.id || props.readonly"
            />
          </a-form-item>
        </a-form>
      </a-tab-pane>

      <!-- SQL预览Tab -->
      <a-tab-pane
        v-if="!!formData.id"
        key="sql"
        tab="SQL预览"
      >
        <div
          v-if="!formData.id"
          style="text-align: center; padding: 40px; color: #999;"
        >
          请先创建矩阵后查看SQL
        </div>
        <div
          v-else
          style="height: 500px;"
        >
          <div style="margin-bottom: 10px; display: flex; justify-content: flex-end;">
            <a-button
              type="primary"
              size="small"
              @click="handleCopySql"
            >
              复制SQL
            </a-button>
          </div>
          <b-ace-editor
            v-model="formattedSql"
            height="470px"
            lang="sql"
            theme="chrome"
            :readonly="true"
          />
        </div>
      </a-tab-pane>

      <!-- SQL导入Tab -->
      <a-tab-pane
        v-if="!formData.id"
        key="import"
        tab="SQL导入"
      >
        <div
          v-if="!!formData.id"
          style="text-align: center; padding: 40px; color: #999;"
        >
          编辑模式下不支持SQL导入
        </div>
        <div
          v-else
          style="height: 500px; display: flex; flex-direction: column;"
        >
          <a-alert
            message="导入说明"
            description="请粘贴标准的CREATE TABLE DDL语句，系统将自动解析并生成矩阵配置"
            type="info"
            show-icon
            style="margin-bottom: 10px;"
          />
          <div style="margin-bottom: 10px; display: flex; justify-content: flex-end;">
            <a-button
              size="small"
              @click="handleFormatImportSql"
            >
              格式化SQL
            </a-button>
          </div>
          <b-ace-editor
            v-model="importSqlContent"
            height="430px"
            lang="sql"
            theme="chrome"
          />
        </div>
      </a-tab-pane>
    </a-tabs>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import { message } from 'ant-design-vue'
// @ts-ignore
import BAceEditor from 'bin-editor-next'
import 'brace/ext/emmet'
import 'brace/ext/language_tools'
import 'brace/mode/sql'
import 'brace/snippets/sql'
import 'brace/theme/github.js'
import 'brace/theme/chrome.js'
import { format } from 'sql-formatter'

import type { MatrixInfo } from '../types'

import { exportDDL, importDDL } from '@/apis/sysMatrixPortalController'

interface Props {
  open: boolean
  title: string
  data: MatrixInfo
  readonly?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  open: false,
  title: '新建矩阵',
  readonly: false,
})

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'refresh'): void
  (e: 'ok', data: MatrixInfo): void
  (e: 'cancel'): void
}>()

const visible = ref(props.open)
const activeTab = ref('basic')
const formRef = ref()
const formData = reactive<MatrixInfo>({ ...props.data })
const sqlContent = ref('')
const importSqlContent = ref('')
const importing = ref(false)

// 表名验证规则
const tableNameRules = [
  { required: true, message: '请输入表名' },
  {
    validator: (_rule: any, value: string) => {
      if (!value) {
        return Promise.reject(new Error('请输入表名'))
      }
      if (!/^[a-z][a-z0-9_]*$/.test(value)) {
        return Promise.reject(new Error('表名必须以字母开头，只能包含小写字母、数字和下划线'))
      }
      return Promise.resolve()
    }
  }
]

// 格式化SQL
const formattedSql = computed(() => {
  if (!sqlContent.value) return ''
  try {
    return format(sqlContent.value, { language: 'mysql' })
  } catch (error) {
    console.error('SQL格式化失败:', error)
    return sqlContent.value
  }
})

// 监听props变化
watch(() => props.open, (newVal) => {
  visible.value = newVal
  if (newVal) {
    Object.assign(formData, props.data)
    activeTab.value = 'basic'
    importSqlContent.value = ''
    // 如果有id，加载SQL；否则清空SQL
    if (formData.id) {
      loadSql()
    } else {
      sqlContent.value = ''
    }
  }
})

// 监听props.data的变化，特别是id的变化
watch(() => props.data, (newData) => {
  Object.assign(formData, newData)
  // 如果有id且modal是打开状态，加载SQL；否则清空SQL
  if (newData.id && visible.value) {
    loadSql()
  } else if (!newData.id) {
    sqlContent.value = ''
  }
}, { deep: true })

watch(visible, (newVal) => {
  emit('update:open', newVal)
})

// 加载SQL
const loadSql = async () => {
  if (!formData.id) return
  try {
    const res = await exportDDL({ id: Number(formData.id) }, false, false)
    if (res.status?.code === 0) {
      sqlContent.value = res.payload || ''
    }
  } catch (error) {
    console.error('加载SQL失败:', error)
  }
}

// 复制SQL
const handleCopySql = async () => {
  try {
    await navigator.clipboard.writeText(formattedSql.value)
    message.success('已复制到剪贴板')
  } catch (error) {
    console.error('复制失败:', error)
    message.error('复制失败')
  }
}

// 导入SQL
const handleImportSql = async () => {
  if (!importSqlContent.value.trim()) {
    message.warning('请输入SQL语句')
    return
  }
  
  importing.value = true
  try {
    const res = await importDDL({ ddl: importSqlContent.value })
    if (res.status?.code === 0) {
      message.success('导入成功')
      // 更新表单数据
      if (res.payload) {
        Object.assign(formData, res.payload)
        // 移除 biz_ 前缀用于显示
        if (formData.tableName?.startsWith('biz_')) {
          formData.tableName = formData.tableName.replace(/^biz_/, '')
        }
      }
      emit('refresh')
    }
  } catch (error) {
    console.error('导入SQL失败:', error)
  } finally {
    importing.value = false
  }
}

// 格式化导入的SQL
const handleFormatImportSql = () => {
  if (!importSqlContent.value.trim()) {
    message.warning('请先输入SQL语句')
    return
  }
  try {
    // 先处理转义字符
    let sql = importSqlContent.value
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t')
      .replace(/\\r/g, '\r')
    // 再格式化
    importSqlContent.value = format(sql, { language: 'mysql' })
    message.success('格式化成功')
  } catch (error) {
    console.error('SQL格式化失败:', error)
    message.error('SQL格式化失败，请检查SQL语法')
  }
}

// 提交表单
const handleOk = async () => {
  // 如果是只读模式，只关闭弹窗，不提交
  if (props.readonly) {
    visible.value = false
    emit('cancel')
    return
  }
  
  // 如果在SQL导入tab，执行导入逻辑
  if (activeTab.value === 'import' && importSqlContent.value.trim()) {
    await handleImportSql()
    return
  }
  
  // 验证基本信息
  try {
    await formRef.value?.validate()
    emit('ok', { ...formData })
  } catch (error) {
    console.error('表单验证失败:', error)
  }
}

// 取消
const handleCancel = () => {
  visible.value = false
  emit('cancel')
}
</script>

<style scoped lang="less">
:deep(.ant-tabs-content) {
  height: auto;
}
</style>
