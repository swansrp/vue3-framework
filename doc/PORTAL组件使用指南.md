# Portal 组件使用指南

## 概述

Portal 是一个功能强大的企业级表格组件,提供了完整的CRUD(增删改查)功能、多种展示模式、高级查询、数据绑定等特性。它是基于 `@surely-vue/table` 封装的高级业务组件。

## 核心特性

### 🎯 主要功能

1. **多种展示模式**
   - 表格模式 (默认)
   - 列表模式
   - 网格模式  
   - 树形模式

2. **完整的CRUD操作**
   - 添加/编辑/删除/查看
   - 单元格编辑
   - 批量操作
   - 导入/导出

3. **高级查询与筛选**
   - 列搜索
   - 高级查询
   - 统计汇总

4. **数据绑定**
   - 1对多关联
   - 多对多关联
   - 树形结构关联

5. **响应式设计**
   - 自适应布局
   - 多断点支持
   - 卡片宽度自定义

## 基础用法

### 最简单的使用

```vue
<template>
  <Portal table-id="YourTableId" />
</template>
```

### 带自定义操作按钮

```vue
<template>
  <Portal 
    table-id="YourTableId"
    :action-width="150"
  >
    <!-- 左侧按钮区 -->
    <template #left-btns>
      <a-button type="primary">自定义按钮</a-button>
    </template>

    <!-- 右侧按钮区 -->
    <template #right-btns>
      <a-button>导出报表</a-button>
    </template>

    <!-- 操作列 -->
    <template #action="{ record }">
      <a-button 
        type="link"
        @click="handleEdit(record)"
      >
        编辑
      </a-button>
    </template>
  </Portal>
</template>
```

## Props 详解

### 必填参数

| 参数 | 类型 | 说明 |
|------|------|------|
| tableId | string | 表格唯一标识,配合后端配置 |

### 常用参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| baseDomain | string | '/das-view' | API请求域名 |
| data | Array<any> | undefined | 外部数据源(禁用查询) |
| readOnly | boolean | false | 只读模式 |
| currentPage | number | 1 | 当前页码 |
| pageSize | number | 10 | 每页显示条数 |
| autoWidth | boolean | false | 自动宽度 |
| autoHeight | boolean | false | 自动高度 |
| multiHeader | boolean | false | 多重表头 |

### 高级查询参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| advance | boolean | true | 是否支持高级查询 |
| advanceButton | boolean | false | 是否显示高级查询按钮 |
| advanceCondition | ConditionListType | undefined | 默认查询参数 |
| defaultSortColumn | Array<QuerySortType> | undefined | 默认排序字段 |
| selectColumnCondition | Map<string, string> | undefined | 动态字段条件 |
| statisticButton | boolean | false | 是否显示统计按钮 |

### 显示控制参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| hideRefresh | boolean | false | 隐藏刷新按钮 |
| hideRowSelection | boolean | false | 隐藏行选择 |
| hideAdd | boolean | false | 隐藏添加按钮 |
| hideEdit | boolean | false | 隐藏修改按钮 |
| hideDelete | boolean | false | 隐藏删除按钮 |
| hideAssociation | boolean | false | 隐藏关联信息 |

### 宽度配置

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| actionWidth | number \| string | 150 | 操作栏宽度 |
| indexWidth | number | 80 | 序号栏宽度 |
| indexTitle | string | '' | 序号栏标题 |

### 展示模式参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| treeMode | boolean | false | 树形模式 |
| listMode | boolean | false | 列表模式 |
| gridMode | boolean | false | 网格模式 |
| modeLock | boolean | true | 锁定模式(不显示切换按钮) |
| showTree | boolean | false | 默认显示树形结构 |
| gridCardWidth | number | 350 | 网格模式卡片宽度(px) |

### 选择模式参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| singleSelect | boolean | false | 单选模式 |
| rowSelectProps | (record: any) => any | undefined | 行选择属性配置函数 |

### 树形结构参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| treeCheckAble | boolean | false | 树是否有可选框 |
| selectedTreeData | Array<any> | undefined | 树形选择数据(v-model) |
| checkStrictly | boolean | false | 树选择是否完全受控 |

### 关联绑定参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| bindTabs | Array<PortalBindType> | undefined | 显示关联数据标签 |
| bindDefaultValue | any | undefined | 1:N entity默认值 |

### 自定义函数参数

