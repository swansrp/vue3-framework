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
| 审核 | `historyId` + `mode="approve"` | ✅ 必须 | 审核填报记录 |

### 状态与权限控制

DynamicForm 支持两种模式和四种状态，自动控制编辑权限和按钮显示：

**状态定义：**
- `'0'` = 未提交 (UNKNOWN)
- `'1'` = 待审核 (APPLY)
- `'2'` = 未通过 (REJECT)
- `'3'` = 已通过 (APPROVAL)

**填报模式 (fill) 下：**
| 状态 | 编辑权限 | 提交按钮 |
|------|----------|----------|
| 未提交(0) | ✅ 可编辑 | ✅ 显示 |
| 待审核(1) | ❌ 只读 | ❌ 隐藏 |
| 未通过(2) | ✅ 可编辑 | ✅ 显示 |
| 已通过(3) | ❌ 只读 | ❌ 隐藏 |

**审核模式 (approve) 下：**
| 状态 | 编辑权限 | 通过按钮 | 拒绝按钮 |
|------|----------|----------|----------|
| 未提交(0) | ❌ 只读 | ❌ 隐藏 | ❌ 隐藏 |
| 待审核(1) | ❌ 只读 | ✅ 显示 | ✅ 显示 |
| 未通过(2) | ❌ 只读 | ❌ 隐藏 | ❌ 隐藏 |
| 已通过(3) | ❌ 只读 | ❌ 隐藏 | ❌ 隐藏 |

**状态提示（自动显示）：**
| 状态 | 模式 | 提示类型 | 提示内容 |
|------|------|----------|----------|
| 未提交(0) | approve | warning | 该记录尚未提交，无法审核 |
| 待审核(1) | fill | info | 该记录正在审核中，请耐心等待 |
| 未通过(2) | fill | error | 该记录已被拒绝 + 拒绝理由 |
| 已通过(3) | fill/approve | success | 该记录已通过审核 |

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
| `historyId` | `string` | `undefined` | 填报记录ID，用于编辑/查看/审核模式 |
| `readonly` | `boolean` | `false` | 是否强制只读模式 |
| `mode` | `'fill' \| 'approve'` | `'fill'` | 模式：fill=填报模式，approve=审核模式 |
| `showSubmit` | `boolean` | `true` | 已废弃，由 mode 和 status 自动控制 |
| `autoInit` | `boolean` | `true` | 是否自动初始化（组件挂载时自动加载数据） |
| `lazyCreate` | `boolean` | `false` | 延迟创建模式（填完再保存） |
| `showNavTree` | `boolean` | `true` | 是否显示左侧导航树 |
| `hasPermission` | `boolean` | `true` | 是否有访问权限（由调用端控制，用于显示无权限页面） |
| `recordNotFound` | `boolean` | `false` | 记录是否不存在（由调用端控制，用于显示记录不存在页面） |
| `defaultValues` | `Record<string, any>` | `undefined` | 字段默认值，key 为字段名（fieldName），value 为默认值 |
| `status` | `'0' \| '1' \| '2' \| '3'` | `undefined` | 业务状态（覆盖 historyInfo.status）：0=未提交，1=待审核，2=未通过，3=已通过 |
| `rejectReason` | `string` | `undefined` | 拒绝理由（拒绝状态时显示） |

---

## Slots 插槽说明

| 插槽名 | 参数 | 说明 |
|--------|------|------|
| `header-actions` | - | 页面头部右侧操作区域（用于添加自定义按钮） |
| `header-info` | - | 页面标题右侧信息区域 |
| `field:{fieldName}` | `{ value, updateValue, readonly, attribute }` | 字段级覆盖，根据字段名覆盖特定字段的渲染 |

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
| `submit` | `historyId: string` | 框架校验完成后触发，业务端在此执行业务提交逻辑 |
| `submitted` | `historyId: string` | 整个提交流程完成后触发 |
| `saved` | - | 保存成功时触发 |
| `init:complete` | `success: boolean` | 初始化完成时触发 |
| `approve` | `historyId: string` | 审核模式下点击通过按钮触发，业务端执行业务审批逻辑 |
| `reject` | `historyId: string, reason: string` | 审核模式下点击拒绝按钮触发，业务端执行业务拒绝逻辑 |

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
| `handleSaveAll` | `options?: { skipValidation?: boolean }` | 保存所有数据 |
| `handleSubmit` | - | 提交表单（校验后触发 submit 事件） |
| `handleSaveSection` | `sectionInstanceId: string, options?: { skipValidation?: boolean }` | 保存单个 Section |
| `handleApprove` | - | 触发审批通过流程 |
| `handleReject` | `reason: string` | 触发审批拒绝流程 |
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
/>
```

### 场景5：审核模式

**适用场景**：审核员审核待审核的填报记录。

```vue
<template>
  <DynamicForm
    :history-id="historyId"
    mode="approve"
    @approve="handleApprove"
    @reject="handleReject"
  >
    <template #header-actions>
      <a-button @click="handleBack">返回列表</a-button>
    </template>
  </DynamicForm>
</template>

<script setup>
// 审批通过
const handleApprove = async (historyId) => {
  await approveApi({ historyId })
  message.success('审批通过')
  router.back()
}

// 审批拒绝
const handleReject = async (historyId, reason) => {
  await rejectApi({ historyId, reason })
  message.success('已拒绝')
  router.back()
}
</script>
```

**审核模式说明：**
- 只有状态为「待审核」时才显示通过/拒绝按钮
- 点击拒绝按钮会弹出输入框要求输入拒绝理由
- 通过和拒绝按钮触发的事件由业务端处理具体的业务逻辑

### 场景6：隐藏左侧导航树

**适用场景**：只有一个 Section 时，不需要显示导航树。

```vue
<DynamicForm
  :form-id="formId"
  :show-nav-tree="false"
