<template>
  <div class="dynamic-dict-page">
    <!-- 左侧：已配置动态字典列表 -->
    <div class="config-list-panel">
      <div class="panel-header">
        <div class="header-top">
          <h3>动态字典配置</h3>
          <a-space :size="4">
            <a-button
              type="primary"
              size="small"
              @click="handleNewConfig"
            >
              <template #icon>
                <PlusOutlined />
              </template>
              新建
            </a-button>
            <a-button
              size="small"
              :loading="dynDictExporting"
              @click="handleExportDynDict"
            >
              <template #icon>
                <DownloadOutlined />
              </template>
              导出
            </a-button>
            <input
              ref="dynDictFileInputRef"
              type="file"
              accept=".json"
              style="display: none"
              @change="handleDynDictFileChange"
            />
            <a-button
              size="small"
              :loading="dynDictImporting"
              @click="dynDictFileInputRef?.click()"
            >
              <template #icon>
                <UploadOutlined />
              </template>
              导入
            </a-button>
            <a-button
              type="text"
              size="small"
              @click="loadConfigList"
            >
              <template #icon>
                <ReloadOutlined />
              </template>
            </a-button>
          </a-space>
        </div>
        <a-input-search
          v-model:value="configSearch"
          placeholder="搜索字典名称/编码"
          :loading="configListLoading"
          allow-clear
          style="margin-top: 12px;"
        />
      </div>
      <div class="panel-content">
        <a-spin :spinning="configListLoading">
          <div
            v-for="item in configList"
            :key="item.id"
            :class="['config-list-item', { active: originalDictCode === item.dictCode }]"
            @click="selectConfig(item)"
          >
            <div class="config-list-item-info">
              <span class="config-list-item-name">{{ item.dictName }}</span>
              <span class="config-list-item-code">{{ item.dictCode }}</span>
            </div>
            <DeleteOutlined
              class="config-list-item-delete"
              @click.stop="handleDeleteConfig(item.id)"
            />
          </div>
          <a-empty
            v-if="configList.length === 0 && !configListLoading"
            :description="configSearch ? '无匹配结果' : '暂无配置'"
          />
        </a-spin>
      </div>
    </div>

    <!-- 右侧：配置编辑 + 预览 -->
    <div class="config-detail-panel">
      <div class="panel-header">
        <div class="header-top">
          <h3>{{ originalDictCode ? originalDictName : '新建动态字典' }}</h3>
          <a-space>
            <a-button
              type="primary"
              :loading="loading"
              @click="handleQuery"
            >
              查询预览
            </a-button>
            <a-button
              type="primary"
              ghost
              :loading="saving || checking"
              @click="openSaveModal"
            >
              保存配置
            </a-button>
          </a-space>
        </div>
      </div>
      <div class="panel-body">
        <!-- 配置表单 -->
        <a-form
          layout="inline"
          class="config-form"
        >
          <a-form-item label="数据源">
            <a-input
              v-model:value="formState.dataSource"
              placeholder="留空使用默认"
              allow-clear
              style="width: 130px"
            />
          </a-form-item>
          <a-form-item label="数据库">
            <a-input
              v-model:value="formState.database"
              placeholder="可选"
              allow-clear
              style="width: 110px"
            />
          </a-form-item>
          <a-form-item label="表名">
            <a-input
              v-model:value="formState.tableName"
              placeholder="如 sys_dict 或 db.table"
              style="width: 180px"
            />
          </a-form-item>
          <a-form-item label="value列">
            <a-input
              v-model:value="formState.valueColumn"
              placeholder="如 dict_value"
              style="width: 130px"
            />
          </a-form-item>
          <a-form-item label="label列">
            <a-input
              v-model:value="formState.labelColumn"
              placeholder="如 dict_label"
              style="width: 130px"
            />
          </a-form-item>
          <a-form-item label="排序">
            <a-input
              v-model:value="formState.orderBy"
              placeholder="如 value ASC"
              allow-clear
              style="width: 130px"
            />
          </a-form-item>
          <a-form-item label="父ID列">
            <a-input
              v-model:value="formState.pidColumn"
              placeholder="树形模式: 父级ID列"
              allow-clear
              style="width: 130px"
            />
          </a-form-item>
        </a-form>

        <!-- 动态条件 -->
        <div class="conditions-section">
          <div class="conditions-header">
            <span class="conditions-title">筛选条件（可选，拖拽调整顺序）</span>
            <a-button
              size="small"
              type="dashed"
              @click="addCondition"
            >
              + 添加条件
            </a-button>
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
                style="width: 130px"
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
                style="width: 130px"
              />
              <span
                v-else
                class="condition-hint"
              >（无需值）</span>
              <a-button
                size="small"
                type="link"
                danger
                @click="removeCondition(index)"
              >
                删除
              </a-button>
            </div>
          </div>
        </div>

        <!-- 结果展示 -->
        <div class="result-area">
          <div class="result-toolbar">
            <span class="result-count">共 {{ tableData.length }} 条数据</span>
            <a-segmented
              v-model:value="displayMode"
              size="small"
              :options="displayModeOptions"
            />
          </div>
          <a-spin :spinning="loading">
            <template v-if="displayMode === 'tree'">
              <a-tree
                v-if="treePreviewData.length > 0"
                :tree-data="treePreviewData"
                :field-names="{ key: 'value', title: 'label', children: 'children' }"
                default-expand-all
                :selectable="false"
              />
              <a-empty
                v-else
                :description="tableData.length > 0 ? '树形构建失败，请检查父ID列配置' : '暂无数据，点击查询预览'"
              />
            </template>
            <a-table
              v-else
              :columns="tableColumns"
              :data-source="tableData"
              :pagination="{ pageSize: 50, showTotal: (t: number) => `共 ${t} 条` }"
              size="small"
              row-key="value"
            />
          </a-spin>
        </div>
      </div>
    </div>

    <!-- 保存配置弹窗 -->
    <a-modal
      v-model:open="saveModalVisible"
      title="保存动态字典配置"
      :confirm-loading="saving || checking"
      @ok="handleSaveConfig"
    >
      <a-form layout="vertical">
        <a-form-item
          label="字典编码"
          required
        >
          <a-input
            v-model:value="saveForm.dictCode"
            placeholder="如 dyn_project_type"
          />
        </a-form-item>
        <a-form-item
          label="字典名称"
          required
        >
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
import { DeleteOutlined, DownloadOutlined, PlusOutlined, ReloadOutlined, UploadOutlined } from '@ant-design/icons-vue'
import { message, Modal } from 'ant-design-vue'
import { computed, onMounted, reactive, ref, watch } from 'vue'

