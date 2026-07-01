# Portal Component

> 高级动态表格组件 / Advanced Dynamic Table Component

基于 Surely Vue Table 封装的企业级动态表格组件，支持动态列配置、高级查询、多种展示模式（树/列表/网格）、行内编辑、导入导出、绑定关联等功能。

---

## Table of Contents

- [Basic Usage | 基本用法](#basic-usage--基本用法)
- [Props | 属性](#props--属性)
- [Slots | 插槽](#slots--插槽)
- [Emits | 事件](#emits--事件)
- [Expose | 暴露方法](#expose--暴露方法)
- [Types | 类型定义](#types--类型定义)

---

## Basic Usage | 基本用法

```vue
<template>
  <portal
    :table-id="tableId"
    :base-domain="baseDomain"
    :advance-condition="advanceCondition"
    :select-column-condition="selectColumnCondition"
    :select-column-list="selectColumnList"
    :distinct="distinct"
    :page-size="20"
    action-width="0"
    hide-refresh
    hide-row-selection
    mode-lock
    read-only
  >
    <template #bodyCell_customerNo="{ record }">
      <a :href="`https://example.com/customer/${record.customerNo}`" target="_blank">
        {{ record.customerNo }}
      </a>
    </template>
  </portal>
</template>

<script lang="ts" setup>
import Portal from '@/framework/components/common/Portal/index.vue'
</script>
```

---

## Props | 属性

### Core | 核心

| Prop | Type | Default | Required | Description |
|------|------|---------|----------|-------------|
| `tableId` | `string` | — | **Yes** | 表格 ID，配合后端指明表格用途，用于加载对应的列配置 |
| `baseDomain` | `string` | `'/' + package.name` | No | API 请求的基础域名，可通过环境变量动态切换 |
| `data` | `Array<any>` | `undefined` | No | 外部传入数据源。当提供此 prop 时，表格进入 **朴素模式（plain）**，不使用后端分页/排序/查询 |
| `readOnly` | `boolean` | `false` | No | 只读模式。屏蔽所有编辑、添加、删除、导入等操作，仅用于数据展示 |
| `currentPage` | `number` | `1` | No | 当前页码（受控属性） |
| `pageSize` | `number` | `10` | No | 每页显示条数 |
| `autoWidth` | `boolean` | `false` | No | 是否自动计算列宽，适应容器宽度 |
| `autoHeight` | `boolean` | `false` | No | 是否自动计算表格高度，适应容器高度 |

### UI Customization | UI 定制

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `actionWidth` | `number \| string` | `150` | "操作"列的宽度。设为 `0` 可隐藏操作列 |
| `indexWidth` | `number` | `80` | "序号"列的宽度 |
| `indexTitle` | `string` | `''` | "序号"列的标题，默认显示"序号" |
| `multiHeader` | `boolean` | `false` | 是否启用多级表头（根据 `displayGroupName` 分组） |
| `gridCardWidth` | `number` | `350` | Grid 模式下每张卡片的宽度（像素） |
| `showSearchTags` | `boolean` | `false` | 是否在表格上方显示当前搜索条件标签（可点击移除） |

### Query & Filter | 查询与过滤

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `advance` | `boolean` | `true` | 是否支持高级查询。后端已全面升级，默认均支持 |
| `advanceButton` | `boolean` | `false` | 是否显示高级查询按钮（多条件组合查询弹窗） |
| `statisticButton` | `boolean` | `false` | 是否显示统计按钮（弹出统计图表） |
| `selectColumnCondition` | `Map<string, string>` | `undefined` | 动态字段条件。控制查询视图模式（如 client/category 视图），将透传到后端请求体 |
| `selectColumnList` | `string[]` | `undefined` | 指定后端返回的列白名单。后端仅返回此列表中的字段 |
| `distinct` | `string` | `undefined` | 去重查询字段名。指定后后端对查询结果按该字段去重 |
| `advanceCondition` | `ConditionListType` | `undefined` | 默认高级查询条件。初始化时附加到查询条件中，用于穿透查询等场景 |
| `defaultSortColumn` | `Array<QuerySortType>` | `undefined` | 默认排序字段。每个元素 `{ property, type }`，type 0=升序 1=降序 |
| `computedColumns` | `Record<string, (row: any) => any>` | `undefined` | 计算列。键为列 dataIndex，值为计算函数，可基于行数据动态计算单元格值 |

### Visibility Control | 可见性控制

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `hideRefresh` | `boolean` | `false` | 隐藏刷新按钮 |
| `hideRowSelection` | `boolean` | `false` | 隐藏行选择复选框列 |
| `hideAdd` | `boolean` | `false` | 隐藏添加按钮 |
| `hideEdit` | `boolean` | `false` | 隐藏编辑按钮 |
| `hideDelete` | `boolean` | `false` | 隐藏删除按钮 |
| `hideImport` | `boolean` | `false` | 隐藏导入按钮 |
| `hideExport` | `boolean` | `false` | 隐藏导出按钮 |
| `hideAssociation` | `boolean` | `false` | 隐藏关联信息标签页 |
| `hidePagination` | `boolean` | `false` | 隐藏分页器 |
| `hideSizeChange` | `boolean` | `false` | 隐藏每页条数切换器 |

### Row Behavior | 行行为

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `singleSelect` | `boolean` | `false` | 是否单选模式。开启后一次仅能选中一行 |
| `rowAllowEdit` | `(record: any) => boolean` | `() => true` | 行级编辑权限判断函数。返回 `false` 则该行右键菜单禁用编辑 |
| `rowAllowDelete` | `(record: any) => boolean` | `() => true` | 行级删除权限判断函数。返回 `false` 则该行右键菜单禁用删除 |
| `rowAllowSelect` | `(record: any) => boolean` | `undefined` | 行级可选择判断函数。返回 `false` 则该行复选框禁用勾选 |
| `rowSelectProps` | `(record: any) => any` | `undefined` | 行选择属性配置函数。可返回 Ant Design 复选框的 props，如 `{ disabled: true }` |
| `rowExpandable` | `(record: DefaultRecordType) => boolean` | `undefined` | 行展开按钮显示判断函数。返回 `true` 则显示展开按钮 |
| `rowDragEnd` | `(data: Array<any>, currentPage: number, pageSize: number) => void` | `undefined` | 行拖拽排序结束回调。参数为拖拽后的数据源、当前页码、每页条数 |
| `textAreaInExpanded` | `boolean` | `false` | 长文本（TEXT_AREA 类型）是否在展开区域自动显示。启用后行数据过长时自动出现展开按钮 |

### Display Mode | 显示模式

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `showTree` | `boolean` | `false` | 初始化时是否默认展开树形结构侧栏 |
| `treeMode` | `boolean` | `false` | 是否以树形模式展示（侧栏树 + 右侧表格） |
| `listMode` | `boolean` | `false` | 是否以列表模式展示（卡片列表替代表格） |
| `gridMode` | `boolean` | `false` | 是否以网格模式展示（网格卡片替代表格） |
| `modeLock` | `boolean` | `true` | 是否锁定显示模式。`true` 时隐藏模式切换按钮 |
| `bindTabs` | `Array<PortalBindType>` | `undefined` | 关联信息标签页配置。配合树模式使用，展示选中实体的关联数据 |
| `treeCheckAble` | `boolean` | `false` | 绑定操作树的节点是否显示复选框（用于批量绑定/解绑） |
| `selectedTreeData` | `Array<any>` | `undefined` | 树形结构中当前选中项的数组。支持 `.sync` 双向绑定 |
| `checkStrictly` | `boolean` | `false` | 树形结构选择是否严格受控。`true` 时选中父节点不自动选中子节点 |
| `bindDefaultValue` | `any` | `undefined` | 绑定操作的默认值。用于 1:N 关系的 entity 字段默认值映射 |

### Advanced | 高级

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `query` | `(url: string, query: QueryType) => Promise<any>` | `undefined` | 自定义查询函数。替换默认的 API 查询逻辑，可用于对接外部数据源 |
| `columnFilter` | `(column: ColumnType) => boolean` | `(c) => c.checked` | 列过滤函数。返回 `true` 显示该列，可用于业务层按权限/场景动态过滤列 |
| `columnDisplayCustom` | `any` | `new Map()` | 列显示自定义配置。可覆盖列的显示样式、宽度、对齐方式等 |
| `downloadFileName` | `(config: TableConfigType) => string` | `(c) => c.title` | 导出文件的命名函数。接收表格配置对象，返回文件名 |
| `showLoading` | `boolean` | `false` | 是否在查询时显示全局加载遮罩 |

---

## Slots | 插槽

### Cell & Header | 单元格与表头

| Slot | Bindings | Description |
|------|----------|-------------|
| `bodyCell_{dataIndex}` | `{ column, record, index }` | **自定义单元格渲染**。按列 dataIndex 命名，覆盖该列的默认渲染逻辑。最常用的插槽，用于实现链接、图片、按钮等自定义内容 |
| `headerCell_{dataIndex}` | `{ column, title }` | 自定义表头渲染。按列 dataIndex 命名，覆盖该列表头的显示 |
| `customFilterDropdown_{dataIndex}` | `{ column, setSelectedKeys, selectedKeys, confirm, clearFilters }` | 自定义筛选下拉菜单。按列 dataIndex 命名，覆盖默认的列筛选器 |
| `contextmenuPopup_{dataIndex}` | `{ args }` | 自定义右键菜单。按列 dataIndex 命名，覆盖默认的右键菜单弹窗 |
| `cellEditor_{dataIndex}` | `{ column, modelValue, save, closeEditor, editorRef, getPopupContainer, record, recordIndexs }` | 自定义单元格编辑器。按列 dataIndex 命名，覆盖默认的单元格编辑组件 |

### Action & Index | 操作与序号

| Slot | Bindings | Description |
|------|----------|-------------|
| `action` | `{ column, columns, record, parsedRecord, portalConfig }` | 操作列自定义渲染。替换"操作"列的所有按钮 |
| `index` | `{ column, columns, record, parsedRecord, portalConfig }` | 序号列自定义渲染。替换默认序号显示 |

### Mode-specific | 模式相关

| Slot | Bindings | Description |
|------|----------|-------------|
| `list-mode-display` | `{ record }` | 列表模式下每条数据的自定义展示内容 |
| `grid-mode-display` | `{ record }` | Grid 模式下每张卡片的自定义展示内容 |
| `grid-mode-item-actions` | `{ record, index }` | Grid 模式下每张卡片底部的操作按钮区域 |

### Toolbar | 工具栏

| Slot | Bindings | Description |
|------|----------|-------------|
| `left-btns` | — | 工具栏左侧附加按钮区域 |
| `right-btns` | — | 工具栏右侧附加按钮区域 |
| `header-action` | — | Grid 模式下头部操作区域 |
| `footer-action` | — | 表格底部、分页器左侧的附加操作区域 |

### Other | 其他

| Slot | Bindings | Description |
|------|----------|-------------|
| `expandedRowRender` | `{ record, parsedRecord }` | 展开行内容渲染。配合 `rowExpandable` 使用 |

---

## Emits | 事件

| Event | Payload | Description |
|-------|---------|-------------|
| `configLoaded` | `(config, columnArray, columns, bindTabs)` | 表格配置加载完成后触发。包含完整配置对象、原始列数组、处理后的列数组、关联标签配置 |
| `update:selectedTreeData` | `(selectedTreeData: Array<any>)` | 树形选择数据更新时触发。配合 `selectedTreeData` prop 实现双向绑定 |
| `selectedData` | `(selectedData: Array<any>)` | 行选择发生变化时触发。返回所有选中行的数据数组 |
| `expand` | `(expanded: boolean, record: any)` | 行展开/折叠时触发。`expanded` 表示展开状态，`record` 为当前行数据 |

---

## Expose | 暴露方法

通过 `defineExpose` 暴露，可在父组件通过模板引用调用：

```vue
<template>
  <portal ref="portalRef" ... />
</template>

<script setup>
const portalRef = ref()
// 调用暴露的方法
portalRef.value?.queryData()
portalRef.value?.clearAllFilters()
</script>
```

| Method | Signature | Description |
|--------|-----------|-------------|
| `queryData` | `() => void` | **手动触发数据查询**。按当前查询条件重新从后端拉取数据。常用于外部条件变化后刷新表格 |
| `queryTreeData` | `() => Promise<void>` | 手动触发树形数据查询。刷新左侧树结构数据 |
| `queryCondition` | `() => QueryType` | 获取当前完整的查询条件对象。包含 `condition`、`sortList`、`selectColumnCondition` 等 |
| `getRowSelection` | `() => any[]` | 获取当前选中的行数据数组 |
| `getConfig` | `() => TableConfigType` | 获取当前表格的完整配置对象 |
| `getData` | `() => any[]` | 获取表格当前的所有数据源（不含分页截断） |
| `handleMenuContextAdd` | `(recordId: any) => void` | 触发添加操作。可指定父节点 ID（树模式） |
| `addRow` | `() => void` | 在表格末尾添加一条空行，进入编辑状态 |
| `clearAllFilters` | `() => void` | **清空所有列的筛选条件**，重置分页到第一页，并重新查询数据 |
| `getUserFilterConditions` | `() => Map<string, any>` | 获取用户设置的筛选条件 Map（键为列 dataIndex，值为筛选值） |

---

## Types | 类型定义

### TableConfigType

表格整体配置，大部分由内部根据 props 自动构建。

```typescript
type TableConfigType = {
  baseDomain: string         // API 基础域名
  tableId: string            // 表格 ID
  url: string                // API 接口 URL
  key: number                // Vue key，变更时重新渲染
  title: string              // 表格中文标题
  size: 'middle' | 'small' | 'default'  // 表格尺寸
  rowKey: string             // 行标识字段名
  nameKey: string            // 行名称字段名
  parentKey: string          // 树形父级 ID 字段名
  loading: boolean           // 加载状态
  currentPage: number        // 当前页码
  pageSize: number           // 每页条数
  total: number              // 数据总量
  readOnly: boolean          // 只读模式
  summary: boolean           // 是否显示汇总行
  treeMode: boolean          // 树形模式
  treeDragAble: boolean      // 树形支持拖拽
  orderMode: boolean         // 支持排序
  treeMenuShow: boolean      // 树菜单显示
  // ... 更多配置项请参考 type.ts
}
```

### ColumnType

列配置，后端动态返回，部分属性可被前端覆盖。

```typescript
type ColumnType = {
  // 基础
  title: string              // 列标题
  dataIndex: string          // 字段名
  key: string                // 唯一键
  align: string              // 对齐方式
  width: number              // 列宽
  fixed: boolean | string    // 锁定列（left / right）
  resizable: boolean         // 是否可调整列宽

  // 可见性
  checked: boolean           // 是否显示
  disabled: boolean          // 是否不可取消显示
  order: number              // 显示顺序

  // 筛选排序
  filterAble: boolean        // 能否筛选
  filterStrict: boolean      // 严格/模糊匹配
  sorter: boolean            // 能否排序

  // 编辑
  editable: 'cellEditorSlot' | boolean  // 是否可编辑

  // 字段类型
  fieldType: string          // 字段类型（input/select/date/money/etc）
  referenceDict: string      // 关联字典 code

  // 表单展示
  detailSize: number         // 详情显示格数
  addSize: number            // 新增显示格数
  editSize: number           // 编辑显示格数
  detailShow: boolean        // 详情是否显示
  addShow: boolean           // 新增是否显示
  editShow: boolean          // 编辑是否显示
  // ... 更多配置项请参考 type.ts
}
```

### QueryType

查询请求体结构。

```typescript
type QueryType = {
  condition: ConditionType               // 高级查询条件（嵌套 AND/OR）
  selectColumnCondition?: Map<string, any>  // 动态字段条件
  selectColumnList?: string[]             // 返回列白名单
  distinct?: string                      // 去重字段
  conditionList: Array<ConditionListType> // 简单查询条件列表
  sortList: Array<QuerySortType>         // 排序列表
  currentPage: number                    // 当前页码
  pageSize: number                       // 每页条数
}
```

### FILTER_TYPE

| Value | Name | Description |
|-------|------|-------------|
| 1 | `EQUAL` | 等于 |
| 2 | `NOT_EQUAL` | 不等于 |
| 3 | `GREATER` | 大于 |
| 4 | `GREATER_EQUAL` | 大于等于 |
| 5 | `LESS` | 小于 |
| 6 | `LESS_EQUAL` | 小于等于 |
| 7 | `NULL` | 为空 |
| 8 | `NOT_NULL` | 不为空 |
| 9 | `LIKE` | 模糊匹配 |
| 10 | `NOT_LIKE` | 不匹配 |
| 11 | `IN` | 在集合中 |
| 12 | `NOT_IN` | 不在集合中 |
| 13 | `BETWEEN` | 在区间内 |
| 14 | `NOT_BETWEEN` | 不在区间内 |
| 15 | `CONTAIN` | 包含 |
| 16 | `CONTAIN_IN_OR` | 多选包含（OR） |
| 17 | `CONTAIN_IN_AND` | 多选包含（AND） |
| 99 | `SELECT_APPLY` | 选择应用 |

### FIELD_TYPE

| Value | Name | Description |
|-------|------|-------------|
| `'0'` | `DEFAULT` | 默认 |
| `'1'` | `INPUT` | 文本输入 |
| `'2'` | `SWITCH` | 开关 |
| `'3'` | `NUMBER` | 数字 |
| `'4'` | `SELECT` | 下拉选择 |
| `'5'` | `TREE` | 树形选择 |
| `'6'` | `DATE` | 日期 |
| `'7'` | `DATETIME` | 日期时间 |
| `'8'` | `HREF` | 链接 |
| `'9'` | `HTML` | HTML 富文本 |
| `'10'` | `TEXT_AREA` | 长文本 |
| `'11'` | `ENTITY` | 实体关联 |
| `'12'` | `IMAGE` | 图片 |
| `'13'` | `VIDEO` | 视频 |
| `'14'` | `AUDIO` | 音频 |
| `'15'` | `FILE` | 文件 |
| `'16'` | `MONEY` | 金额 |
| `'17'` | `PERCENT` | 百分比 |
| `'18'` | `SELECT_MULTI_IN_ONE` | 多选（单字段） |
| `'19'` | `TREE_MULTI_IN_ONE` | 树多选（单字段） |
| `'20'` | `ENTITY_CONDITION` | 条件实体 |

---

## Dashboard | 仪表盘

Portal 内置了一套完整的**指标仪表盘系统**，支持拖拽选指标、可视化配置、多图表渲染。通过 `dashboard.vue` + `dashboardModal.vue` 组合使用，可快速构建数据看板。

### Architecture | 架构

```
dashboard/
├── dashboard.vue           # 主仪表盘组件（三栏布局）
├── dashboardModal.vue      # 仪表盘弹窗容器
├── type.ts                 # MetricStatisticType, NameValue
├── utils.ts                # ECharts 工具函数
│
├── indicator/
│   ├── config/             # 配置面板
│   │   ├── ConfigPanel.vue           # 中间配置面板（核心）
│   │   ├── DataConfiguration.vue     # 数据配置（指标/维度/过滤）
│   │   ├── DimensionSelector.vue     # 维度选择器
│   │   ├── FilterCondition.vue       # 过滤条件配置
│   │   └── ColorPicker.vue           # 颜色选择器
│   ├── dashboard/          # 图表渲染
│   │   ├── ChartDisplayArea.vue      # 图表展示区域容器
│   │   ├── DashboardDetail.vue       # 仪表盘详情
│   │   ├── UniversalChart.vue        # 通用图表组件
│   │   ├── charts/
│   │   │   ├── BarChart.vue          # 柱状图
│   │   │   ├── LineChart.vue         # 折线图
│   │   │   ├── MixedChart.vue        # 混合图（柱线混合）
│   │   │   └── PieChart.vue          # 饼图
│   │   └── control/
│   │       ├── DimensionControl.vue  # 维度控制
│   │       └── StatisticControl.vue  # 统计控制
│   └── tree/
│       └── IndicatorTreePanel.vue   # 左侧指标树面板
├── styles/
│   ├── dashboard.less       # 仪表盘样式
│   ├── talentReview.less    # 人才盘点专用样式
│   └── universalChart.less  # 通用图表样式
└── type/
    ├── AdvancedStatisticReq.ts   # 高级统计请求类型
    └── ChartTypes.ts            # 图表类型定义
```

### Core Components | 核心组件

#### dashboard.vue
主组件，三栏布局：
- **左侧**：`IndicatorTreePanel` — 可拖拽的指标树，用户将指标拖入配置面板
- **中间**：`ConfigPanel` — 配置面板，选择一维/二维维度、过滤条件、数据指标、图表类型
- **右侧**：`ChartDisplayArea` — 图表展示区，根据配置渲染 ECharts 图表

Props：
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `tableId` | `string` | — | 表格 ID，用于加载指标配置 |
| `convertUnit` | `boolean` | `false` | 是否支持单位转换 |

Emits：
| Event | Payload | Description |
|-------|---------|-------------|
| `reset-config` | — | 重置配置 |
| `save-config` | `(config: DimensionIndicatorsFilter)` | 保存配置（透传） |

#### dashboardModal.vue
仪表盘弹窗容器，将 `dashboard.vue` 包裹在 `dialog-box` 中。

Props：
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `show` | `boolean` | `false` | 弹窗可见性 |
| `config` | `any` | — | 仪表盘配置，需包含 `tableId` 和 `title` |

Emits：
| Event | Payload | Description |
|-------|---------|-------------|
| `update:show` | `(value: boolean)` | 弹窗关闭事件 |

### Key Types | 关键类型

```typescript
// 统计指标结果
interface MetricStatisticType {
  metricColumn: string
  metric: string
  metricLabel: string
  statistic: number
  children: Array<MetricStatisticType>
}

// 名称-值对
interface NameValue {
  parentName?: string
  name: string
  value: number
  itemStyle?: Object
}

// 条件组
interface ConditionGroup {
  andOr: '0' | '1'    // 0=AND, 1=OR
  conditionList: Array<ConditionListType>
}

// 数据指标配置
interface DataMetric {
  dataName: string              // 数据名称
  dataField: string             // 英文字段名
  chartType: 'bar' | 'line' | 'ptLine' | 'pie'  // 图表类型
  color: string                 // 整体颜色
  yAxisPosition: 'left' | 'right'  // Y轴位置
  stackGroup?: string           // 堆叠分组
  unit?: string                 // 单位
  itemColors: Record<string, string>  // 维度项颜色映射
}

// 维度指标过滤（完整请求体）
interface DimensionIndicatorsFilter {
  firstDimension: IndicatorGroup
  secondDimension: IndicatorGroup | null
  filterConditions: ConditionGroup
  dataMetrics: Array<DataMetric>
}
```

### Usage | 使用示例

```vue
<template>
  <!-- 弹窗方式使用 -->
  <dashboard-modal
    v-model:show="dashboardVisible"
    :config="{ tableId: 'myTable', title: '数据看板' }"
  />

  <!-- 直接嵌入页面 -->
  <dashboard table-id="myTable" />
</template>

<script setup>
import Dashboard from '@/framework/components/common/Portal/dashboard/dashboard.vue'
import DashboardModal from '@/framework/components/common/Portal/dashboard/dashboardModal.vue'
</script>
```

---

## Component Structure | 组件结构

```
Portal/
├── index.vue              # 主组件 (3241 lines)
├── type.ts                # 类型定义 (FILTER_TYPE, FIELD_TYPE, ColumnType, TableConfigType)
├── utils.ts               # 工具函数 (parse, buildCondition)
├── constant.ts            # 常量配置 (默认列、索引列、操作列)
│
├── action/
│   └── PortalButtonAction.vue    # 工具栏按钮组
├── bind/
│   ├── PortalBindModal.vue       # 绑定/解绑弹窗
│   ├── PortalBindTab.vue         # 关联信息标签页
│   └── type.ts
├── modal/
│   ├── PortalAdvancedSearchModal.vue  # 高级查询弹窗
│   ├── PortalAssociationModal.vue     # 关联操作弹窗
│   ├── PortalEditModal.vue            # 编辑弹窗
│   └── PortalViewModal.vue            # 详情弹窗
├── mode/
│   ├── PortalGridMode.vue         # 网格模式视图
│   ├── PortalListMode.vue         # 列表模式视图
│   ├── PortalModeButton.vue       # 模式切换按钮
│   └── PortalTreeMode.vue         # 树形模式视图
├── table/
│   ├── PortalBodyCell.vue         # 单元格渲染
│   ├── PortalCellEditor.vue       # 单元格编辑器
│   ├── PortalColumnCondition.vue  # 列筛选器
│   ├── PortalContextMenuPopup.vue # 右键菜单
│   ├── PortalSearchTags.vue       # 搜索条件标签
│   ├── PortalSummary.vue          # 汇总行
│   └── PortalTextAreaExpanded.vue # 长文本展开
├── upload/
│   └── PortalUpload.vue           # 文件上传弹窗
├── dashboard/                     # 指标仪表盘系统
│   ├── dashboard.vue                    # 主仪表盘组件（三栏布局）
│   ├── dashboardModal.vue               # 仪表盘弹窗容器
│   ├── type.ts                          # MetricStatisticType, NameValue
│   ├── utils.ts                         # ECharts 工具函数
│   ├── indicator/
│   │   ├── config/                      # 配置面板
│   │   │   ├── ConfigPanel.vue
│   │   │   ├── DataConfiguration.vue
│   │   │   ├── DimensionSelector.vue
│   │   │   ├── FilterCondition.vue
│   │   │   └── ColorPicker.vue
│   │   ├── dashboard/                   # 图表渲染
│   │   │   ├── ChartDisplayArea.vue
│   │   │   ├── DashboardDetail.vue
│   │   │   ├── UniversalChart.vue
│   │   │   ├── charts/
│   │   │   │   ├── BarChart.vue
│   │   │   │   ├── LineChart.vue
│   │   │   │   ├── MixedChart.vue
│   │   │   │   └── PieChart.vue
│   │   │   └── control/
│   │   │       ├── DimensionControl.vue
│   │   │       └── StatisticControl.vue
│   │   └── tree/
│   │       └── IndicatorTreePanel.vue
│   ├── styles/
│   │   ├── dashboard.less
│   │   ├── talentReview.less
│   │   └── universalChart.less
│   └── type/
│       ├── AdvancedStatisticReq.ts
│       └── ChartTypes.ts
└── css/
    └── dark.css                   # 深色主题样式
```

---

## Statistic Drill Condition | 统计穿透条件

### buildDrillConditionFromStatistic

从 statistic 请求体 + drillMetric 自动构建 Portal Table 的 `advanceCondition`，
实现通用化的统计穿透条件拼装。

> 函数位置: `Portal/utils.ts`

#### 为什么需要这个函数

仪表盘中用户点击卡片/饼图扇区/柱图柱子时，需要查看该指标的明细数据。
传统做法是每个模块手动从 statistic body 提取全局条件 + 追加维度条件，
大量重复代码。此函数统一了该逻辑。

#### 核心原理

```
原始 statistic body              drillMetric { conditionLabel / metricColumn + metric }
│                                      │
├─ condition.conditionList (全局条件)   │
├─ metricCondition[].condition          │
│    └─ label='正式客户' ───────── match ┘
│         └─ { property: 'customerStatus', relation: 1, value: ['4'] }
│
└─ 合并 → { conditionList: [全局条件..., customerStatus = '4'], andOr: '0' }
          → 直接用作 Portal 的 :advance-condition prop
```

#### 使用方式

```typescript
import { buildDrillConditionFromStatistic } from '@/framework/components/common/Portal/utils'

// 场景 ①：纯条件穿透（点击卡片/列表项）
buildDrillConditionFromStatistic(body, { conditionLabel: '正式客户' })
// → 从 body.metricCondition 匹配 label='正式客户'，提取其 condition

// 场景 ②：纯分组穿透（点击饼图/柱图）
buildDrillConditionFromStatistic(body, { metricColumn: 'province', metric: '北京' })
// → 构建 WHERE province = '北京'

// 场景 ③：分组 + 条件穿透（点击趋势子项）
buildDrillConditionFromStatistic(body, {
  metricColumn: 'province',
  metric: '北京',
  conditionLabel: '2024&&北京'
})
// → 全局条件 AND dy = '2024' AND province = '北京'
```

#### 参数说明

| 参数 | 类型 | 说明 |
|------|------|------|
| `body` | `any` | 原始 statistic 请求体（buildXxxBody 返回值） |
| `drillMetric.conditionLabel` | `string?` | 条件标签，匹配 body.metricCondition[].label |
| `drillMetric.metricColumn` | `string?` | 分组字段名，构建 WHERE column = 'value' |
| `drillMetric.metric` | `string?` | 选中的分组值；`'NULL'`/`'__NULL__'` 特判为 IS NULL |
| 返回值 | `ConditionListType` | Portal 的 `advanceCondition` prop 格式 |

#### 向后兼容

`CustomerDrilling.vue` 优先使用 `body + drillMetric` 路径（通用模式），
如果配置中没有这两个字段，回退到传统 `globalConditionList + drillConditionList` 模式。

