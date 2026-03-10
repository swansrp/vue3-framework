# DynamicForm 动态表单组件

动态表单组件，支持多种模式的数据填写、查看和编辑。

---

## 🚀 调用端使用指南（必读）

### 调用端必须负责的事项

| 职责 | 说明 | 示例 |
|------|------|------|
| **权限检查** | 调用 `checkHistoryPermission` API，设置 `hasPermission` / `recordNotFound` | 编辑/查看模式必须 |
| **返回按钮** | 通过 `header-actions` slot 注入，组件不内置 | 所有模式都需要 |
| **路由跳转** | 保存/提交成功后的跳转逻辑 | 监听 `@saved` / `@submitted` 事件 |

### 最小使用示例

```vue
<template>
  <DynamicForm
    :form-id="formId"
    :history-id="historyId"
    :has-permission="hasPermission"
    :record-not-found="recordNotFound"
    @saved="handleSaved"
    @submitted="handleSubmitted"
  >
    <!-- 必须提供返回按钮 -->
    <template #header-actions>
      <a-button @click="router.back()">返回列表</a-button>
    </template>
  </DynamicForm>
</template>

<script setup>
import { checkHistoryPermission } from '@/apis/enterpriseController'

const hasPermission = ref(true)
const recordNotFound = ref(false)

// 权限检查（编辑/查看模式必须）
onMounted(async () => {
  if (historyId.value) {
    const res = await checkHistoryPermission({ historyId: historyId.value })
    if (!res?.payload) {
      recordNotFound.value = true
    } else {
      hasPermission.value = res.payload.canView
    }
  }
})
</script>
```

### 模式速查表

| 模式 | 必传参数 | 权限检查 | 说明 |
|------|----------|----------|------|
| 新增（延迟创建） | `formId` + `lazyCreate` | ❌ 不需要 | 填完一次性保存 |
| 新增（立即创建） | `formId` | ❌ 不需要 | 边填边保存 |
| 编辑 | `historyId` | ✅ 必须 | 编辑已有记录 |
| 查看 | `historyId` + `readonly` | ✅ 必须 | 只读查看 |

---

## 基本用法

```vue
<template>
  <DynamicForm
    :form-id="formId"
    :history-id="historyId"
    :readonly="false"
    :show-submit="true"
    :lazy-create="false"
    :show-nav-tree="true"
    @submitted="handleSubmitted"
    @saved="handleSaved"
    @init:complete="handleInitComplete"
  />
</template>

<script setup>
import DynamicForm from '@/framework/components/common/DynamicForm/index.vue'

const formId = ref('xxx')
const historyId = ref('')

const handleSubmitted = (id) => {
  console.log('提交成功:', id)
}

const handleSaved = () => {
  console.log('保存成功')
}

const handleInitComplete = (success) => {
  console.log('初始化完成:', success)
}
</script>
```

---

## Props 属性说明

| 属性名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `formId` | `string` | `undefined` | 表单模板ID，用于新增模式 |
| `historyId` | `string` | `undefined` | 填报记录ID，用于编辑/查看模式 |
| `readonly` | `boolean` | `false` | 是否只读模式 |
| `showSubmit` | `boolean` | `true` | 是否显示提交按钮 |
| `autoInit` | `boolean` | `true` | 是否自动初始化（组件挂载时自动加载数据） |
| `lazyCreate` | `boolean` | `false` | 延迟创建模式（填完再保存） |
| `showNavTree` | `boolean` | `true` | 是否显示左侧导航树 |
| `hasPermission` | `boolean` | `true` | 是否有访问权限（由调用端控制，用于显示无权限页面） |
| `recordNotFound` | `boolean` | `false` | 记录是否不存在（由调用端控制，用于显示记录不存在页面） |

---

## Slots 插槽说明

| 插槽名 | 参数 | 说明 |
|--------|------|------|
| `header-actions` | - | 页面头部右侧操作区域（用于添加自定义按钮） |
| `header-info` | `historyInfo` | 页面标题右侧信息区域 |

### 场景：自定义返回按钮

**注意**："返回列表"按钮不是默认显示的，需要由业务调用方通过 `header-actions` 插槽写入。

```vue
<template>
  <DynamicForm
    :form-id="formId"
    :history-id="historyId"
  >
    <template #header-actions>
      <a-button @click="handleBack">
        <template #icon>
          <ArrowLeftOutlined />
        </template>
        返回列表
      </a-button>
    </template>
  </DynamicForm>
</template>

<script setup>
import { ArrowLeftOutlined } from '@ant-design/icons-vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const handleBack = () => {
  router.back()
  // 或跳转到指定列表页
  // router.push('/list')
}
</script>
```

### 场景：同时显示返回按钮和提交按钮

`header-actions` 插槽会与组件内部的"保存/提交"按钮共存：

```vue
<template>
  <DynamicForm
    :form-id="formId"
    :history-id="historyId"
    :show-submit="true"
  >
    <template #header-actions>
      <a-button @click="handleBack">返回列表</a-button>
    </template>
    <!-- 提交按钮会自动显示在返回按钮右侧 -->
  </DynamicForm>
</template>
```

---

## Events 事件说明

| 事件名 | 参数 | 说明 |
|--------|------|------|
| `submitted` | `historyId: string` | 提交成功时触发 |
| `saved` | - | 保存成功时触发 |
| `init:complete` | `success: boolean` | 初始化完成时触发 |

---

## Expose 暴露方法

通过 `ref` 可以调用以下方法：

