# CommonTreePanel 通用树形面板组件

一个功能完善的通用树形面板组件，支持树形数据的展示、编辑、拖拽排序、搜索等功能。

## 基础用法

```vue
<template>
  <CommonTreePanel
    url-prefix="/enterprise/evalProduct"
    title="产品目录"
    @select="handleSelect"
  />
</template>

<script setup>
import CommonTreePanel from '@/framework/components/common/TreePannel/CommonTreePanel.vue'

const handleSelect = (nodeId, nodeInfo) => {
  console.log('选中节点:', nodeId, nodeInfo)
}
</script>
```

## Props 配置项

| 属性名 | 说明 | 类型 | 默认值 | 必填 |
|--------|------|------|--------|------|
| `urlPrefix` | API URL前缀，如 `/enterprise/evalProduct` | `string` | - | ✅ |
| `title` | 树的标题 | `string` | `'树型结构数据标题'` | ❌ |
| `readonly` | 是否只读模式（隐藏新增/编辑/删除功能） | `boolean` | `false` | ❌ |
| `showRefresh` | 是否显示刷新按钮 | `boolean` | `true` | ❌ |
| `searchable` | 是否启用搜索功能 | `boolean` | `true` | ❌ |
| `draggable` | 是否启用拖拽排序 | `boolean` | `true` | ❌ |
| `showLine` | 是否显示连接线 | `boolean` | `true` | ❌ |
| `allowSelectParent` | 是否允许选择有子节点的节点 | `boolean` | `false` | ❌ |
| `treeDataApi` | 树节点数据接口路径后缀 | `string` | `'/tree/data'` | ❌ |
| `insertApi` | 新增接口路径后缀 | `string` | `'/insert'` | ❌ |
| `updateApi` | 更新接口路径后缀 | `string` | `'/update'` | ❌ |
| `deleteApi` | 删除接口路径后缀 | `string` | `'/delete'` | ❌ |
| `orderUpdateApi` | 排序更新接口路径后缀 | `string` | `'/order/update'` | ❌ |
| `pidUpdateApi` | 父节点更新接口路径后缀 | `string` | `'/pid'` | ❌ |
| `defaultFormData` | 新增时的默认表单数据 | `Record<string, any>` | `{}` | ❌ |
| `detailApi` | 详情接口路径后缀，设置后点击节点会自动获取详情 | `string` | `'/id'` | ❌ |

## Events 事件

| 事件名 | 说明 | 回调参数 |
|--------|------|----------|
| `select` | 选择节点时触发 | `(nodeId: string, nodeInfo: any)` |
| `refresh` | 点击刷新按钮时触发 | - |
| `loaded` | 树数据加载完成时触发 | `(treeData: TreeNode[])` |

## Slots 插槽

### headerTitle
自定义标题区域

```vue
<CommonTreePanel url-prefix="/api/tree">
  <template #headerTitle>
    <span>🎯 自定义标题</span>
  </template>
</CommonTreePanel>
```

### headerActions
自定义操作按钮区域

```vue
<CommonTreePanel url-prefix="/api/tree">
  <template #headerActions="{ loading, handleAdd, handleRefresh }">
    <a-button size="small" @click="handleAdd()">添加</a-button>
    <a-button size="small" :loading="loading" @click="handleRefresh">刷新</a-button>
  </template>
</CommonTreePanel>
```

### icon
自定义节点图标

```vue
<CommonTreePanel url-prefix="/api/tree">
  <template #icon="{ dataRef }">
    <FolderOutlined v-if="dataRef.children?.length" />
    <FileOutlined v-else />
  </template>
</CommonTreePanel>
```

### title
自定义节点标题显示

```vue
<CommonTreePanel url-prefix="/api/tree">
  <template #title="{ node, highlightText }">
    <span>
      <a-tag v-if="node.status" color="blue">{{ node.status }}</a-tag>
      <span v-html="highlightText(node.title)"></span>
    </span>
  </template>
</CommonTreePanel>
```

### contextMenu
自定义右键菜单

```vue
<CommonTreePanel url-prefix="/api/tree">
  <template #contextMenu="{ dataRef, handleEdit, handleDelete }">
    <a-menu-item key="custom">自定义操作</a-menu-item>
    <a-menu-item key="edit" @click="handleEdit(dataRef)">编辑</a-menu-item>
    <a-menu-item key="delete" @click="handleDelete(dataRef)">删除</a-menu-item>
  </template>
</CommonTreePanel>
```

### form
自定义编辑表单

```vue
<CommonTreePanel
  url-prefix="/api/tree"
  :default-form-data="{ status: '1' }"
>
  <template #form="{ formData, isEdit, formRef }">
    <a-form ref="formRef" :model="formData" layout="vertical">
      <a-form-item label="名称" name="title" :rules="[{ required: true }]">
        <a-input v-model:value="formData.title" />
      </a-form-item>
      <a-form-item label="编码" name="code">
        <a-input v-model:value="formData.code" />
      </a-form-item>
      <a-form-item label="状态" name="status">
        <a-select v-model:value="formData.status">
          <a-select-option value="1">启用</a-select-option>
          <a-select-option value="0">禁用</a-select-option>
        </a-select>
      </a-form-item>
    </a-form>
  </template>
</CommonTreePanel>
```

## Expose 暴露方法

