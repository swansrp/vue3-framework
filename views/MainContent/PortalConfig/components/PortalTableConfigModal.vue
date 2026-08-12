<template>
  <a-modal
    v-model:open="visible"
    :title="
      'DarkTable 配置' +
        (portalConfig?.displayName ? ' - ' + portalConfig.displayName : '')
    "
    width="1500px"
    :body-style="{ height: '75vh', overflow: 'hidden' }"
    :footer="null"
    @cancel="handleCancel"
  >
    <div class="table-config-container">
      <!-- 左侧：Table 配置列表 -->
      <div class="table-list-panel">
        <div class="panel-header">
          <span>表格配置列表</span>
          <a-button
            type="primary"
            size="small"
            @click="handleAddTable"
          >
            <template #icon>
              <PlusOutlined />
            </template>
            新增
          </a-button>
        </div>
        <div class="panel-content">
          <div
            v-for="table in tableList"
            :key="table.id"
            :class="['table-item', { active: selectedTable?.id === table.id }]"
            @click="handleSelectTable(table)"
          >
            <div class="table-item-content">
              <div class="table-name">
                {{ table.tableCode || "未命名" }}
              </div>
              <div class="table-info">
                ID: {{ table.id }} | 筛选项: {{ getFilterCount(table.id) }}
              </div>
            </div>
            <div class="table-item-actions">
              <a-button
                type="link"
                size="small"
                danger
                @click.stop="handleDeleteTable(table)"
              >
                <DeleteOutlined />
              </a-button>
            </div>
          </div>
          <a-empty
            v-if="tableList.length === 0"
            description="暂无配置"
          />
        </div>
      </div>

      <!-- 右侧：配置详情 -->
      <div class="config-detail-panel">
        <template v-if="selectedTable">
          <!-- 三个配置域并排 tab，避免纵向滚动 -->
          <a-tabs
            v-model:active-key="configActiveTab"
            class="config-tabs"
          >
            <a-tab-pane
              key="basic"
              tab="基础配置"
            >
              <portal-table-basic-pane
                :table="selectedTable"
                :portal-config="portalConfig"
                :available-fields="availableFields"
                :exporting="reportExporting"
                :importing="reportImporting"
                @saved="loadTableList"
                @export="handleExportReportConfig"
                @import="handleImportReportConfig"
              />
            </a-tab-pane>

            <a-tab-pane
              key="filter"
              tab="筛选项配置"
            >
              <portal-table-filter-pane
                :table-id="selectedTable.id"
                :columns="columns"
                :portal-config="portalConfig"
                :available-fields="availableFields"
                @count-change="(count) => filterCountMap.set(selectedTable!.id!, count)"
              />
            </a-tab-pane>

            <a-tab-pane
              key="pivot"
              tab="透视列配置"
              :disabled="selectedTable.pivotMode !== '1'"
            >
              <portal-table-pivot-column-pane
                :table-id="selectedTable.id"
                :pivot-mode="selectedTable.pivotMode"
                :columns="columns"
                :available-fields="availableFields"
                :portal-name="portalName"
              />
            </a-tab-pane>
          </a-tabs>
        </template>
        <a-empty
          v-else
          description="请选择或新增一个表格配置"
        />
      </div>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons-vue'
import { message, Modal } from 'ant-design-vue'
import { computed, ref, watch } from 'vue'


import PortalTableBasicPane from './tableConfig/PortalTableBasicPane.vue'
import PortalTableFilterPane from './tableConfig/PortalTableFilterPane.vue'
import PortalTablePivotColumnPane from './tableConfig/PortalTablePivotColumnPane.vue'

import {
  addPortalTable,
  addPortalTableFilter,
  addPortalPivotColumn,
  deletePortalTable,
  deletePortalTableFilterList,
  deletePortalPivotColumn,
  getPortalTableFilterList,
  getPortalTableList,
  getPortalPivotColumnList,
  PortalPivotColumnVO,
  PortalTableFilterVO,
  PortalTableVO,
  updatePortalTable,
  updatePortalTableFilter,
  updatePortalPivotColumn,
} from '@/framework/apis/portal/table'
import { downloadJsonConfig, readJsonFile } from '@/framework/utils/configTransfer'

