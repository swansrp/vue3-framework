# GeneralDashboard | 通用仪表盘

## Overview | 概述

GeneralDashboard is a generic dashboard framework component that provides a **left-right split layout**:

- **Left**: Accordion-style collapse panels with an **indicator tree** for each table
- **Right**: A **chart grid** that displays indicators corresponding to the selected tree node

It supports **lazy loading** of indicator data, **global condition filtering**, **node-based chart filtering** (clicking a parent node shows all child charts), **scroll-to-chart behavior** (clicking a leaf node scrolls and highlights its corresponding chart), and **auto-expand of the first panel**.

## Directory Structure | 目录结构

```
GeneralDashboard/
├── README.md                    # This file
├── index.vue                    # Main dashboard component
├── SimpleIndicatorTree.vue      # Left-side indicator tree with accordion mode
├── dropDownFilterButton.vue     # Dropdown filter button for custom filter slots
└── css/
    └── generalDashboard.less    # Dashboard styles
```

## Architecture | 架构

```
┌─────────────────────────────────────────────────────────┐
│  GeneralDashboard (index.vue)                           │
│  ┌─────────────────┬───────────────────────────────────┐│
│  │   Left Panel    │        Right Panel                ││
│  │  ┌───────────┐  │  ┌─────────────────────────────┐ ││
│  │  │ Accordion │  │  │  Node Filter Banner          │ ││
│  │  │  ┌───────┐│  │  │  (shows current node title)  │ ││
│  │  │  │ Tree  ││  │  ├─────────────────────────────┤ ││
│  │  │  │   for  ││  │  │     ChartGrid               │ ││
│  │  │  │ TableA││  │  │  ┌────┬────┬────┬────┐      │ ││
│  │  │  └───────┘│  │  │  │ C1 │ C2 │ C3 │ C4 │      │ ││
│  │  │  ┌───────┐│  │  │  ├────┼────┼────┼────┤      │ ││
│  │  │  │ Tree  ││  │  │  │ C5 │ C6 │ C7 │ C8 │      │ ││
│  │  │  │   for  ││  │  │  └────┴────┴────┴────┘      │ ││
│  │  │  │ TableB││  │  └─────────────────────────────┘ ││
│  │  │  └───────┘│  │                                   ││
│  │  └───────────┘  │                                   ││
│  └─────────────────┴───────────────────────────────────┘│
│                                                          │
│  #filters slot area (top-right header)                   │
│  ┌──────────┬───────────┬──────────┐                     │
│  │  Year    │  Status    │  Dept    │                     │
│  └──────────┴───────────┴──────────┘                     │
└─────────────────────────────────────────────────────────┘
```

## Core Components | 核心组件

### GeneralDashboard (index.vue)

The main layout component that orchestrates the indicator tree and chart grid.

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `pageTitle` | `string` | `'通用仪表盘'` | Page title displayed in the header |
| `tableConfigs` | `TableConfig[]` | **(required)** | Array of `{ tableId, tableName }` defining each accordion panel |
| `gridColumns` | `number` | `7` | Number of grid columns for chart layout |
| `globalConditions` | `ConditionListType` | `{ conditionList: [], andOr: '0' }` | Global filter conditions merged (AND) into each chart's indicator configuration |
| `defaultExpandFirst` | `boolean` | `false` | Whether to auto-expand the first panel and auto-select the first root node on mount |

**TableConfig Interface:**

```typescript
interface TableConfig {
  tableId: string   // Portal table ID, used to load indicators and portal config
  tableName: string // Display name in the accordion panel header
}
```

#### Emits

| Event | Payload | Description |
|-------|---------|-------------|
| `table-change` | `tableId: string \| null` | Emitted when the accordion panel changes (active table switches) |
| `node-click` | `{ tableId: string; nodeKey: string; nodeTitle: string }` | Emitted when any tree node is clicked |

#### Slots

| Slot | Description |
|------|-------------|
| `#filters` | Custom filter controls rendered in the top-right header area (e.g., year dropdown, status dropdown) |

#### Internal Behavior

1. **Lazy Loading**: Indicator tree data and Portal configuration are loaded via `getCommonStatistic(tableId)` and `getPortalConfig(tableId)` only when the corresponding accordion panel is expanded for the first time. Results are cached in `tableDataMap`.