import { getDictExisted } from '@/framework/apis/dict/bizDictController'
import {
  getDynamicDict,
  saveDynamicDictConfig,
  getDynamicDictConfigList,
  deleteDynamicDictConfig
} from '@/framework/apis/dict/dict'
import type { DynamicDictReq, DynamicDictConfig, DynamicDictOperator } from '@/framework/apis/dict/dict'
import { downloadJsonConfig, readJsonFile } from '@/framework/utils/configTransfer'

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

// ==================== 左侧列表 ====================
const configList = ref<DynamicDictConfig[]>([])
const configSearch = ref('')
const configListLoading = ref(false)

const loadConfigList = async () => {
  configListLoading.value = true
  try {
    const keyword = configSearch.value.trim() || undefined
    const res = await getDynamicDictConfigList({ keyword })
    configList.value = res?.payload || res || []
  } catch {
    configList.value = []
  } finally {
    configListLoading.value = false
  }
}

let configSearchTimer: ReturnType<typeof setTimeout> | null = null
watch(configSearch, () => {
  if (configSearchTimer) clearTimeout(configSearchTimer)
  configSearchTimer = setTimeout(() => {
    loadConfigList()
  }, 300)
})

const selectConfig = (record: DynamicDictConfig) => {
  originalDictCode.value = record.dictCode || ''
  originalDictName.value = record.dictName || ''
  formState.dataSource = record.dataSource || ''
  formState.database = record.databaseName || ''
  formState.tableName = record.tableName || ''
  formState.valueColumn = record.valueColumn || ''
  formState.labelColumn = record.labelColumn || ''
  formState.orderBy = record.orderBy || ''
  formState.pidColumn = record.pidColumn || ''
  tableData.value = []

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

const handleNewConfig = () => {
  originalDictCode.value = ''
  originalDictName.value = ''
  formState.dataSource = ''
  formState.database = ''
  formState.tableName = ''
  formState.valueColumn = ''
  formState.labelColumn = ''
  formState.orderBy = ''
  formState.pidColumn = ''
  conditions.value = []
  tableData.value = []
}

const handleDeleteConfig = async (id: number) => {
  try {
    await deleteDynamicDictConfig(id)
    message.success('已删除')
    if (configList.value.find(c => c.id === id)?.dictCode === originalDictCode.value) {
      handleNewConfig()
    }
    await loadConfigList()
  } catch {
    // ignore
  }
}

// ==================== 导出/导入 ====================
const dynDictExporting = ref(false)
const dynDictImporting = ref(false)
const dynDictFileInputRef = ref<HTMLInputElement>()

// 导出动态字典配置
const handleExportDynDict = async () => {
  if (!configList.value.length) {
    message.warning('暂无可导出的动态字典配置')
    return
  }
  dynDictExporting.value = true
  try {
    const exportData = configList.value.map((c: DynamicDictConfig) => {
      const { ...rest } = c
      return rest
    })
    downloadJsonConfig('动态字典配置', {
      type: 'dynamicDict',
      exportTime: new Date().toISOString(),
      data: exportData
    })
    message.success('导出成功')
  } catch (error: any) {
    message.error('导出失败: ' + (error?.message || '未知错误'))
  } finally {
    dynDictExporting.value = false
  }
}

// 导入动态字典配置
const handleDynDictFileChange = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  target.value = ''

  try {
    const parsed = await readJsonFile(file)
    const importData = parsed.data || []
    if (!Array.isArray(importData) || importData.length === 0) {
      message.warning('文件中没有可导入的动态字典配置')
      return
    }
    Modal.confirm({
      title: '确认导入',
      content: `将导入 ${importData.length} 个动态字典配置，确认继续？`,
      okText: '确认导入',
      cancelText: '取消',
      onOk: async () => {
        dynDictImporting.value = true
        try {
          for (const config of importData) {
            // 将 DynamicDictConfig 转为 DynamicDictReq
            const req: DynamicDictReq = {
              dictCode: config.dictCode,
              dictName: config.dictName,
              dataSource: config.dataSource || '',
              database: config.databaseName || config.database || '',
              tableName: config.tableName,
              valueColumn: config.valueColumn,
              labelColumn: config.labelColumn,
              orderBy: config.orderBy || '',
              pidColumn: config.pidColumn || ''
            }
            // 解析 conditions JSON 字符串
            if (config.conditions) {
              try {
                const parsedConditions = typeof config.conditions === 'string'
                  ? JSON.parse(config.conditions)
                  : config.conditions
                if (Array.isArray(parsedConditions)) {
                  req.conditions = parsedConditions
                }
              } catch {
                // ignore parse error
              }
            }
            await saveDynamicDictConfig(req, undefined)
          }
          message.success('导入成功')
          await loadConfigList()
        } catch (error: any) {
          message.error('导入失败: ' + (error?.message || '未知错误'))
        } finally {
          dynDictImporting.value = false
        }
      }
    })
  } catch (error: any) {
    message.error('文件解析失败，请确保是有效的JSON文件')
  }
}

