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
            导出本表格
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
            导入到本表格
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
        >
          <!-- 4 列网格排布: 两行、标签与控件逐列对齐, 不随窗口宽度换行错乱 -->
          <div class="basic-form-grid">
            <a-form-item label="表格编码">
              <a-input
                v-model:value="tableForm.tableCode"
                placeholder="请输入表格编码"
              />
            </a-form-item>
            <a-form-item label="筛选栏宽度">
              <a-input-number
                v-model:value="tableForm.filterWidth"
                :min="100"
                :max="500"
                style="width: 100%"
              />
            </a-form-item>
            <a-form-item label="标题间隔">
              <a-input-number
                v-model:value="tableForm.paddingTh"
                :min="0"
                :max="50"
                style="width: 100%"
              />
            </a-form-item>
            <a-form-item label="条目间隔">
              <a-input-number
                v-model:value="tableForm.paddingTd"
                :min="0"
                :max="50"
                style="width: 100%"
              />
            </a-form-item>
            <a-form-item label="下载">
              <a-select
                v-model:value="tableForm.downloadAble"
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
              >
                <a-select-option value="1">
                  开启
                </a-select-option>
                <a-select-option value="0">
                  关闭
                </a-select-option>
              </a-select>
            </a-form-item>
            <!-- 锁定方向(仅透视模式): s-table 两边同时锁定会异常, 只能选一边;
                 左锁→行维度字段逐个勾选左锁定, 右锁→度量列逐个勾选右锁定 -->
            <a-form-item
              v-if="tableForm.pivotMode === '1'"
              label="锁定方向"
            >
              <a-select
                v-model:value="pivotLockSide"
                @change="onLockSideChange"
              >
                <a-select-option value="">
                  不锁定
                </a-select-option>
                <a-select-option value="left">
                  左锁
                </a-select-option>
                <a-select-option value="right">
                  右锁
                </a-select-option>
              </a-select>
            </a-form-item>
            <!-- 度量布局(仅透视模式且多度量时生效): col=度量横向平铺为列, row=度量纵向展开为行 -->
            <a-form-item
              v-if="tableForm.pivotMode === '1'"
              label="度量布局"
            >
              <a-select
                v-model:value="tableForm.pivotMeasureLayout"
              >
                <a-select-option value="col">
                  列(度量横向平铺)
                </a-select-option>
                <a-select-option value="row">
                  行(度量纵向展开)
                </a-select-option>
              </a-select>
            </a-form-item>
            <!-- 合计列位置(仅透视+row布局生效): first=透视列之前(紧跟指标列), last=透视列之后(默认) -->
            <a-form-item
              v-if="tableForm.pivotMode === '1' && tableForm.pivotMeasureLayout === 'row'"
              label="合计列位置"
            >
              <a-select v-model:value="pivotTotalPosModel">
                <a-select-option value="first">
                  靠前(透视列之前)
                </a-select-option>
                <a-select-option value="last">
                  靠后(透视列之后)
                </a-select-option>
              </a-select>
            </a-form-item>
            <a-form-item label="状态">
              <a-select
                v-model:value="tableForm.status"
              >
                <a-select-option value="1">
                  启用
                </a-select-option>
                <a-select-option value="0">
                  禁用
                </a-select-option>
              </a-select>
            </a-form-item>
            <!-- 报表默认排序: 普通报表把 JSON 下发给查询接口当 sortList,
                 透视模式在聚合结果行上排(候选=行维度字段+聚合度量, 与「行维度顺序」里的逐字段排序并存) -->
            <a-form-item label="排序字段">
              <a-select
                v-model:value="sortColumn"
                :options="sortFieldOptions"
                placeholder="不排序"
                allow-clear
                show-search
                :filter-option="filterOption"
              />
            </a-form-item>
            <a-form-item label="排序方向">
              <a-select
                v-model:value="sortType"
                :disabled="!sortColumn"
              >
                <a-select-option :value="0">
                  正序
                </a-select-option>
                <a-select-option :value="1">
                  倒序
                </a-select-option>
              </a-select>
            </a-form-item>
          </div>
        </a-form>

        <!-- 表格列显示配置(勾选=显示; 透视模式下由行维度字段配置取代，隐藏) -->
        <div
          v-if="tableForm.pivotMode !== '1'"
          class="filter-columns-config"
        >
          <div class="filter-columns-header">
            <span class="filter-columns-title">表格列显示配置</span>
            <span class="filter-columns-count">（已排除 {{ excludedColumnCount }} 列）</span>
            <a-space
              class="filter-columns-actions"
              :size="4"
            >
              <a-button
                size="small"
                @click="checkAllFilterColumns"
              >
                全选
              </a-button>
              <a-button
                size="small"
                @click="invertFilterColumns"
              >
                反选
              </a-button>
            </a-space>
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
              <!-- 字段名靠左: 低维度在左, 右侧控件列固定顺序, 有无排序均对齐 -->
              <span class="pivot-group-order-name">{{ pivotGroupFieldDisplayName(fieldProp) }}</span>
              <a-checkbox
                :checked="!pivotGroupHiddenFields.includes(fieldProp)"
                @change="(e: any) => togglePivotGroupFieldDisplay(fieldProp, e.target.checked)"
              >
                表格显示
              </a-checkbox>
              <!-- 左锁定方向下逐字段勾选锁定 -->
              <a-checkbox
                v-if="pivotLockSide === 'left'"
                :checked="pivotGroupFixedFields.includes(fieldProp)"
                @change="(e: any) => togglePivotGroupFieldFixed(fieldProp, e.target.checked)"
              >
                锁定
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
              <!-- 排序优先级占位固定宽度: 无排序的行保持对齐 -->
              <span class="pivot-sort-priority">{{ pivotGroupSortPriority[fieldProp] || '—' }}</span>
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
              @click="pivotMeasureRows.push({ field: '', label: '', agg: 'sum', fixed: false, hideZero: false })"
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
              <!-- 仅求和项开放: sum 去掉 0/NULL 行合计仍恒等, 其余聚合滤零行会与单元格数字对不上 -->
              <a-checkbox
                v-if="measure.agg === 'sum'"
                v-model:checked="measure.hideZero"
              >
                钻取隐藏零值
              </a-checkbox>
              <!-- 右锁定方向下逐度量勾选锁定 -->
              <a-checkbox
                v-if="pivotLockSide === 'right'"
                v-model:checked="measure.fixed"
              >
                锁定
              </a-checkbox>
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
        <!-- Tab 成员配置(多Tab页面): 配置后本表格即宿主(路由入口), 左侧筛选栏以本表格为准 -->
        <div class="filter-columns-config tab-items-config">
          <div class="filter-columns-header">
            <span class="filter-columns-title">Tab 成员配置（多Tab页面）</span>
            <a-button
              size="small"
              @click="addTabMemberRow"
            >
              <template #icon>
                <PlusOutlined />
              </template>
              添加 Tab 成员
            </a-button>
          </div>
          <div class="tab-items-body">
            <div class="tab-items-tip">
              勾选后本表格作为页面宿主: 菜单路由用本表格编码, 左侧筛选栏/外观均以本表格为准;
              成员各自的筛选项在多Tab页面中不生效。
            </div>
            <div class="tab-self-row">
              <a-checkbox
                :checked="tabSelfEnabled"
                @change="(e: any) => (tabSelfEnabled = e.target.checked)"
              >
                本表格作为一个 Tab 页
              </a-checkbox>
              <a-input
                v-if="tabSelfEnabled"
                v-model:value="tabSelfLabel"
                :placeholder="tableForm.tableCode || '本表格 Tab 名称'"
                style="width: 220px"
              />
            </div>
            <div class="tab-member-rows">
              <a-empty
                v-if="tabMemberRows.length === 0"
                description="暂无 Tab 成员, 仅本表格单页展示"
              />
              <div
                v-for="(member, index) in tabMemberRows"
                :key="index"
                class="pivot-measure-row tab-member-row"
              >
                <span class="measure-index">{{ index + (tabSelfEnabled ? 2 : 1) }}</span>
                <a-select
                  v-model:value="member.tableId"
                  :options="tabMemberOptions(index)"
                  placeholder="选择成员表格"
                  show-search
                  :filter-option="filterOption"
                  style="width: 300px"
                />
                <a-input
                  v-model:value="member.label"
                  placeholder="Tab 名称(留空用表格编码)"
                  style="width: 200px"
                />
                <a-button
                  type="text"
                  size="small"
                  :disabled="index === 0"
                  @click="moveTabMemberRow(index, -1)"
                >
                  <template #icon>
                    <ArrowUpOutlined />
                  </template>
                </a-button>
                <a-button
                  type="text"
                  size="small"
                  :disabled="index === tabMemberRows.length - 1"
                  @click="moveTabMemberRow(index, 1)"
                >
                  <template #icon>
                    <ArrowDownOutlined />
                  </template>
                </a-button>
                <a-button
                  type="link"
                  danger
                  size="small"
                  @click="tabMemberRows.splice(index, 1)"
                >
                  删除
                </a-button>
              </div>
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
  /** 同底表下全部表格配置(多Tab成员候选) */
  tableList?: PortalTableVO[];
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
// 锁定方向: ''=不锁定 left=左锁(行维度逐个勾选) right=右锁(度量逐个勾选);
// s-table 两边同时锁定会渲染异常, 切换方向时清空对侧勾选
const pivotLockSide = ref<'' | 'left' | 'right'>('')
// 左锁定的行维度字段列表(保存时写入 groupByFields JSON 项的 fixed)
const pivotGroupFixedFields = ref<string[]>([])
// 切换行维度字段是否在表格中显示(隐藏时同步清除左锁定勾选, 避免残留无 UI 入口的锁定状态)
const togglePivotGroupFieldDisplay = (fieldProp: string, display: boolean) => {
  const idx = pivotGroupHiddenFields.value.indexOf(fieldProp)
  if (display && idx >= 0) {
    pivotGroupHiddenFields.value.splice(idx, 1)
  } else if (!display && idx < 0) {
    pivotGroupHiddenFields.value.push(fieldProp)
    const fixedIdx = pivotGroupFixedFields.value.indexOf(fieldProp)
    if (fixedIdx >= 0) {
      pivotGroupFixedFields.value.splice(fixedIdx, 1)
    }
  }
}
// 切换行维度字段左锁定勾选
const togglePivotGroupFieldFixed = (fieldProp: string, fixed: boolean) => {
  const idx = pivotGroupFixedFields.value.indexOf(fieldProp)
  if (fixed && idx < 0) {
    pivotGroupFixedFields.value.push(fieldProp)
  } else if (!fixed && idx >= 0) {
    pivotGroupFixedFields.value.splice(idx, 1)
  }
}
// 锁定方向切换: 切到某方向时默认全选该方向字段(可手动取消), 同时清空对侧勾选(保证只锁一边)
const onLockSideChange = () => {
  if (pivotLockSide.value === 'left') {
    // 只全选可见字段: 隐藏字段无「锁定」勾选入口, 全选会落库无感知的锁定状态
    pivotGroupFixedFields.value = pivotGroupFields.value.filter(f => !pivotGroupHiddenFields.value.includes(f))
    pivotMeasureRows.value.forEach((m) => { m.fixed = false })
  } else if (pivotLockSide.value === 'right') {
    pivotGroupFixedFields.value = []
    pivotMeasureRows.value.forEach((m) => { m.fixed = true })
  } else {
    pivotGroupFixedFields.value = []
    pivotMeasureRows.value.forEach((m) => { m.fixed = false })
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

// 合计列位置: 缺省视为 last(与列默认值一致), 避免首开下拉为空
const pivotTotalPosModel = computed<string>({
  get: () => tableForm.value.pivotTotalPos || 'last',
  set: (val) => { tableForm.value.pivotTotalPos = val }
})

// ==================== 报表默认排序 ====================
// 落库结构同 sys_portal.default_sort: [{property, type}] type 0=正序 1=倒序
const sortColumn = ref<string | undefined>(undefined)
// 默认正序: 只选字段不改方向时得到 ASC, 方向下拉在未按字段前置灰
const sortType = ref<number>(0)

/**
 * 排序字段候选
 * - 普通报表: 全部列(直接交给后端 ORDER BY 真实列)
 * - 透视模式: 外层只有 group by 列与聚合度量可排, 故取已勾选的行维度(含隐藏项) + 已填的聚合度量;
 *   同名字段既是行维度又是度量时按行维度取值(选项分组已标明归属)
 */
const sortFieldOptions = computed(() => {
  const displayNameOf = (property: string) =>
    props.availableFields.find((f) => f.property === property)?.displayName || property
  if (tableForm.value.pivotMode === '1') {
    return [
      {
        label: '行维度字段',
        options: pivotGroupFields.value.map((p) => ({ value: p, label: `${displayNameOf(p)} (${p})` }))
      },
      {
        label: '聚合度量',
        options: pivotMeasureRows.value
          .filter((m) => m.field)
          .map((m) => ({ value: m.field, label: `合计 ${m.label || displayNameOf(m.field)} (${m.agg || 'sum'})` }))
      }
    ]
  }
  return props.availableFields.map((f) => ({ label: `${f.displayName} (${f.property})`, value: f.property }))
})

/** 透视模式下当前可排序的字段集(行维度 + 度量), 用于拦掉切模式后失效的残留选择 */
const isSortableInPivot = (property: string) =>
  pivotGroupFields.value.includes(property) || pivotMeasureRows.value.some((m) => m.field === property)

// 解析 defaultSort JSON 到编辑状态(仅取第一项, 与 portal 级默认排序同约束)
const parseDefaultSort = (json: string | undefined) => {
  sortColumn.value = undefined
  sortType.value = 0
  if (!json) return
  try {
    const parsed = JSON.parse(json)
    const first = Array.isArray(parsed) ? parsed[0] : undefined
    if (first?.property) {
      sortColumn.value = first.property
      sortType.value = first.type === 1 ? 1 : 0
    }
  } catch (e) {
    console.warn('解析默认排序配置失败:', e)
  }
}

// ==================== Tab 成员配置(多Tab页面) ====================
// 本表格自身也作为一个 tab(默认勾选, 序列化时为 tabItems 首项)
const tabSelfEnabled = ref(true)
// 本表格的 tab 名称(留空用表格编码)
const tabSelfLabel = ref('')
// Tab 成员编辑行(保存时追加在自身之后序列化到 table.tabItems)
const tabMemberRows = ref<Array<{ tableId: number | undefined; label: string }>>([])

const addTabMemberRow = () => {
  tabMemberRows.value.push({ tableId: undefined, label: '' })
}

// 调整成员顺序(交换相邻项)
const moveTabMemberRow = (index: number, delta: number) => {
  const target = index + delta
  if (target < 0 || target >= tabMemberRows.value.length) return
  const arr = tabMemberRows.value.slice()
  ;[arr[index], arr[target]] = [arr[target], arr[index]]
  tabMemberRows.value = arr
}

// 成员候选: 同底表下其它表格, 且未被其它行选用(避免重复 tab)
const tabMemberOptions = (currentIndex: number) => {
  const usedIds = new Set(
    tabMemberRows.value
      .filter((_, i) => i !== currentIndex)
      .map((r) => r.tableId)
      .filter((id): id is number => id != null)
  )
  return (props.tableList || [])
    .filter((t) => t.id !== props.table.id && t.id != null && !usedIds.has(t.id))
    .map((t) => ({ label: `${t.tableCode} (ID:${t.id})`, value: t.id as number }))
}

// 解析 tabItems JSON 到编辑状态(首项为自身时还原勾选与名称)
const parseTabItems = (json: string | undefined) => {
  tabSelfEnabled.value = false
  tabSelfLabel.value = ''
  tabMemberRows.value = []
  if (!json) return
  try {
    const parsed = JSON.parse(json)
    if (!Array.isArray(parsed)) return
    parsed.forEach((it: any) => {
      const tableId = Number(it?.tableId)
      if (!Number.isFinite(tableId)) return
      if (tableId === props.table.id) {
        tabSelfEnabled.value = true
        tabSelfLabel.value = it?.label || ''
      } else {
        tabMemberRows.value.push({ tableId, label: it?.label || '' })
      }
    })
  } catch (e) {
    console.warn('解析 tabItems 失败:', e)
  }
}

// 解析 pivotMeasures JSON 到编辑行
const parsePivotMeasures = (json: string | undefined) => {
  if (!json) {
    pivotMeasureRows.value = []
    return
  }
  try {
    const parsed = JSON.parse(json)
    pivotMeasureRows.value = Array.isArray(parsed)
      ? parsed.map((m: any) => ({ field: m.field || '', label: m.label || '', agg: m.agg || 'sum', fixed: m.fixed === true, hideZero: m.hideZero === true }))
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

// 筛选列全选/反选(勾选=显示; 「已排除」数随勾选联动)
const checkAllFilterColumns = () => {
  const columns = props.portalConfig?.columns || []
  columns.forEach((column: any) => {
    column.checked = true
  })
}

const invertFilterColumns = () => {
  const columns = props.portalConfig?.columns || []
  columns.forEach((column: any) => {
    column.checked = !column.checked
  })
}

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
        const list = JSON.parse(rawGroupByFields) as Array<{ field: string; display?: boolean; sort?: number; fixed?: boolean }>
        pivotGroupFields.value = list.map((item) => item.field)
        pivotGroupHiddenFields.value = list.filter((item) => item.display === false).map((item) => item.field)
        pivotGroupFixedFields.value = list.filter((item) => item.fixed === true).map((item) => item.field)
        list.forEach((item) => {
          if (item.sort === 0 || item.sort === 1) {
            pivotGroupSorts.value[item.field] = item.sort
          }
        })
      } catch (e) {
        console.warn('解析行维度配置失败，按逗号串兜底:', e)
        pivotGroupFields.value = rawGroupByFields.split(',').map((s: string) => s.trim()).filter((s: string) => s)
        pivotGroupHiddenFields.value = []
        pivotGroupFixedFields.value = []
      }
    } else {
      pivotGroupFields.value = rawGroupByFields.split(',').map((s: string) => s.trim()).filter((s: string) => s)
      pivotGroupHiddenFields.value = []
      pivotGroupFixedFields.value = []
    }
    parsePivotMeasures(table.pivotMeasures)
    parseTabItems(table.tabItems)
    parseDefaultSort(table.defaultSort)
    // 锁定方向由两侧已存配置推导(界面保证只锁一边: 行维度有锁定→左锁, 度量有锁定→右锁)
    pivotLockSide.value = pivotGroupFixedFields.value.length > 0
      ? 'left'
      : (pivotMeasureRows.value.some((m) => m.fixed) ? 'right' : '')
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

    // 默认排序: 未选字段写 '[]' 而非 null —— update 接口非 strict 模式会跳过 null, 无法清掉旧值
    // 透视模式下字段必须落在当前行维度/度量内, 否则渲染时命不中排序列(切模式残留的选择按不排序处理)
    let sortProperty: string | undefined = sortColumn.value
    if (sortProperty && table.pivotMode === '1' && !isSortableInPivot(sortProperty)) {
      sortProperty = undefined
    }
    table.defaultSort = sortProperty
      ? JSON.stringify([{ property: sortProperty, type: sortType.value }])
      : '[]'

    // 透视模式：序列化行维度与度量列配置
    if (table.pivotMode === '1') {
      // 行维度：按用户调整的顺序序列化为 JSON(顺序即分组层级，display=false 仅参与 group by 不显示，sort=聚合行排序，fixed=左锁方向下的锁定勾选)
      const groupConfig = pivotGroupFields.value.map((field) => {
        const cfg: { field: string; display: boolean; sort?: number; fixed?: boolean } = {
          field,
          display: !pivotGroupHiddenFields.value.includes(field),
        }
        if (pivotGroupSorts.value[field] === 0 || pivotGroupSorts.value[field] === 1) {
          cfg.sort = pivotGroupSorts.value[field]
        }
        if (pivotLockSide.value === 'left' && pivotGroupFixedFields.value.includes(field)) {
          cfg.fixed = true
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

      // 度量列：过滤掉未选字段的空行(非右锁方向时清掉锁定标记, 保证只锁一边)
      const validMeasures = pivotMeasureRows.value
        .filter((m) => m.field)
        .map((m) => ({
          ...m,
          fixed: pivotLockSide.value === 'right' ? m.fixed === true : false,
          // 防呆: 隐藏零值仅对 sum 有意义, 改成其余聚合后不留无效配置
          hideZero: m.agg === 'sum' && m.hideZero === true
        }))
      table.pivotMeasures =
        validMeasures.length > 0 ? JSON.stringify(validMeasures) : undefined
      // 保存后同步移除空行，界面与落库数据一致
      pivotMeasureRows.value = validMeasures
    }

    // Tab 成员: 自身(勾选时为首项) + 成员行, 数组序即 tab 顺序; 全空则回退单表页面
    const tabItemsPayload: Array<{ tableId: number; label?: string }> = []
    if (tabSelfEnabled.value && table.id != null) {
      tabItemsPayload.push({ tableId: table.id, ...(tabSelfLabel.value ? { label: tabSelfLabel.value } : {}) })
    }
    tabMemberRows.value
      .filter((r) => r.tableId != null)
      .forEach((r) => {
        tabItemsPayload.push({ tableId: r.tableId as number, ...(r.label ? { label: r.label } : {}) })
      })
    table.tabItems = tabItemsPayload.length > 0 ? JSON.stringify(tabItemsPayload) : undefined

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

// 基础配置表单: 4 列网格两行排布, 标签右对齐固定宽、控件擑满格宽, 逐列对齐
.basic-form-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px 24px;

  :deep(.ant-form-item) {
    margin: 0;
  }

  :deep(.ant-form-item-label) {
    // 84px 容纳五字标签(筛选栏宽度)+冒号, 避免贴住控件
    flex: 0 0 84px;
    text-align: right;

    > label {
      color: var(--text-secondary);
    }
  }

  :deep(.ant-form-item-control) {
    flex: 1;
    min-width: 0;
  }
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

    // 全选/反选按钮靠右
    .filter-columns-actions {
      margin-left: auto;
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

// 行维度顺序调整栏(字段名靠左, 右侧控件列固定宽度保证逐行对齐)
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
    gap: 10px;

    .pivot-group-order-name {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    // 排序优先级固定占位: 无排序的行显示 "—", 保证 ↑↓ 按钮逐行对齐
    .pivot-sort-priority {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      flex-shrink: 0;
      font-size: 12px;
      color: var(--accent, #1677ff);
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

// Tab 成员配置(多Tab页面)
.tab-items-config {
  .tab-items-body {
    padding: 12px 16px;
    border-top: 1px solid var(--border-subtle);
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .tab-items-tip {
    font-size: 12px;
    color: var(--text-tertiary);
    line-height: 1.6;
  }

  .tab-self-row {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .tab-member-row {
    margin-top: 0;
  }
}
</style>
