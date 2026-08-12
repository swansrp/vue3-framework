<template>
  <div class="tab-scroll">
    <!-- Table 基础配置 -->
    <div class="basic-config-section">
      <div class="section-title">
        <span>基础配置</span>
        <a-space :size="4">
          <a-button
            size="small"
            :loading="exporting"
            @click="emit('export')"
          >
            <template #icon>
              <DownloadOutlined />
            </template>
            导出配置
          </a-button>
          <input
            ref="reportFileInputRef"
            type="file"
            accept=".json"
            style="display: none"
            @change="handleReportFileChange"
          />
          <a-button
            size="small"
            :loading="importing"
            @click="reportFileInputRef?.click()"
          >
            <template #icon>
              <UploadOutlined />
            </template>
            导入配置
          </a-button>
          <a-button
            type="primary"
            size="small"
            :loading="saving"
            @click="handleSaveTable"
          >
            保存基础配置
          </a-button>
        </a-space>
      </div>
      <div class="section-content">
        <a-form
          :model="tableForm"
          layout="inline"
        >
          <a-form-item label="表格编码">
            <a-input
              v-model:value="tableForm.tableCode"
              placeholder="请输入表格编码"
              style="width: 150px"
            />
          </a-form-item>
          <a-form-item label="筛选栏宽度">
            <a-input-number
              v-model:value="tableForm.filterWidth"
              :min="100"
              :max="500"
              style="width: 80px"
            />
          </a-form-item>
          <a-form-item label="标题间隔">
            <a-input-number
              v-model:value="tableForm.paddingTh"
              :min="0"
              :max="50"
              style="width: 40px"
            />
          </a-form-item>
          <a-form-item label="条目间隔">
            <a-input-number
              v-model:value="tableForm.paddingTd"
              :min="0"
              :max="50"
              style="width: 40px"
            />
          </a-form-item>
          <a-form-item label="下载">
            <a-select
              v-model:value="tableForm.downloadAble"
              style="width: 80px"
            >
              <a-select-option value="1">
                允许
              </a-select-option>
              <a-select-option value="0">
                禁用
              </a-select-option>
            </a-select>
          </a-form-item>
          <a-form-item label="透视模式">
            <a-select
              v-model:value="tableForm.pivotMode"
              style="width: 80px"
            >
              <a-select-option value="1">
                开启
              </a-select-option>
              <a-select-option value="0">
                关闭
              </a-select-option>
            </a-select>
          </a-form-item>
          <a-form-item label="状态">
            <a-select
              v-model:value="tableForm.status"
              style="width: 80px"
            >
              <a-select-option value="1">
                启用
              </a-select-option>
              <a-select-option value="0">
                禁用
              </a-select-option>
            </a-select>
          </a-form-item>
        </a-form>

        <!-- 筛选列配置(透视模式下由行维度字段配置取代，隐藏) -->
        <div
          v-if="tableForm.pivotMode !== '1'"
          class="filter-columns-config"
        >
          <div class="filter-columns-header">
            <span class="filter-columns-title">筛选列配置</span>
            <span class="filter-columns-count">（已排除 {{ excludedColumnCount }} 列）</span>
          </div>
          <div class="filter-columns-list">
            <a-checkbox
              v-for="column in portalConfig?.columns || []"
              :key="column.property"
              v-model:checked="column.checked"
            >
              {{ column.displayName }} ({{ column.property }})
            </a-checkbox>
          </div>
        </div>

        <!-- 行维度字段配置(透视模式，样式同筛选列配置) -->
        <div
          v-if="tableForm.pivotMode === '1'"
          class="filter-columns-config"
        >
          <div class="filter-columns-header">
            <span class="filter-columns-title">行维度字段配置</span>
            <span class="filter-columns-count">（已勾选 {{ pivotGroupFields.length }} 个字段）</span>
          </div>
          <div class="filter-columns-list">
            <a-checkbox-group v-model:value="pivotGroupFields">
              <a-checkbox
                v-for="field in availableFields"
                :key="field.property"
                :value="field.property"
              >
                {{ field.displayName }} ({{ field.property }})
              </a-checkbox>
            </a-checkbox-group>
          </div>
          <!-- 行维度顺序调整(决定 group by 层级) -->
          <div
            v-if="pivotGroupFields.length > 0"
            class="pivot-group-order"
          >
            <span class="pivot-group-order-title">行维度顺序（自上而下的分组层级，也是排序优先级）：</span>
            <div
              v-for="(fieldProp, index) in pivotGroupFields"
              :key="fieldProp"
              class="pivot-group-order-item"
            >
              <span class="measure-index">{{ index + 1 }}</span>
              <span class="pivot-group-order-name">{{ pivotGroupFieldDisplayName(fieldProp) }}</span>
              <a-checkbox
                :checked="!pivotGroupHiddenFields.includes(fieldProp)"
                @change="(e: any) => togglePivotGroupFieldDisplay(fieldProp, e.target.checked)"
              >
                表格显示
              </a-checkbox>
              <!-- 聚合结果排序: 0=正序 1=倒序(PORTAL_SORT_DICT), 未配置=不排序 -->
              <a-select
                :value="pivotGroupSorts[fieldProp]"
                size="small"
                style="width: 96px"
                placeholder="不排序"
                allow-clear
                @change="(val: any) => setPivotGroupFieldSort(fieldProp, val)"
              >
                <a-select-option :value="0">
                  正序
                </a-select-option>
                <a-select-option :value="1">
                  倒序
                </a-select-option>
              </a-select>
              <!-- 排序优先级: 多个字段配置排序时按行维度顺序生效, 随 ↑↓ 调整自动重算 -->
              <a-tag
                v-if="pivotGroupSortPriority[fieldProp]"
                color="blue"
              >
                排序优先级 {{ pivotGroupSortPriority[fieldProp] }}
              </a-tag>
              <a-button
                type="text"
                size="small"
                :disabled="index === 0"
                @click="movePivotGroupField(index, -1)"
              >
                <template #icon>
                  <ArrowUpOutlined />
                </template>
              </a-button>
              <a-button
                type="text"
                size="small"
                :disabled="index === pivotGroupFields.length - 1"
                @click="movePivotGroupField(index, 1)"
              >
                <template #icon>
                  <ArrowDownOutlined />
                </template>
              </a-button>
            </div>
          </div>
        </div>

        <!-- 聚合配置(透视模式，与行维度同存 sys_portal_table，合并到基础配置) -->
        <div
          v-if="tableForm.pivotMode === '1'"
          class="filter-columns-config measure-config-section"
        >
          <div class="filter-columns-header">
            <span class="filter-columns-title">聚合字段（度量列）</span>
            <a-button
              type="primary"
              size="small"
              @click="pivotMeasureRows.push({ field: '', label: '', agg: 'sum' })"
            >
              <template #icon>
                <PlusOutlined />
              </template>
              添加聚合字段
            </a-button>
          </div>
          <div class="measure-rows">
            <a-empty
              v-if="pivotMeasureRows.length === 0"
              description="暂无聚合字段，点击右上角添加"
            />
            <div
              v-for="(measure, index) in pivotMeasureRows"
              :key="index"
              class="pivot-measure-row"
            >
              <span class="measure-index">{{ index + 1 }}</span>
              <a-select
                v-model:value="measure.field"
                :options="availableFields.map((f) => ({ label: `${f.displayName} (${f.property})`, value: f.property }))"
                placeholder="聚合字段"
                show-search
                :filter-option="filterOption"
                style="width: 300px"
              />
              <a-input
                v-model:value="measure.label"
                placeholder="显示名"
                style="width: 180px"
              />
              <a-select
                v-model:value="measure.agg"
                style="width: 120px"
              >
                <a-select-option value="sum">
                  求和
                </a-select-option>
                <a-select-option value="count">
                  计数
                </a-select-option>
                <a-select-option value="countDistinct">
                  去重计数
                </a-select-option>
                <a-select-option value="avg">
                  平均
                </a-select-option>
                <a-select-option value="min">
                  最小
                </a-select-option>
                <a-select-option value="max">
                  最大
                </a-select-option>
              </a-select>
              <a-button
                type="link"
                danger
                size="small"
                @click="pivotMeasureRows.splice(index, 1)"
              >
                删除
              </a-button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  DownloadOutlined,
  PlusOutlined,
  UploadOutlined,
} from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { computed, ref, watch } from 'vue'