```vue
<template>
  <DynamicForm ref="formRef" ... />
  <a-button @click="handleSave">保存</a-button>
</template>

<script setup>
const formRef = ref()

const handleSave = async () => {
  await formRef.value.handleSaveAll()
}

const handleSubmit = async () => {
  await formRef.value.handleSubmit()
}
```

| 方法名 | 参数 | 说明 |
|--------|------|------|
| `handleSaveAll` | - | 保存所有数据 |
| `handleSubmit` | - | 提交表单 |
| `handleSaveSection` | `sectionInstanceId: string` | 保存单个 Section |
| `init` | - | 手动初始化 |

---

## 使用场景

### 场景1：延迟创建模式（简单表单）

**适用场景**：简单表单，用户填完后一次性保存，不需要中途保存草稿。

**特点**：
- 不立即创建 `historyId`
- 数据暂存在本地
- 点击保存时才创建记录并保存所有数据

```vue
<DynamicForm
  :form-id="formId"
  :lazy-create="true"
  :show-submit="true"
/>
```

### 场景2：立即创建模式（边填边保存）

**适用场景**：复杂表单，需要中途保存草稿，防止数据丢失。

**特点**：
- 进入页面时立即创建 `historyId`
- 每次修改都会自动保存到后端

```vue
<DynamicForm
  :form-id="formId"
  :lazy-create="false"
  :show-submit="true"
/>
```

### 场景3：编辑模式

**适用场景**：编辑已有的填报记录。

**特点**：
- 传入 `historyId` 加载已有数据
- 自动启用边填边保存

```vue
<DynamicForm
  :history-id="historyId"
  :readonly="false"
  :show-submit="true"
/>
```

### 场景4：查看模式（只读）

**适用场景**：查看已提交的填报记录，不允许修改。

```vue
<DynamicForm
  :history-id="historyId"
  :readonly="true"
  :show-submit="false"
/>
```

### 场景5：隐藏左侧导航树

**适用场景**：只有一个 Section 时，不需要显示导航树。

```vue
<DynamicForm
  :form-id="formId"
  :show-nav-tree="false"
/>
```

### 场景6：手动控制初始化

**适用场景**：需要在特定时机才初始化表单（如弹窗中）。

```vue
<template>
  <a-modal v-model:open="visible" @ok="handleOk">
    <DynamicForm
      ref="formRef"
      :form-id="formId"
      :auto-init="false"
    />
  </a-modal>
</template>

<script setup>
const formRef = ref()
const visible = ref(false)

// 手动初始化
watch(visible, async (val) => {
  if (val) {
    await nextTick()
    await formRef.value.init()
  }
})
</script>
```

### 场景7：权限控制

**适用场景**：需要根据用户权限控制访问。

权限检查由调用端负责，组件只负责展示对应的错误页面。

```vue
<template>
  <DynamicForm
    :history-id="historyId"
    :has-permission="hasPermission"
    :record-not-found="recordNotFound"
  >
    <template #header-actions>
      <a-button @click="handleBack">返回列表</a-button>
    </template>
  </DynamicForm>
</template>

<script setup>
import { checkHistoryPermission } from '@/apis/enterpriseController'

const hasPermission = ref(true)
const recordNotFound = ref(false)

// 调用端负责权限检查
const checkPermission = async () => {
  try {
    const res = await checkHistoryPermission({ historyId: historyId.value })
    
    if (!res?.payload) {
      recordNotFound.value = true
      return
    }
    
    hasPermission.value = res.payload.canView
    
    // 如果有权限，设置编辑权限
    if (hasPermission.value) {
      canEdit.value = res.payload.canEdit ?? false
    }
  } catch (error) {
    recordNotFound.value = true
  }
}

onMounted(() => {
  checkPermission()
})
</script>
```

**权限相关属性说明：**

| 属性 | 效果 |
|------|------|
| `hasPermission: false` | 显示"无访问权限"页面 |
| `recordNotFound: true` | 显示"记录不存在"页面 |
| 两者都为默认值 | 正常显示表单内容 |

---

## URL 参数支持

组件支持从 URL 获取参数：

```
# 新增模式（延迟创建）
?formId=xxx

# 新增模式（立即创建）
?formId=xxx&createMode=immediate

# 编辑模式
?historyId=xxx

# 查看模式
?historyId=xxx&readonly=true
```

---

## 数据结构说明

### Section（区块）
- 一个表单可以有多个 Section
- Section 可以多选（添加多个实例）

### Group（分组）
- 一个 Section 包含多个 Group
- Group 支持嵌套（树形结构）
- Group 可以是多行模式（动态添加行）

### 数据存储
```
historyId (填报记录)
  │
  ├── sectionInstance (区块实例)
  │   ├── sectionId
  │   └── groupInstances (分组实例)
  │       ├── groupInstanceId
  │       ├── groupId
  │       ├── rowIndex
  │       └── data: { attributeId: value }
  │
  └── ...
```

---

## 注意事项

1. **延迟创建模式**下，`historyId` 在保存时才创建，之前数据存储在组件内存中
2. **编辑模式**必须传入 `historyId`，否则无法加载数据
3. **只读模式**下，所有编辑操作都会被禁用
4. **左侧导航树**在只有一个 Module 时自动隐藏，多个 Module 时显示
5. **提交按钮**只在可编辑且状态为草稿/退回时显示
6. **返回按钮**不是默认显示的，需要通过 `header-actions` 插槽自行添加