const props = defineProps<{
  modelValue: boolean;
  portalName?: string;
  portalConfig?: any;
  columns?: any[];
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
}>()

const visible = ref(false)
const saving = ref(false)
const tableList = ref<PortalTableVO[]>([])
const selectedTable = ref<PortalTableVO | null>(null)
const filterCountMap = ref<Map<number, number>>(new Map())
// 导出/导入状态
const reportExporting = ref(false)
const reportImporting = ref(false)

// 配置域 tab 当前页(基础配置/筛选项配置/透视列配置)
const configActiveTab = ref('basic')
// 关闭透视模式时若停留在透视列 tab，自动回基础配置
watch(
  () => selectedTable.value?.pivotMode,
  (mode) => {
    if (mode !== '1' && configActiveTab.value === 'pivot') {
      configActiveTab.value = 'basic'
    }
  }
)

// 可选字段列表（由 props.columns 推导，一次计算分发给各面板）
const availableFields = computed(
  () =>
    (props.columns || []).map((col: any) => ({
      key: col.property,
      title: `${col.displayName} (${col.property})`,
      property: col.property,
      displayName: col.displayName,
      reference: col.reference,
    }))
)

watch(
  () => props.modelValue,
  (newVal) => {
    visible.value = newVal
    if (newVal) {
      loadTableList()
    }
  }
)

watch(visible, (newVal) => {
  emit('update:modelValue', newVal)
})

// 加载表格配置列表
const loadTableList = async () => {
  if (!props.portalName) {
    tableList.value = []
    return
  }
  try {
    const res = await getPortalTableList(props.portalName)
    if (res.payload?.records) {
      tableList.value = res.payload.records
      // 加载每个 table 的筛选项数量
      for (const table of tableList.value) {
        if (table.id) {
          const filterRes = await getPortalTableFilterList(table.id)
          filterCountMap.value.set(table.id, filterRes.payload?.total || 0)
        }
      }
    }
  } catch (error) {
    console.error('加载表格配置失败:', error)
  }
}

// 获取筛选项数量
const getFilterCount = (tableId: number | undefined) => {
  if (!tableId) return 0
  return filterCountMap.value.get(tableId) || 0
}

// 选择表格配置(各面板通过 table/tableId prop 变化自行初始化)
const handleSelectTable = (table: PortalTableVO) => {
  selectedTable.value = table
}

// 新增表格配置
const handleAddTable = async () => {
  if (!props.portalName) {
    message.warning('请先选择一个表格配置')
    return
  }
  const newTable: PortalTableVO = {
    portalName: props.portalName,
    tableCode: '',
    filterWidth: 260,
    paddingTh: 2,
    paddingTd: 7,
    status: '1',
  }
  saving.value = true
  try {
    const res = await addPortalTable(newTable)
    if (res.payload) {
      message.success('新增成功')
      await loadTableList()
      // 选中新创建的配置
      const newRecord = tableList.value.find(
        (t) => t.tableCode === '' && t.portalName === props.portalName
      )
      if (newRecord) {
        handleSelectTable(newRecord)
      }
    }
  } catch (error) {
    console.error('新增失败:', error)
  } finally {
    saving.value = false
  }
}

// 导出报表配置
const handleExportReportConfig = async () => {
  if (!tableList.value.length) {
    message.warning('暂无可导出的报表配置')
    return
  }
  reportExporting.value = true
  try {
    // 导出所有表格及其筛选器、透视列配置
    const exportData = await Promise.all(
      tableList.value.map(async (table) => {
        const filters = await getPortalTableFilterList(table.id!)
        const pivotColumnsRes = await getPortalPivotColumnList(table.id!, false, false, false)
        return {
          table: { ...table },
          filters: (filters.payload || []).map((f: any) => f),
          pivotColumns: (pivotColumnsRes?.payload?.records || []).map((c: any) => c)
        }
      })
    )
    downloadJsonConfig(`${props.portalName}-报表配置`, {
      type: 'report',
      portalName: props.portalName,
      exportTime: new Date().toISOString(),
      data: exportData
    })
    message.success('导出成功')
  } catch (error: any) {
    message.error('导出失败: ' + (error?.message || '未知错误'))
  } finally {
    reportExporting.value = false
  }
}