import { PivotMeasureVO, PortalTableVO, updatePortalTable } from '@/framework/apis/portal/table'

const props = defineProps<{
  table: PortalTableVO;
  portalConfig?: any;
  availableFields: Array<{
    key: string;
    title: string;
    property: string;
    displayName: string;
    reference: string;
  }>;
  exporting?: boolean;
  importing?: boolean;
}>()

const emit = defineEmits<{
  'saved': [];
  'export': [];
  'import': [file: File];
}>()

const saving = ref(false)
const reportFileInputRef = ref<HTMLInputElement>()

// 表单编辑对象：指向与 table prop 同一引用，避免模板直接对 prop 写入触发 vue/no-mutating-props
const tableForm = computed<PortalTableVO>(() => props.table)

// ==================== 透视配置(基础配置 tab 内的行维度/度量编辑状态) ====================
// 行维度字段勾选列表(保存时序列化到 table.groupByFields，数组顺序即分组层级顺序)
const pivotGroupFields = ref<string[]>([])

// 行维度字段显示名
const pivotGroupFieldDisplayName = (property: string) => {
  const field = props.availableFields.find((f) => f.property === property)
  return field ? `${field.displayName} (${field.property})` : property
}

// 调整行维度字段顺序(交换相邻项)
const movePivotGroupField = (index: number, delta: number) => {
  const target = index + delta
  if (target < 0 || target >= pivotGroupFields.value.length) return
  const arr = pivotGroupFields.value.slice()
  ;[arr[index], arr[target]] = [arr[target], arr[index]]
  pivotGroupFields.value = arr
}
// 隐藏的行维度字段(仍参与 group by，仅不在表格中显示，常用于行粒度细化/筛选目标)
const pivotGroupHiddenFields = ref<string[]>([])
// 切换行维度字段是否在表格中显示
const togglePivotGroupFieldDisplay = (fieldProp: string, display: boolean) => {
  const idx = pivotGroupHiddenFields.value.indexOf(fieldProp)
  if (display && idx >= 0) {
    pivotGroupHiddenFields.value.splice(idx, 1)
  } else if (!display && idx < 0) {
    pivotGroupHiddenFields.value.push(fieldProp)
  }
}
// 行维度字段排序配置(作用于 group by 后的聚合行; 0=正序 1=倒序, 无 key=不排序)
const pivotGroupSorts = ref<Record<string, number>>({})
// 设置行维度字段排序(清空时移除配置)
const setPivotGroupFieldSort = (fieldProp: string, sort: number | undefined) => {
  if (sort === 0 || sort === 1) {
    pivotGroupSorts.value[fieldProp] = sort
  } else {
    delete pivotGroupSorts.value[fieldProp]
  }
}
// 排序优先级: 按行维度顺序给已配置排序的字段编号(1=第一排序维度), 随顺序调整自动重算
const pivotGroupSortPriority = computed(() => {
  const map: Record<string, number> = {}
  let priority = 0
  for (const fieldProp of pivotGroupFields.value) {
    if (pivotGroupSorts.value[fieldProp] === 0 || pivotGroupSorts.value[fieldProp] === 1) {
      map[fieldProp] = ++priority
    }
  }
  return map
})
// 度量列编辑行(保存时序列化到 table.pivotMeasures)
const pivotMeasureRows = ref<PivotMeasureVO[]>([])