```vue
<template>
  <CommonTreePanel ref="treeRef" url-prefix="/api/tree" />
  <a-button @click="handleRefresh">外部刷新</a-button>
</template>

<script setup>
const treeRef = ref()

// 刷新树数据
const handleRefresh = () => {
  treeRef.value?.loadTreeData()
}

// 获取当前选中节点
const getSelected = () => {
  const node = treeRef.value?.getSelectedNode()
  console.log('当前选中:', node)
}

// 刷新（别名）
const refresh = () => {
  treeRef.value?.refresh()
}
</script>
```

## 使用场景

### 场景一：只读树形展示

适用于数据展示、选择场景，如产品目录选择、组织架构查看等。

```vue
<CommonTreePanel
  url-prefix="/enterprise/evalProduct"
  title="产品目录"
  :readonly="true"
  :draggable="false"
  :allow-select-parent="true"
  @select="handleProductSelect"
/>
```

### 场景二：可编辑树形结构

适用于分类管理、目录管理等需要进行增删改操作的场景。

```vue
<CommonTreePanel
  url-prefix="/manage/category"
  title="分类管理"
  :default-form-data="{ type: 'default' }"
  @select="handleSelect"
  @loaded="handleLoaded"
/>
```

### 场景三：自定义表单字段

当默认的名称字段不满足需求时，可通过 `form` 插槽自定义表单。

```vue
<CommonTreePanel
  url-prefix="/api/department"
  title="部门管理"
  :default-form-data="{ sort: 0, status: '1' }"
>
  <template #form="{ formData, isEdit }">
    <a-form :model="formData" layout="vertical">
      <a-form-item label="部门名称" required>
        <a-input v-model:value="formData.title" />
      </a-form-item>
      <a-form-item label="部门编码">
        <a-input v-model:value="formData.code" />
      </a-form-item>
      <a-form-item label="排序">
        <a-input-number v-model:value="formData.sort" :min="0" />
      </a-form-item>
    </a-form>
  </template>
</CommonTreePanel>
```

### 场景四：带详情的节点选择

点击节点时自动获取详情数据，适用于需要展示完整信息的场景。

```vue
<CommonTreePanel
  url-prefix="/enterprise/evalProduct"
  title="产品列表"
  detail-api="/detail"
  @select="handleSelect"
/>

<script setup>
const handleSelect = (nodeId, nodeInfo) => {
  // nodeInfo 包含了详情数据
  console.log('节点详情:', nodeInfo)
  console.log('详情数据:', nodeInfo.data)
}
</script>
```

### 场景五：自定义 API 路径

当后端接口路径与默认值不同时，可自定义各接口路径。

```vue
<CommonTreePanel
  url-prefix="/custom/module"
  title="自定义模块"
  tree-data-api="/list"
  insert-api="/create"
  update-api="/modify"
  delete-api="/remove"
  order-update-api="/sort"
  pid-update-api="/move"
/>
```

### 场景六：禁用拖拽但可编辑

适用于需要编辑但不允许拖拽调整顺序的场景。

```vue
<CommonTreePanel
  url-prefix="/api/tags"
  title="标签管理"
  :draggable="false"
/>
```

### 场景七：结合外部操作

通过 `ref` 调用组件方法，实现外部控制。

```vue
<template>
  <div>
    <a-space style="margin-bottom: 16px;">
      <a-button type="primary" @click="handleAddRoot">添加根节点</a-button>
      <a-button @click="handleRefresh">刷新</a-button>
    </a-space>
    <CommonTreePanel
      ref="treeRef"
      url-prefix="/api/tree"
      title="树形管理"
    />
  </div>
</template>

<script setup>
const treeRef = ref()

const handleAddRoot = () => {
  // 触发新增根节点
  treeRef.value?.handleAdd()
}

const handleRefresh = () => {
  treeRef.value?.refresh()
}
</script>
```

## 接口约定

组件默认约定后端接口格式如下：

### 树数据接口
- **路径**: `{urlPrefix}/tree/data`
- **方法**: GET
- **返回**: `TreeNode[]`

### 新增接口
- **路径**: `{urlPrefix}/insert`
- **方法**: POST
- **参数**: `{ title, pid, ...defaultFormData }`

### 更新接口
- **路径**: `{urlPrefix}/update`
- **方法**: POST
- **参数**: `{ id, title, pid, ... }`

### 删除接口
- **路径**: `{urlPrefix}/delete`
- **方法**: POST
- **参数**: `{ id }`

### 排序接口
- **路径**: `{urlPrefix}/order/update`
- **方法**: POST
- **参数**: `[{ id, showOrder }, ...]`

### 父节点更新接口
- **路径**: `{urlPrefix}/pid`
- **方法**: POST
- **参数**: `{ id, pid }`

### 详情接口
- **路径**: `{urlPrefix}/id`
- **方法**: GET
- **参数**: `{ id }`
- **返回**: 节点详情对象

## TreeNode 数据结构

```typescript
interface TreeNode {
  id: string
  key: string
  title: string
  pid?: string
  children?: TreeNode[]
  [key: string]: any  // 支持扩展字段
}
```

## 注意事项

1. **urlPrefix 必填**: 必须提供正确的 API 前缀路径
2. **只读模式**: 设置 `readonly` 后会隐藏所有编辑功能，包括新增按钮和右键菜单
3. **拖拽排序**: 需要后端支持排序接口和父节点更新接口
4. **自定义表单**: 使用 `form` 插槽时，表单校验需要自行处理
5. **节点选择**: 默认不允许选择有子节点的节点，可通过 `allowSelectParent` 开启