// 导入报表配置(文件由基础配置面板选择后传入)
const handleImportReportConfig = async (file: File) => {
  try {
    const parsed = await readJsonFile(file)
    // 校验文件类型, 避免误导入其他类型的配置 JSON(如指标配置)
    if (parsed?.type !== 'report') {
      message.warning('不是有效的报表配置文件')
      return
    }
    const importData = parsed.data || []
    if (!Array.isArray(importData) || importData.length === 0) {
      message.warning('文件中没有可导入的报表配置')
      return
    }
    // 目标 portal 优先取当前页面, 支持跨页面/跨环境导入
    const portalName = props.portalName || parsed.portalName
    if (!portalName) {
      message.warning('无法确定目标表格名称')
      return
    }
    Modal.confirm({
      title: '确认导入',
      content: `将导入 ${importData.length} 个报表配置到「${portalName}」，文件中未包含的筛选器/透视列将被删除，确认继续？`,
      okText: '确认导入',
      cancelText: '取消',
      onOk: async () => {
        reportImporting.value = true
        try {
          let added = 0, updated = 0
          const filterStat = { added: 0, updated: 0, deleted: 0 }
          const pivotStat = { added: 0, updated: 0, deleted: 0 }
          // 构建已有表查重映射: tableCode → existing table
          const existingTableMap = new Map<string, PortalTableVO>()
          tableList.value.forEach(t => {
            if (t.tableCode) existingTableMap.set(t.tableCode, t)
          })
          for (const item of importData) {
            const tableData = { ...item.table }
            delete tableData.id
            delete tableData.filterCount
            // 强制归属目标 portal, 避免带入源环境旧值
            tableData.portalName = portalName
            const tableCode = tableData.tableCode
            const existingTable = tableCode ? existingTableMap.get(tableCode) : null
            let tableId: number
            if (existingTable?.id) {
              // 已存在 → 更新
              await updatePortalTable({ ...tableData, id: existingTable.id }, false, false, false)
              tableId = existingTable.id
              updated++
            } else {
              // 不存在 → 新增
              const newTable = await addPortalTable(tableData, false, false, false)
              tableId = newTable.payload?.id || newTable.payload
              added++
            }
            // 处理筛选器(全量同步: 以文件为准, 文件外的多余项删除)
            if (Array.isArray(item.filters)) {
              // 查重：获取已有筛选器
              const existingFiltersRes = await getPortalTableFilterList(tableId!, false, false, false)
              const existingFilters: PortalTableFilterVO[] = existingFiltersRes?.payload || []
              const filterMap = new Map<string, PortalTableFilterVO>()
              existingFilters.forEach(ef => {
                if (ef.code) filterMap.set(ef.code, ef)
              })
              // 删除文件中不存在的筛选器(只删有编码可匹配的, 无编码的保守保留)
              const importFilterCodes = new Set(item.filters.map((f: any) => f.code).filter(Boolean))
              const staleFilterIds = existingFilters
                .filter(ef => ef.id && ef.code && !importFilterCodes.has(ef.code))
                .map(ef => ef.id!)
              if (staleFilterIds.length) {
                await deletePortalTableFilterList(staleFilterIds, false, false, false)
                filterStat.deleted += staleFilterIds.length
              }
              for (const f of item.filters) {
                // 移除源环境 id，避免跨环境导入时带入旧ID
                const { id: _srcFilterId, ...filterData } = f
                const existingFilter = f.code ? filterMap.get(f.code) : null
                if (existingFilter?.id) {
                  // 已存在 → 更新
                  await updatePortalTableFilter(
                    { ...filterData, id: existingFilter.id, tableId },
                    false, false, false
                  )
                  filterStat.updated++
                } else {
                  // 不存在 → 新增
                  await addPortalTableFilter(
                    { ...filterData, tableId },
                    false, false, false
                  )
                  filterStat.added++
                }
              }
            }
            // 处理透视列(全量同步: 以文件为准, 文件外的多余项删除)
            if (Array.isArray(item.pivotColumns)) {
              const existingPivotRes = await getPortalPivotColumnList(tableId!, false, false, false)
              const existingPivots: PortalPivotColumnVO[] = existingPivotRes?.payload?.records || []
              const pivotMap = new Map<string, PortalPivotColumnVO>()
              existingPivots.forEach(ep => {
                if (ep.itemValue) pivotMap.set(ep.itemValue, ep)
              })
              // 删除文件中不存在的透视列(只删有列标识可匹配的)
              const importPivotValues = new Set(item.pivotColumns.map((c: any) => c.itemValue).filter(Boolean))
              for (const ep of existingPivots) {
                if (ep.id && ep.itemValue && !importPivotValues.has(ep.itemValue)) {
                  await deletePortalPivotColumn(ep.id, false, false, false)
                  pivotStat.deleted++
                }
              }
              for (const c of item.pivotColumns) {
                const { id: _srcPivotId, ...pivotData } = c
                const existingPivot = c.itemValue ? pivotMap.get(c.itemValue) : null
                if (existingPivot?.id) {
                  await updatePortalPivotColumn(
                    { ...pivotData, id: existingPivot.id, tableId },
                    false, false, false
                  )
                  pivotStat.updated++
                } else {
                  await addPortalPivotColumn(
                    { ...pivotData, tableId },
                    false, false, false
                  )
                  pivotStat.added++
                }
              }
            }
          }
          message.success(`导入完成：表新增 ${added} / 更新 ${updated}，` +
            `筛选器新增 ${filterStat.added} / 更新 ${filterStat.updated} / 删除 ${filterStat.deleted}，` +
            `透视列新增 ${pivotStat.added} / 更新 ${pivotStat.updated} / 删除 ${pivotStat.deleted}`)
          // 刷新列表
          await loadTableList()
        } catch (error: any) {
          message.error('导入失败: ' + (error?.message || '未知错误'))
        } finally {
          reportImporting.value = false
        }
      }
    })
  } catch (error: any) {
    message.error('文件解析失败，请确保是有效的JSON文件')
  }
}