| 参数 | 类型 | 说明 |
|------|------|------|
| rowAllowEdit | (record: any) => boolean | 该行是否能编辑 |
| rowAllowDelete | (record: any) => boolean | 该行是否能删除 |
| rowExpandable | (record: DefaultRecordType) => boolean | 每行是否展示展开按钮 |
| rowDragEnd | (data: Array<any>, currentPage: number, pageSize: number) => void | 行拖拽结束回调 |
| columnFilter | (column: ColumnType) => boolean | 列过滤方法 |
| columnDisplayCustom | Map<string, string> | 列显示自定义方法 |
| downloadFileName | (config: TableConfigType) => string | 下载文件命名方法 |
| query | (url: string, query: QueryType) => Promise<any> | 自定义查询函数 |

### 其他参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| textAreaInExpanded | boolean | false | 长文本在展开区域显示 |
| showLoading | boolean | false | 查询时显示加载中 |

## Slots 插槽

### 按钮区插槽

```vue
<!-- 左侧按钮 -->
<template #left-btns>
  <a-button>自定义按钮</a-button>
</template>

<!-- 右侧按钮 -->
<template #right-btns>
  <a-button>导出</a-button>
</template>

<!-- 底部操作区 -->
<template #footer-action>
  <a-button>自定义操作</a-button>
</template>
```

### 表格内容插槽

```vue
<!-- 操作列 -->
<template #action="{ record, portalConfig, column, columns, parsedRecord }">
  <a-button @click="handleEdit(record)">编辑</a-button>
</template>

<!-- 序号列 -->
<template #index="{ record, portalConfig, column }">
  {{ record.customIndex }}
</template>

<!-- 自定义表头 -->
<template #headerCell_fieldName="{ title, column }">
  <div>{{ title }}</div>
</template>

<!-- 自定义单元格 -->
<template #bodyCell_fieldName="{ record, index, column }">
  <span>{{ record.fieldName }}</span>
</template>

<!-- 自定义单元格编辑器 -->
<template #cellEditor_fieldName="{ modelValue, save, closeEditor, record }">
  <a-input 
    :value="modelValue"
    @change="save"
  />
</template>

<!-- 展开行内容 -->
<template #expandedRowRender="{ record, parseRecord }">
  <div>详细信息: {{ record.detail }}</div>
</template>
```

### 模式切换插槽

```vue
<!-- 列表模式显示 -->
<template #list-mode-display="{ record }">
  <div>{{ record.name }}</div>
</template>

<!-- 网格模式显示 -->
<template #grid-mode-display="{ record }">
  <div class="card-content">
    <h3>{{ record.title }}</h3>
    <p>{{ record.description }}</p>
  </div>
</template>

<!-- 网格模式操作按钮 -->
<template #grid-mode-item-actions="{ record, index }">
  <a-button @click="handleView(record)">查看</a-button>
</template>
```

### 弹框插槽

```vue
<!-- 查看弹框 -->
<template #view="{ modal, dataSource, modifyCellMap }">
  <custom-view-modal :data="modal.data" />
</template>

<!-- 新增弹框 -->
<template #add="{ modal, columnDisplayMap }">
  <custom-add-modal :data="modal.data" />
</template>

<!-- 编辑弹框 -->
<template #modify="{ modal, columnDisplayMap }">
  <custom-edit-modal :data="modal.data" />
</template>

<!-- 关联弹框 -->
<template #association="{ modal, bindTabs }">
  <custom-association-modal :data="modal.data" />
</template>
```

## Events 事件

| 事件名 | 参数 | 说明 |
|--------|------|------|
| update:selectedTreeData | selectedTreeData: Array<any> | 树选择变化 |
| selectedData | selectedData: Array<any> | 选中数据变化 |
| expand | expanded: boolean, record: any | 行展开/收起 |

## Methods 方法

通过 ref 调用组件方法:

```vue
<template>
  <Portal ref="portalRef" table-id="Test" />
</template>

<script setup>
const portalRef = ref()

// 刷新数据
const refresh = () => {
  portalRef.value.queryData()
}

// 获取选中行ID
const getSelected = () => {
  const selectedIds = portalRef.value.getRowSelection()
  console.log(selectedIds)
}

// 获取所有数据
const getAllData = () => {
  const data = portalRef.value.getData()
  console.log(data)
}
</script>
```

### 可用方法

| 方法名 | 参数 | 返回值 | 说明 |
|--------|------|--------|------|
| queryData | - | Promise<void> | 刷新数据 |
| getRowSelection | - | Array<any> | 获取选中行ID |
| getData | - | Array<any> | 获取所有数据 |

## 展示模式详解

### 1. 表格模式 (默认)

标准的表格展示,支持所有功能。

```vue
<Portal table-id="Test" />
```

### 2. 列表模式

左侧列表,右侧关联信息。