// ==================== 右侧配置编辑 ====================
const formState = reactive({
  dataSource: '',
  database: '',
  tableName: '',
  valueColumn: '',
  labelColumn: '',
  orderBy: '',
  pidColumn: ''
})

const saveForm = reactive({ dictCode: '', dictName: '' })
const saveModalVisible = ref(false)
const originalDictCode = ref('')
const originalDictName = ref('')

const conditions = ref<ConditionItem[]>([])
const loading = ref(false)
const saving = ref(false)
const checking = ref(false)
const tableData = ref<{ value: string; label: string; pid?: string | null }[]>([])

const displayMode = ref<'table' | 'tree'>('table')
const displayModeOptions = [
  { label: '平铺展示', value: 'table' },
  { label: '树形展示', value: 'tree' }
]

const isTreeMode = computed(() => !!formState.pidColumn)
watch(isTreeMode, (val) => {
  displayMode.value = val ? 'tree' : 'table'
}, { immediate: true })

const treePreviewData = computed(() => {
  if (!isTreeMode.value || tableData.value.length === 0) return []
  const items = tableData.value
  const nodeMap = new Map<string, any>()
  const roots: any[] = []
  for (const item of items) {
    nodeMap.set(item.value, { ...item, children: [] })
  }
  for (const item of items) {
    const node = nodeMap.get(item.value)!
    const pid = item.pid
    if (!pid || !nodeMap.has(pid)) {
      roots.push(node)
    } else {
      nodeMap.get(pid)!.children.push(node)
    }
  }
  return roots
})

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
  if (formState.pidColumn) params.pidColumn = formState.pidColumn

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