2. **Chart Filtering by Tree Node**:
   - Clicking a **parent node** → displays all leaf charts under that node
   - Clicking a **leaf node** → displays its sibling charts (the parent node's children), scrolls to the corresponding chart, and applies a highlight effect

3. **Global Conditions Merging**: External conditions provided via `globalConditions` are merged into each chart's `indicator.filterConditions` using an **AND** relationship, so charts only show data matching both their own conditions and the global filters.

4. **Grid Layout**: Chart positions are calculated automatically — each indicator's `defaultXGrid` / `defaultYGrid` controls its span, and items wrap to the next row when they exceed `gridColumns`.

---

## Sub-components | 子组件

### SimpleIndicatorTree

A lightweight tree component for displaying hierarchical indicator data.

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `indicators` | `IndicatorNode[]` | **(required)** | Tree data from the statistic API |
| `selectedNodeKey` | `string \| null \| number` | - | Currently selected node key |
| `autoExpandKey` | `string \| null \| number` | - | Key of the node to auto-expand |

#### Emits

| Event | Payload | Description |
|-------|---------|-------------|
| `node-click` | `(nodeKey: string, nodeData?: any)` | Emitted when a tree node is clicked or expanded |

#### Features

- **Accordion mode** within the same parent: expanding a node closes its siblings
- **Auto-expand**: when `autoExpandKey` is provided, the corresponding node expands automatically on mount
- **Visual feedback**: hover and click effects on node texts and backgrounds

---

### DropDownFilterButton

A lightweight dropdown selector used in the `#filters` slot to build custom filter bars.

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `options` | `ValueLabelArray` | **(required)** | Array of `{ value, label }` options |
| `value` | `Value` | **(required)** | Current selected value |
| `width` | `string \| number` | `'160px'` | Component width (e.g. `'200px'` or `200`) |

#### Emits

| Event | Payload | Description |
|-------|---------|-------------|
| `update:value` | `value: Value` | Emitted when the user selects a different option |

#### Features

- **Hover-based dropdown**: opens on mouse enter, closes with a 100ms delay on mouse leave
- **Smart selection tracking**: when `options` change dynamically (e.g., loaded from API), the component preserves the current value if it still exists in the new options, otherwise falls back to the first option
- **Only emits on change**: `update:value` is only emitted when the value actually differs

---

## Chart Rendering | 图表渲染

The chart grid in the right panel is rendered by `ChartGrid` from `@/framework/components/common/chartConfig/ChartGrid.vue`. Each chart in the grid corresponds to an **indicator leaf node** from the tree.

The `UniversalChart` component (from `Portal/dashboard/indicator/dashboard/UniversalChart.vue`) is the actual chart renderer used internally. It dispatches to specialized chart components based on `chartType`:

| Chart Type | Component | Description |
|------------|-----------|-------------|
| `bar` | BarChart | Vertical bar chart |
| `line` / `ptLine` | LineChart | Line or point-line chart |
| `pie` | PieChart | Pie/donut chart |
| `mixed` (bar + line) | MixedChart | Combination bar and line chart |

The chart type is determined automatically from the `dataMetrics` configuration — if metrics include both `bar` and `line` types, it renders a `MixedChart`; if a single metric has `chartType: 'pie'`, it renders a `PieChart`.

### Basic Usage Example

```vue
<template>
  <general-dashboard
    :page-title="pageTitle"
    :table-configs="tableConfigs"
    :grid-columns="7"
    :global-conditions="globalConditions"
    :default-expand-first="false"
    @table-change="handleTableChange"
    @node-click="handleNodeClick"
  >
    <template #filters>
      <drop-down-filter-button
        v-model:value="year"
        :options="yearOptions"
        :width="100"
      />
    </template>
  </general-dashboard>
</template>
```

## Business Usage Example | 业务用法示例

See `TalentDashboard.vue` (in `src/views/dashboard/hr/talentReview/`) for a complete business integration that demonstrates:

1. **URL parameter parsing** for dashboard-level defaults
2. **Dynamic department options** loaded from `getHrDept()` API
3. **Per-table filter configuration** — each table can specify which filters apply via `filterFields`
4. **Filter-condition permissions logic** — complex department permission condition construction based on user's accessible departments
5. **Two-way syncing** of filter values (year, dept) between parent component and dashboard

```typescript
// Example: per-table filter mapping
const tableConfigs = [
  {
    tableId: 'TalentReview',
    tableName: '人员总体规模与分类',
    filterFields: ['year', 'userStatus', 'dept']
  },
  {
    tableId: 'TalentReviewTrend',
    tableName: '人员流动趋势',
    filterFields: ['dept']
  },
  {
    tableId: 'TalentReviewDeptRevenue',
    tableName: '人员效率和贡献',
    filterFields: []
  }
]
```

## Types | 类型定义

```typescript
// ConditionListType — from '@/framework/components/common/AdvancedSearch/ConditionList/type'
interface ConditionListType {
  property?: string | null
  value?: any[] | null
  relation?: number | null
  conditionList: ConditionListType[]
  andOr?: string
}

// IndicatorNode — from '@/framework/components/common/chartConfig/types'
interface IndicatorNode {
  id: string | number
  key?: string
  title?: string
  subTitle?: string
  description?: string
  children?: IndicatorNode[]
  defaultXGrid?: number
  defaultYGrid?: number
  indicator?: string // JSON string of indicator config
}

// DashboardItem — from '@/framework/components/common/chartConfig/types'
interface DashboardItem {
  id: string
  title: string
  subTitle?: string
  description?: string
  displayOrder: number
  commonStatistic: string | number
  xGrid: number
  yGrid: number
  xPosition: number
  yPosition: number
  show: boolean
  config: { tableId: string; indicator: string | object }
  indicatorId?: string | number
}

// ValueLabel — from '@/framework/utils/type'
interface ValueLabel {
  value: string | number | null
  label: string
}
```

## Dependencies | 依赖关系

| Module | Path |
|--------|------|
| ChartGrid | `@/framework/components/common/chartConfig/ChartGrid.vue` |
| IndicatorNode types | `@/framework/components/common/chartConfig/types` |
| DashboardItem types | `@/framework/components/common/chartConfig/types` |
| Portal config API | `@/framework/apis/portal/config` |
| Statistic API | `@/framework/components/common/chartConfig/api` |
| ConditionListType | `@/framework/components/common/AdvancedSearch/ConditionList/type` |
| UniversalChart | `@/framework/components/common/Portal/dashboard/indicator/dashboard/UniversalChart.vue` |
| ValueLabel | `@/framework/utils/type` |