```vue
<Portal 
  table-id="Test"
  list-mode
  :bind-tabs="bindTabs"
>
  <template #list-mode-display="{ record }">
    <div>{{ record.name }}</div>
  </template>
</Portal>
```

### 3. 网格模式

卡片式展示,支持响应式布局。

```vue
<Portal 
  table-id="Test"
  grid-mode
  :grid-card-width="400"
  :bind-tabs="bindTabs"
>
  <template #grid-mode-display="{ record }">
    <div class="card">
      <h3>{{ record.title }}</h3>
      <p>{{ record.description }}</p>
    </div>
  </template>

  <template #grid-mode-item-actions="{ record }">
    <a-button @click="handleView(record)">查看</a-button>
  </template>
</Portal>
```

**网格模式响应式断点:**
- 2800px+ : 4-6列
- 1400px+ : 4-5列
- 1024px+ : 3-4列
- 768px+ : 2-3列
- 480px+ : 2列
- <479px : 1-2列
- <320px : 1列

### 4. 树形模式

树形结构展示。

```vue
<Portal 
  table-id="Test"
  tree-mode
  :tree-check-able="true"
  v-model:selected-tree-data="selectedTreeData"
/>
```

## 数据绑定功能

### bindTabs 配置

用于配置关联数据展示,支持1对多、多对1、多对多关系。

```typescript
import type { PortalBindType } from '@/framework/components/common/Portal/bind/type'

const bindTabs: Array<PortalBindType> = [
  {
    title: '考场信息',           // Tab标题
    tableId: 'ExamRoom',        // 关联表格ID
    bindType: '0',              // 0:1对多, 1:多对1, 2:多对多
    bindFieldProperty: 'examId', // 1:N 关联字段名
    defaultSortColumn: [        // 默认排序
      { property: 'createTime', type: 1 }
    ],
    treeMode: false,            // 是否树形展示
    bindTabs: []                // 递归绑定
  }
]
```

### 使用示例

```vue
<template>
  <Portal 
    table-id="Exam"
    list-mode
    :bind-tabs="bindTabs"
  >
    <template #list-mode-display="{ record }">
      <div>{{ record.examName }}</div>
    </template>
  </Portal>
</template>

<script setup lang="ts">
const bindTabs = [
  {
    title: '考场',
    tableId: 'ExamRoom',
    bindType: '0',
    bindFieldProperty: 'examId'
  },
  {
    title: '裁判',
    tableId: 'Referee',
    bindType: '2'  // 多对多
  }
]
</script>
```

## 高级用法

### 1. 条件操作按钮

根据状态显示不同操作。

```vue
<template>
  <Portal 
    table-id="Application"
    :action-width="120"
  >
    <template #action="{ record }">
      <div v-if="record.status === '0'">
        <a-button type="link" @click="approve(record)">
          通过
        </a-button>
        <a-button type="link" danger @click="reject(record)">
          拒绝
        </a-button>
      </div>
      <span v-else-if="record.status === '1'">已通过</span>
      <span v-else>已拒绝</span>
    </template>
  </Portal>
</template>
```

### 2. 行选择限制

只允许特定条件的行被选中。

```vue
<template>
  <Portal 
    table-id="History"
    :row-select-props="getCheckboxProps"
  >
    <template #right-btns>
      <a-button 
        type="primary"
        @click="batchApprove"
      >
        批量通过
      </a-button>
    </template>
  </Portal>
</template>

<script setup lang="ts">
const getCheckboxProps = (record: any) => {
  return {
    disabled: record.status !== '0'  // 只有未审核的能选
  }
}

const portalRef = ref()

const batchApprove = () => {
  const selectedIds = portalRef.value.getRowSelection()
  // 批量处理逻辑
}
</script>
```

### 3. 自定义查询

```vue
<template>
  <Portal 
    table-id="Test"
    :advance-condition="defaultCondition"
    :default-sort-column="defaultSort"
  />
</template>

<script setup lang="ts">
import type { ConditionListType, QuerySortType } from '@/framework/components/common/Portal/type'

const defaultCondition: ConditionListType = {
  property: 'status',
  value: ['1'],
  relation: 1  // FILTER_TYPE.EQUAL
}

const defaultSort: Array<QuerySortType> = [
  { property: 'createTime', type: 1 }  // 1:降序, 0:升序
]
</script>
```

### 4. 外部数据源

禁用自动查询,使用外部数据。

```vue
<template>
  <Portal 
    table-id="Test"
    :data="dataSource"
    read-only
  />
</template>

<script setup lang="ts">
const dataSource = ref([
  { id: 1, name: '张三', age: 20 },
  { id: 2, name: '李四', age: 25 }
])
</script>
```