/>
```

### 场景7：手动控制初始化

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

### 场景8：权限控制

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

### 场景9：非 lazy 模式完整案例（默认值 + 字段覆盖）

**适用场景**：编辑模式，需要从业务 API 获取数据、设置默认值、覆盖特定字段渲染。

```vue
<template>
  <div class="fill-page">
    <!-- 加载中 -->
    <div v-if="loading" class="loading-container">
      <a-spin size="large" />
    </div>
    
    <!-- DynamicForm -->
    <DynamicForm
      v-else-if="formHistoryId"
      :history-id="formHistoryId"
      :show-submit="true"
      :default-values="defaultValues"
      @submit="handleSubmit"
    >
      <!-- 头部信息区域 -->
      <template #header-info>
        <a-tag v-if="enterpriseName" color="green">
          企业：{{ enterpriseName }}
        </a-tag>
        <a-tag v-if="productName" color="purple">
          产品：{{ productName }}
        </a-tag>
        <a-tag v-if="versionNo" color="blue">
          批号：{{ versionNo }}
        </a-tag>
      </template>

      <!-- 字段覆盖：接触部位 -->
      <template #field:jie_chu_bu_wei="{ value, updateValue, readonly }">
        <a-select
          :value="value"
          :disabled="readonly"
          placeholder="请选择接触部位"
          style="width: 100%"
          @update:value="updateValue"
        >
          <a-select-option value="0">脸</a-select-option>
          <a-select-option value="1">口</a-select-option>
          <a-select-option value="2">脖子</a-select-option>
        </a-select>
      </template>
    </DynamicForm>
    
    <!-- 无数据提示 -->
    <a-result
      v-else
      status="404"
      title="记录不存在"
      sub-title="未找到填报记录，请检查链接是否正确"
    />
  </div>
</template>

<script setup>
import { message } from 'ant-design-vue'
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import DynamicForm from '@/framework/components/common/DynamicForm/index.vue'

// 业务 API
import { evalEnterpriseHistoryQueryById } from '@/apis/evalEnterpriseHistoryPortalController'
import { submitProduction } from '@/apis/productionController'

const route = useRoute()

// 从 URL 获取业务 historyId
const businessHistoryId = computed(() => route.query.id as string || '')

// 业务数据
const businessInfo = ref(null)
const loading = ref(true)

// 传递给 DynamicForm 的参数
const formHistoryId = computed(() => businessInfo.value?.dataHistoryId || '')

// 默认值（从业务数据获取，映射到字段名）
const defaultValues = computed(() => {
  if (!businessInfo.value) return {}
  const values = {}
  if (businessInfo.value.enterpriseName) {
    values['companyName'] = businessInfo.value.enterpriseName
  }
  if (businessInfo.value.productName) {
    values['productName'] = businessInfo.value.productName
  }
  if (businessInfo.value.versionNo) {
    values['批号'] = businessInfo.value.versionNo
  }
  return values
})

// 头部显示信息
const enterpriseName = computed(() => businessInfo.value?.enterpriseName || '')
const productName = computed(() => businessInfo.value?.productName || '')
const versionNo = computed(() => businessInfo.value?.versionNo || '')

// 加载业务数据
onMounted(async () => {
  if (!businessHistoryId.value) {
    loading.value = false
    return
  }
  
  try {
    const res = await evalEnterpriseHistoryQueryById(
      { id: businessHistoryId.value },
      false, false, true
    )
    if (res?.status?.code === 0 && res.payload) {
      businessInfo.value = res.payload
    } else {
      message.error('未找到填报记录')
    }
  } catch (error) {
    console.error('加载业务数据失败:', error)
    message.error('加载业务数据失败')
  } finally {
    loading.value = false
  }
})

// 业务提交：监听框架 submit 事件执行业务逻辑
const handleSubmit = async (historyId) => {
  await submitProduction({ historyId })
  message.success('提交成功')
  setTimeout(() => window.close(), 1000)
}
</script>

<style scoped>
.fill-page {
  height: 100vh;
  overflow: hidden;
}
.loading-container {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}
</style>
```

**关键点说明：**

| 功能 | 实现方式 |
|------|----------|
| 数据获取 | 业务层调用 API 获取业务数据，提取 `dataHistoryId` 传给 DynamicForm |
| 默认值 | 通过 `defaultValues` prop 传入 `{ fieldName: value }` 映射 |
| 字段覆盖 | 使用 `#field:{fieldName}` slot 覆盖特定字段的渲染 |
| 业务提交 | 监听 `@submit` 事件，执行业务 API 调用和后续逻辑 |
| URL 简洁 | 只传递业务 ID，不传递中文等参数 |

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
5. **提交按钮**只在填报模式下且状态为未提交/未通过时显示
6. **返回按钮**不是默认显示的，需要通过 `header-actions` 插槽自行添加
7. **事件驱动模式**：框架通过 `emit('submit')` 通知业务端，业务端监听 `@submit` 执行业务逻辑（如调用业务 API），框架不直接调用业务 API
8. **字段覆盖**：使用 `#field:{fieldName}` slot 可以覆盖特定字段的渲染，slot 参数包含 `value`、`updateValue`、`readonly`、`attribute`
9. **默认值映射**：`defaultValues` 的 key 是字段的 `name` 属性（fieldName），不是字段 ID
10. **审核模式**：设置 `mode="approve"` 后，根据状态自动显示通过/拒绝按钮
11. **状态控制**：编辑权限和按钮显示由 `mode` 和 `status` 自动控制，无需手动设置