const openSaveModal = () => {
  if (!formState.tableName) { message.warning('请输入表名'); return }
  if (!formState.valueColumn) { message.warning('请输入 value 列名'); return }
  if (!formState.labelColumn) { message.warning('请输入 label 列名'); return }
  saveForm.dictCode = originalDictCode.value
  saveForm.dictName = originalDictName.value
  saveModalVisible.value = true
}

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

// ---- 条件拖拽排序 ----
const condDragIndex = ref(-1)

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

<style scoped lang="less">
.dynamic-dict-page {
  display: flex;
  height: 100%;
  background: #f5f7fa;
  gap: 16px;
  padding: 16px;
}

.config-list-panel,
.config-detail-panel {
  background: var(--bg-elevated);
  border-radius: 8px;
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.config-list-panel {
  width: 320px;
  flex-shrink: 0;
}

.config-detail-panel {
  flex: 1;
  min-width: 0;
}

.panel-header {
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;

  .header-top {
    display: flex;
    justify-content: space-between;
    align-items: center;

    h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      color: #333;
    }
  }

  h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: #333;
  }
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.config-list-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 4px;

  &:hover {
    background: #f0f5ff;

    .config-list-item-delete {
      opacity: 1;
    }
  }

  &.active {
    background: #e6f4ff;
    border-left: 3px solid #1677ff;
    padding-left: 11px;
  }
}

.config-list-item-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow: hidden;
}

.config-list-item-name {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.config-list-item-code {
  font-size: 12px;
  color: #8c8c8c;
}

.config-list-item-delete {
  opacity: 0;
  color: #ff4d4f;
  font-size: 12px;
  transition: opacity 0.2s;
  flex-shrink: 0;
  margin-left: 4px;

  &:hover {
    color: #cf1322;
  }
}

.config-form {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.conditions-section {
  border: 1px dashed #d9d9d9;
  border-radius: 6px;
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

  &:active {
    cursor: grabbing;
  }
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

.result-area {
  flex: 1;
  overflow: auto;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  padding: 12px;
  min-height: 200px;
}

.result-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.result-count {
  font-size: 13px;
  color: #8c8c8c;
}
</style>