### 5. 长文本展开显示

```vue
<template>
  <Portal 
    table-id="Article"
    text-area-in-expanded
  />
</template>
```

## 类型定义

### ColumnType 字段类型

```typescript
export enum FIELD_TYPE {
  DEFAULT = '0',       // 默认
  INPUT = '1',         // 输入框
  SWITCH = '2',        // 开关
  NUMBER = '3',        // 数字
  SELECT = '4',        // 下拉选择
  TREE = '5',          // 树选择
  DATE = '6',          // 日期
  DATETIME = '7',      // 日期时间
  HREF = '8',          // 链接
  HTML = '9',          // HTML
  TEXT_AREA = '10',    // 文本域
  ENTITY = '11',       // 实体
  IMAGE = '12',        // 图片
  VIDEO = '13',        // 视频
  AUDIO = '14',        // 音频
  FILE = '15',         // 文件
  MONEY = '16',        // 金额
  PERCENT = '17',      // 百分比
  SELECT_MULTI_IN_ONE = '18',  // 多选(存一个)
  TREE_MULTI_IN_ONE = '19',    // 树多选(存一个)
  ENTITY_CONDITION = '20'       // 实体条件
}
```

### FILTER_TYPE 筛选类型

```typescript
export enum FILTER_TYPE {
  EQUAL = 1,          // 等于
  NOT_EQUAL,          // 不等于
  GREATER,            // 大于
  GREATER_EQUAL,      // 大于等于
  LESS,               // 小于
  LESS_EQUAL,         // 小于等于
  NULL,               // 为空
  NOT_NULL,           // 不为空
  LIKE,               // 模糊查询
  NOT_LIKE,           // 不包含
  IN,                 // 包含
  NOT_IN,             // 不包含
  BETWEEN,            // 区间
  NOT_BETWEEN,        // 不在区间
  CONTAIN,            // 包含
  CONTAIN_IN_OR,      // 或包含
  CONTAIN_IN_AND,     // 且包含
  SELECT_APPLY = 99   // 应用选择
}
```

## 样式定制

Portal组件支持通过CSS变量和类名进行样式定制。

### 网格模式样式

```vue
<style scoped>
:deep(.portal-grid-mode) {
  .grid-item {
    /* 自定义卡片样式 */
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
  
  .grid-item-name {
    /* 自定义标题样式 */
    font-size: 16px;
    font-weight: bold;
  }
}
</style>
```

## 最佳实践

### 1. 使用tableId规范命名

```
tableId命名建议: 实体名称(PascalCase)
例如: ExamRoom, UserProfile, OrderDetail
```

### 2. 合理使用展示模式

- **表格模式**: 数据量大,需要详细查看和编辑
- **列表模式**: 简单列表+关联信息展示
- **网格模式**: 卡片式展示,移动端友好
- **树形模式**: 层级结构数据

### 3. 性能优化

```vue
<!-- 大数据量时使用分页 -->
<Portal 
  table-id="BigData"
  :page-size="50"
/>

<!-- 禁用不需要的功能 -->
<Portal 
  table-id="ReadOnly"
  read-only
  hide-add
  hide-edit
  hide-delete
/>
```

### 4. 类型安全

```typescript
import type { HistoryVO } from '@/apis/types/historyPortalControllerTypes'

const handleRecord = (record: HistoryVO) => {
  // TypeScript类型检查
  console.log(record.examId)
}
```

## 常见问题

### 1. 数据不刷新?

```vue
<script setup>
const portalRef = ref()

// 手动刷新
portalRef.value.queryData()
</script>
```

### 2. 选中行无法获取?

确保组件有ref,并调用正确的方法:

```typescript
const selectedIds = portalRef.value.getRowSelection()
```

### 3. 网格模式卡片宽度如何调整?

```vue
<Portal 
  grid-mode
  :grid-card-width="400"  
/>
```

### 4. 如何隐藏行选择框?

```vue
<Portal 
  table-id="Test"
  hide-row-selection
/>
```

## 总结

Portal组件是一个功能完整、灵活可扩展的企业级表格组件。通过合理使用props、slots和events,可以满足各种复杂的业务需求。

**核心优势:**
- ✅ 开箱即用,零配置启动
- ✅ 多种展示模式,适应不同场景
- ✅ 完整的CRUD功能
- ✅ 强大的数据绑定能力
- ✅ 高度可定制
- ✅ TypeScript类型支持
- ✅ 响应式设计

---

更新时间: 2025-10-14
文档版本: v1.0.0