// 解析 pivotMeasures JSON 到编辑行
const parsePivotMeasures = (json: string | undefined) => {
  if (!json) {
    pivotMeasureRows.value = []
    return
  }
  try {
    const parsed = JSON.parse(json)
    pivotMeasureRows.value = Array.isArray(parsed)
      ? parsed.map((m: any) => ({ field: m.field || '', label: m.label || '', agg: m.agg || 'sum' }))
      : []
  } catch (e) {
    console.warn('解析透视度量配置失败:', e)
    pivotMeasureRows.value = []
  }
}

// 初始化筛选列配置
const initFilterColumnsConfig = () => {
  if (!props.portalConfig?.columns) return

  // 获取当前要排除的列名列表
  const excludedColumns = props.table.filterColumns
    ? props.table.filterColumns.split(',').map((s: string) => s.trim())
    : []

  // 默认所有列都 checked = true，排除的列设为 false
  props.portalConfig.columns.forEach((column: any) => {
    if (excludedColumns.includes(column.property)) {
      column.checked = false
    } else {
      column.checked = true
    }
  })
}

// 计算已排除的列数量
const excludedColumnCount = computed(() => {
  if (!props.portalConfig?.columns) return 0
  return props.portalConfig.columns.filter((col: any) => col.checked === false).length
})

