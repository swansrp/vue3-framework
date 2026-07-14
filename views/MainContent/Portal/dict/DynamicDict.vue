<template>
  <div class="dynamic-dict">
    <!-- 已保存的配置列表 -->
    <div class="saved-configs" v-if="configList.length > 0">
      <div class="conditions-header">
        <span class="conditions-title">已保存的动态字典配置</span>
      </div>
      <div class="config-grid">
        <div
          v-for="(item, index) in configList"
          :key="item.id"
          class="config-card"
          :class="{ 'config-card-active': originalDictCode === item.dictCode }"
          draggable="true"
          @dragstart="onConfigDragStart(index)"
          @dragover.prevent="onConfigDragOver(index)"
          @drop="onConfigDrop"
          @dragend="onConfigDragEnd"
        >
          <div class="config-card-header">
            <span class="config-card-code">{{ item.dictCode }}</span>
            <span class="config-card-name">{{ item.dictName }}</span>
          </div>
          <div class="config-card-body">{{ item.tableName }} · {{ item.valueColumn }}/{{ item.labelColumn }}</div>
          <div class="config-card-actions">
            <a-button size="small" type="link" @click="loadConfig(item)">加载</a-button>
            <a-button size="small" type="link" danger @click="handleDeleteConfig(item.id as number)">删除</a-button>
          </div>
        </div>
      </div>
    </div>

    <!-- 查询表单 + 操作按钮 -->
    <div class="form-row">
      <a-form layout="inline" class="dynamic-dict-form">
        <a-form-item label="数据源">
        <a-input
          v-model:value="formState.dataSource"
          placeholder="留空使用默认"
          allow-clear
          style="width: 140px"
        />
      </a-form-item>
      <a-form-item label="数据库">
        <a-input
          v-model:value="formState.database"
          placeholder="可选"
          allow-clear
          style="width: 120px"
        />
      </a-form-item>
      <a-form-item label="表名">
        <a-input
          v-model:value="formState.tableName"
          placeholder="如 sys_dict 或 db.table"
          style="width: 200px"
        />
      </a-form-item>
      <a-form-item label="value列">
        <a-input
          v-model:value="formState.valueColumn"
          placeholder="如 dict_value"
          style="width: 140px"
        />
      </a-form-item>
      <a-form-item label="label列">
        <a-input
          v-model:value="formState.labelColumn"
          placeholder="如 dict_label"
          style="width: 140px"
        />
      </a-form-item>
      <a-form-item label="排序">
        <a-input
          v-model:value="formState.orderBy"
          placeholder="如 value ASC"
          allow-clear
          style="width: 140px"
        />
      </a-form-item>
      </a-form>
      <div class="action-bar">
        <a-button type="primary" :loading="loading" @click="handleQuery">查询预览</a-button>
        <a-button type="primary" ghost :loading="saving || checking" @click="openSaveModal">保存配置</a-button>
      </div>
    </div>

    <!-- 动态条件 -->
    <div class="dynamic-dict-conditions">
      <div class="conditions-header">
        <span class="conditions-title">筛选条件（可选，拖拽调整顺序）</span>
        <a-button size="small" type="dashed" @click="addCondition">+ 添加条件</a-button>
      </div>
      <div class="condition-grid">
        <div
          v-for="(cond, index) in conditions"
          :key="index"
          class="condition-row"
          draggable="true"
          @dragstart="onCondDragStart(index)"
          @dragover.prevent="onCondDragOver(index)"
          @drop="onCondDrop"
          @dragend="onCondDragEnd"
        >
          <span class="drag-handle">⠿</span>
          <a-input
            v-model:value="cond.column"
            placeholder="列名"
            style="width: 140px"
          />
          <a-select
            v-model:value="cond.operator"
            style="width: 130px"
            :options="operatorOptions"
          />
          <a-input
            v-if="cond.operator !== 'IS NULL' && cond.operator !== 'IS NOT NULL'"
            v-model:value="cond.value"
            placeholder="值"
            style="width: 140px"
          />
          <span v-else class="condition-hint">（无需值）</span>
          <a-button size="small" type="link" danger @click="removeCondition(index)">删除</a-button>
        </div>
      </div>
    </div>

    <!-- 结果展示 -->
    <a-table
      :columns="tableColumns"
      :data-source="tableData"
      :pagination="{ pageSize: 50, showTotal: (t: number) => `共 ${t} 条` }"
      size="small"
      :loading="loading"
      :scroll="{ y: 'calc(100% - 100px)' }"
      row-key="value"
    />

    <!-- 保存配置弹窗 -->
    <a-modal
      v-model:open="saveModalVisible"
      title="保存动态字典配置"
      :confirm-loading="saving || checking"
      @ok="handleSaveConfig"
    >
      <a-form layout="vertical">
        <a-form-item label="字典编码" required>
          <a-input
            v-model:value="saveForm.dictCode"
            placeholder="如 dyn_project_type"
          />
        </a-form-item>
        <a-form-item label="字典名称" required>
          <a-input
            v-model:value="saveForm.dictName"
            placeholder="如 项目类型字典"
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script lang="ts" setup>
import { reactive, ref, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import {
  getDynamicDict,
  saveDynamicDictConfig,
  getDynamicDictConfigList,
  deleteDynamicDictConfig
} from '@/framework/apis/dict/dict'
import type { DynamicDictReq, DynamicDictConfig, DynamicDictOperator } from '@/framework/apis/dict/dict'
import { getDictExisted } from '@/framework/apis/dict/bizDictController'

interface ConditionItem {
  column: string
  operator: DynamicDictOperator
  value: string
}

const operatorOptions = [
  { label: '= 等于', value: '=' },
  { label: '!= 不等于', value: '!=' },
  { label: 'IS NULL 为空', value: 'IS NULL' },
  { label: 'IS NOT NULL 不为空', value: 'IS NOT NULL' },
  { label: 'LIKE 模糊匹配', value: 'LIKE' }
]

const formState = reactive({
  dataSource: '',
  database: '',
  tableName: '',
  valueColumn: '',
  labelColumn: '',
  orderBy: ''
})

const saveForm = reactive({
  dictCode: '',
  dictName: ''
})
const saveModalVisible = ref(false)

const conditions = ref<ConditionItem[]>([])
const loading = ref(false)
const saving = ref(false)
const tableData = ref<{ value: string; label: string }[]>([])
const configList = ref<DynamicDictConfig[]>([])
const originalDictCode = ref('')
const originalDictName = ref('')
const checking = ref(false)

const tableColumns = [
  { title: 'Value', dataIndex: 'value', key: 'value', width: '40%' },
  { title: 'Label', dataIndex: 'label', key: 'label', width: '60%' }
]


const addCondition = () => {
  conditions.value.push({ column: '', operator: '=', value: '' })
}

const removeCondition = (index: number) => {
  conditions.value.splice(index, 1)
}

/** 构建 DynamicDictReq */
const buildReq = (): DynamicDictReq => {
  const params: DynamicDictReq = {
    tableName: formState.tableName,
    valueColumn: formState.valueColumn,
    labelColumn: formState.labelColumn
  }
  if (saveForm.dictCode) params.dictCode = saveForm.dictCode
  if (saveForm.dictName) params.dictName = saveForm.dictName
  if (formState.dataSource) params.dataSource = formState.dataSource
  if (formState.database) params.database = formState.database
  if (formState.orderBy) params.orderBy = formState.orderBy

  const condList = conditions.value
    .filter(c => c.column && c.operator)
    .map(c => ({
      column: c.column,
      operator: c.operator,
      value: c.operator === 'IS NULL' || c.operator === 'IS NOT NULL' ? undefined : c.value
    }))
  if (condList.length > 0) {
    params.conditions = condList
  }
  return params
}

const handleQuery = async () => {
  if (!formState.tableName) { message.warning('请输入表名'); return }
  if (!formState.valueColumn) { message.warning('请输入 value 列名'); return }
  if (!formState.labelColumn) { message.warning('请输入 label 列名'); return }

  loading.value = true
  try {
    const res = await getDynamicDict(buildReq())
    tableData.value = res?.payload || []
  } catch {
    tableData.value = []
  } finally {
    loading.value = false
  }
}

/**
 * 打开保存弹窗
 */
const openSaveModal = () => {
  if (!formState.tableName) { message.warning('请输入表名'); return }
  if (!formState.valueColumn) { message.warning('请输入 value 列名'); return }
  if (!formState.labelColumn) { message.warning('请输入 label 列名'); return }
  // 如果是加载已有配置，回填字典编码和名称
  saveForm.dictCode = originalDictCode.value
  saveForm.dictName = originalDictName.value
  saveModalVisible.value = true
}

/**
 * 保存配置前查重：
 * - 新增配置时，检查 dictCode / dictName 在业务字典中是否已存在
 * - 更新已有配置（dictCode 未变）时跳过查重
 */
const handleSaveConfig = async () => {
  if (!saveForm.dictCode) { message.warning('请输入字典编码'); return }
  if (!saveForm.dictName) { message.warning('请输入字典名称'); return }

  const isUpdating = originalDictCode.value !== '' && originalDictCode.value === saveForm.dictCode
  if (!isUpdating) {
    checking.value = true
    try {
      const codeRes = await getDictExisted({ code: saveForm.dictCode }, false, false, false)
      if (codeRes?.payload === '1') {
        message.warning(`字典编码 "${saveForm.dictCode}" 已存在，请使用其他编码`)
        return
      }
      const nameRes = await getDictExisted({ name: saveForm.dictName }, false, false, false)
      if (nameRes?.payload === '1') {
        message.warning(`字典名称 "${saveForm.dictName}" 已存在，请使用其他名称`)
        return
      }
    } catch {
      // 查重失败不阻断保存流程
    } finally {
      checking.value = false
    }
  }

  saving.value = true
  try {
    await saveDynamicDictConfig(buildReq())
    message.success('配置已保存并生效')
    originalDictCode.value = saveForm.dictCode
    originalDictName.value = saveForm.dictName
    saveModalVisible.value = false
    await loadConfigList()
  } finally {
    saving.value = false
  }
}

const loadConfigList = async () => {
  try {
    const res = await getDynamicDictConfigList()
    configList.value = res || []
  } catch {
    configList.value = []
  }
}

const loadConfig = (record: DynamicDictConfig) => {
  originalDictCode.value = record.dictCode || ''
  originalDictName.value = record.dictName || ''
  formState.dataSource = record.dataSource || ''
  formState.database = record.database || ''
  formState.tableName = record.tableName || ''
  formState.valueColumn = record.valueColumn || ''
  formState.labelColumn = record.labelColumn || ''
  formState.orderBy = record.orderBy || ''

  // 解析条件 JSON
  conditions.value = []
  if (record.conditions) {
    try {
      const parsed = JSON.parse(record.conditions)
      if (Array.isArray(parsed)) {
        conditions.value = parsed.map((c: any) => ({
          column: c.column || '',
          operator: c.operator || '=',
          value: c.value || ''
        }))
      }
    } catch {
      // ignore parse error
    }
  }
}

const handleDeleteConfig = async (id: number) => {
  try {
    await deleteDynamicDictConfig(id)
    message.success('已删除')
    await loadConfigList()
  } catch {
    // ignore
  }
}

// ---- 拖拽排序 ----
const configDragIndex = ref(-1)
const condDragIndex = ref(-1)

const onConfigDragStart = (index: number) => { configDragIndex.value = index }
const onConfigDragOver = (index: number) => {
  if (configDragIndex.value === index) return
  const list = configList.value
  const dragged = list.splice(configDragIndex.value, 1)[0]
  list.splice(index, 0, dragged)
  configDragIndex.value = index
}
const onConfigDrop = () => { configDragIndex.value = -1 }
const onConfigDragEnd = () => { configDragIndex.value = -1 }

const onCondDragStart = (index: number) => { condDragIndex.value = index }
const onCondDragOver = (index: number) => {
  if (condDragIndex.value === index) return
  const list = conditions.value
  const dragged = list.splice(condDragIndex.value, 1)[0]
  list.splice(index, 0, dragged)
  condDragIndex.value = index
}
const onCondDrop = () => { condDragIndex.value = -1 }
const onCondDragEnd = () => { condDragIndex.value = -1 }

onMounted(() => {
  loadConfigList()
})
</script>

<style scoped>
.dynamic-dict {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-left: 16px;
}

.saved-configs {
  border: 1px solid #e8e8e8;
  border-radius: 4px;
  padding: 12px;
}

.config-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.config-card {
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 8px 12px;
  min-width: 240px;
  cursor: grab;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.config-card:hover {
  border-color: #69b1ff;
  box-shadow: 0 1px 6px rgba(0,0,0,0.08);
}

.config-card:active {
  cursor: grabbing;
}

.config-card-active {
  border-color: #1677ff;
  background: #f0f5ff;
}

.config-card-header {
  display: flex;
  gap: 8px;
  align-items: baseline;
  margin-bottom: 4px;
}

.config-card-code {
  font-weight: 600;
  font-size: 13px;
  color: #1677ff;
}

.config-card-name {
  font-size: 12px;
  color: #666;
}

.config-card-body {
  font-size: 12px;
  color: #999;
  margin-bottom: 4px;
}

.config-card-actions {
  display: flex;
  gap: 0;
}

.form-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.dynamic-dict-form {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.action-bar {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.dynamic-dict-conditions {
  border: 1px dashed #d9d9d9;
  border-radius: 4px;
  padding: 12px;
}

.conditions-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.conditions-title {
  font-size: 13px;
  color: #666;
}

.condition-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.condition-row {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: grab;
}

.condition-row:active {
  cursor: grabbing;
}

.drag-handle {
  color: #bbb;
  font-size: 16px;
  user-select: none;
  cursor: grab;
}

.condition-hint {
  font-size: 13px;
  color: #999;
  width: 100px;
}

.dynamic-dict :deep(.ant-table-wrapper) {
  flex: 1;
  overflow: auto;
}
</style>