// 删除表格配置
const handleDeleteTable = async (table: PortalTableVO) => {
  try {
    await deletePortalTable(table.id!)
    message.success('删除成功')
    if (selectedTable.value?.id === table.id) {
      selectedTable.value = null
    }
    await loadTableList()
  } catch (error) {
    console.error('删除失败:', error)
  }
}

// 取消
const handleCancel = () => {
  visible.value = false
}
</script>

<style scoped lang="less">
.table-config-container {
  display: flex;
  gap: 16px;
  height: 100%;
}

.table-list-panel {
  width: 240px;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.panel-header {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-subtle);
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 500;
  background: var(--bg-hover);
  border-radius: 8px 8px 0 0;
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.table-item {
  padding: 10px 12px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
  transition: all 0.2s;

  &:hover {
    background: #f5f5f5;
  }

  &.active {
    background: var(--accent-soft);
    border: 1px solid var(--accent);
  }
}

.table-item-content {
  flex: 1;
  min-width: 0;
}

.table-name {
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.table-info {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-top: 4px;
}

.table-item-actions {
  flex-shrink: 0;
}

.config-detail-panel {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  // tab 布局后各配置域独立擑满高度，无需外层滚动
  overflow: hidden;
}

// 配置域三 tab 布局：tab 内容擑满剩余高度
.config-tabs {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;

  :deep(.ant-tabs-nav) {
    margin-bottom: 12px;
  }

  :deep(.ant-tabs-content-holder) {
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  :deep(.ant-tabs-content) {
    height: 100%;
  }

  :deep(.ant-tabs-tabpane) {
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
}
</style>