// 切换表格时初始化筛选列勾选与透视行维度/度量编辑状态
watch(
  () => props.table,
  (table) => {
    if (!table) return
    initFilterColumnsConfig()
    // 初始化透视配置(兼容旧逗号串格式：默认全部显示、不排序)
    const rawGroupByFields = table.groupByFields || ''
    pivotGroupSorts.value = {}
    if (rawGroupByFields.trim().startsWith('[')) {
      try {
        const list = JSON.parse(rawGroupByFields) as Array<{ field: string; display?: boolean; sort?: number }>
        pivotGroupFields.value = list.map((item) => item.field)
        pivotGroupHiddenFields.value = list.filter((item) => item.display === false).map((item) => item.field)
        list.forEach((item) => {
          if (item.sort === 0 || item.sort === 1) {
            pivotGroupSorts.value[item.field] = item.sort
          }
        })
      } catch (e) {
        console.warn('解析行维度配置失败，按逗号串兜底:', e)
        pivotGroupFields.value = rawGroupByFields.split(',').map((s: string) => s.trim()).filter((s: string) => s)
        pivotGroupHiddenFields.value = []
      }
    } else {
      pivotGroupFields.value = rawGroupByFields.split(',').map((s: string) => s.trim()).filter((s: string) => s)
      pivotGroupHiddenFields.value = []
    }
    parsePivotMeasures(table.pivotMeasures)
  },
  { immediate: true }
)

// 穿梭框过滤
const filterOption = (inputValue: string, option: any) => {
  const label = option.title || option.label || ''
  return label.toLowerCase().indexOf(inputValue.toLowerCase()) > -1
}

// 导入配置文件(实现委托父组件)
const handleReportFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  target.value = ''
  emit('import', file)
}

// 保存表格配置
const handleSaveTable = async () => {
  if (!props.table) return
  saving.value = true
  // 经 tableForm 别名写入同一对象，避免直接对 prop 赋值
  const table = tableForm.value
  try {
    // 构建 filterColumns：收集所有 checked = false 的列名
    const excludedColumns = (props.portalConfig?.columns || [])
      .filter((col: any) => col.checked === false)
      .map((col: any) => col.property)

    // 如果没有排除的列，设为 null；否则用逗号连接
    table.filterColumns =
      excludedColumns.length > 0 ? excludedColumns.join(',') : null

    // 透视模式：序列化行维度与度量列配置
    if (table.pivotMode === '1') {
      // 行维度：按用户调整的顺序序列化为 JSON(顺序即分组层级，display=false 仅参与 group by 不显示，sort=聚合行排序)
      const groupConfig = pivotGroupFields.value.map((field) => {
        const cfg: { field: string; display: boolean; sort?: number } = {
          field,
          display: !pivotGroupHiddenFields.value.includes(field),
        }
        if (pivotGroupSorts.value[field] === 0 || pivotGroupSorts.value[field] === 1) {
          cfg.sort = pivotGroupSorts.value[field]
        }
        return cfg
      })
      table.groupByFields =
        groupConfig.length > 0 ? JSON.stringify(groupConfig) : undefined
      // 清理已取消勾选字段在隐藏列表/排序配置中的残留
      pivotGroupHiddenFields.value = pivotGroupHiddenFields.value.filter((f) => pivotGroupFields.value.includes(f))
      Object.keys(pivotGroupSorts.value).forEach((f) => {
        if (!pivotGroupFields.value.includes(f)) {
          delete pivotGroupSorts.value[f]
        }
      })

      // 度量列：过滤掉未选字段的空行
      const validMeasures = pivotMeasureRows.value.filter((m) => m.field)
      table.pivotMeasures =
        validMeasures.length > 0 ? JSON.stringify(validMeasures) : undefined
      // 保存后同步移除空行，界面与落库数据一致
      pivotMeasureRows.value = validMeasures
    }

    await updatePortalTable(table)
    message.success('保存成功')
    emit('saved')
  } catch (error) {
    console.error('保存失败:', error)
  } finally {
    saving.value = false
  }
}
</script>

<style scoped lang="less">
@import './portal-table-config.less';

.basic-config-section {
  flex-shrink: 0;
  margin-bottom: 16px;
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  overflow: hidden;
}

.section-content {
  padding: 16px;
}

// 聚合配置 tab 度量行序号
.measure-index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--primary-bg, #e6f4ff);
  color: var(--primary, #1677ff);
  font-size: 12px;
  flex-shrink: 0;
}

.filter-columns-config {
  margin-top: 16px;
  border: 1px solid var(--border-subtle);
  border-radius: 6px;
  background: var(--bg-hover);

  .filter-columns-header {
    padding: 10px 16px;
    display: flex;
    align-items: center;
    gap: 8px;

    .filter-columns-title {
      font-weight: 500;
      font-size: 14px;
      color: var(--text-primary);
    }

    .filter-columns-count {
      font-size: 13px;
      color: var(--text-tertiary);
    }
  }

  .filter-columns-list {
    padding: 12px 16px;
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    border-top: 1px solid var(--border-subtle);
    max-height: 300px;
    overflow-y: auto;

    .ant-checkbox-wrapper {
      margin: 0;
      padding: 6px 10px;
      background: var(--bg-elevated);
      border: 1px solid var(--border-subtle);
      border-radius: 4px;
      transition: all 0.2s;

      &:hover {
        border-color: var(--accent);
        background: var(--accent-soft);
      }

      &.ant-checkbox-wrapper-checked {
        background: var(--accent-soft);
        border-color: var(--accent);
        color: var(--accent);
        font-weight: 500;
      }

      &.ant-checkbox-wrapper-disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    }
  }
}

// 行维度顺序调整栏
.pivot-group-order {
  padding: 10px 16px;
  border-top: 1px solid var(--border-subtle);
  display: flex;
  flex-direction: column;
  gap: 6px;

  .pivot-group-order-title {
    font-size: 13px;
    color: var(--text-secondary);
  }

  .pivot-group-order-item {
    display: flex;
    align-items: center;
    gap: 8px;

    .pivot-group-order-name {
      flex: 1;
    }
  }
}

// 聚合配置(并入基础配置 tab，卡片样式同 filter-columns-config)：度量行纵向排列
.measure-config-section {
  .measure-rows {
    padding: 12px 16px;
    border-top: 1px solid var(--border-subtle);
  }

  .pivot-measure-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .pivot-measure-row + .pivot-measure-row {
    margin-top: 10px;
  }
}
</style>
