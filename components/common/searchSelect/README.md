# SearchSelect 搜索下拉选择组件

通用的支持远程搜索的下拉选择组件，适用于需要从后端 API 动态加载选项的场景。

## 功能特性

- ✅ 支持远程搜索（防抖处理）
- ✅ 直接传入 API 函数（类型安全）
- ✅ 支持自定义显示格式（插槽）
- ✅ 支持分页和非分页数据
- ✅ 自动处理加载状态
- ✅ 支持编辑模式初始值设置
- ✅ 完整的 v-model 支持
- ✅ 支持自定义请求构造（customRequestBuilder）
- ✅ 自动去重处理（根据 valueField）
- ✅ 支持组件联动（setInitialOptions / clearOptions）

## 基础用法

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { staffSdmGeneralSelect } from '@/apis/staffSdmPortalController'
import SearchSelect from '@/framework/components/common/searchSelect/index.vue'

const sdmId = ref()

const handleChange = (value, option) => {
  console.log('选中的值:', value)
  console.log('选中的选项:', option)
}
</script>

<template>
  <SearchSelect
    v-model="sdmId"
    :api-fn="staffSdmGeneralSelect"
    search-property="name"
    value-field="id"
    label-field="name"
    placeholder="请输入名称搜索SDM"
    @change="handleChange"
  />
</template>
```

## Props 参数

| 参数 | 说明 | 类型 | 默认值 | 必填 |
|------|------|------|--------|------|
| modelValue | 绑定值 | `string \| number` | - | 否 |
| apiFn | API 函数（从 apis 文件导入） | `(...args: any[]) => Promise<any>` | - | 是 |
| searchProperty | 搜索的字段名 | `string` | `'name'` | 否 |
| valueField | 选项值字段 | `string` | `'id'` | 否 |
| labelField | 选项标签字段 | `string` | `'name'` | 否 |
| placeholder | 占位提示文字 | `string` | `'请输入关键字搜索'` | 否 |
| disabled | 是否禁用 | `boolean` | `false` | 否 |
| allowClear | 是否可清空 | `boolean` | `true` | 否 |
| pageSize | 每页数量 | `number` | `50` | 否 |
| debounceTime | 防抖时间(ms) | `number` | `300` | 否 |
| selectColumns | 查询返回的字段列表 | `string[]` | - | 否 |
| customRequestBuilder | 自定义请求构造函数（优先级最高） | `(keyword: string) => any` | - | 否 |

## Events 事件

| 事件名 | 说明 | 回调参数 |
|--------|------|----------|
| update:modelValue | 值变化时触发 | `(value: string \| number \| undefined)` |
| change | 选择变化时触发 | `(value: string \| number \| undefined, option: any)` |

## Methods 方法

通过 ref 可以调用以下方法：

| 方法名 | 说明 | 参数 |
|--------|------|------|
| setInitialOption | 设置单个初始选项（编辑模式） | `(option: any)` |
| setInitialOptions | 设置多个初始选项 | `(options: any[])` |
| refresh | 刷新选项列表，重新执行搜索 | `(keyword?: string)` |
| clearOptions | 清空选项列表 | - |

## 插槽

### option 插槽

自定义选项显示格式。

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { staffSdmGeneralSelect } from '@/apis/staffSdmPortalController'
import SearchSelect from '@/framework/components/common/searchSelect/index.vue'

const sdmId = ref()
</script>

<template>
  <SearchSelect
    v-model="sdmId"
    :api-fn="staffSdmGeneralSelect"
    search-property="name"
    value-field="id"
    label-field="name"
  >
    <template #option="{ option }">
      <div>
        <span style="font-weight: bold;">{{ option.name }}</span>
        <span style="color: #999; margin-left: 8px;">{{ option.code }}</span>
      </div>
    </template>
  </SearchSelect>
</template>
```

## 完整示例

### 示例 1: 基础用法（SDM 选择）

```vue
<script setup lang="ts">
import SearchSelect from '@/framework/components/common/searchSelect/index.vue'
import { staffSdmGeneralSelect } from '@/apis/staffSdmPortalController'

const formData = ref({
  sdmId: undefined,
  sdmName: ''
})

const handleSdmChange = (value, option) => {
  formData.value.sdmId = value
  formData.value.sdmName = option?.name || ''
}
</script>

<template>
  <a-form-item label="区域经理(SDM)" name="sdmId">
    <SearchSelect
      v-model="formData.sdmId"
      :api-fn="staffSdmGeneralSelect"
      search-property="name"
      value-field="id"
      label-field="name"
      placeholder="请输入名称搜索SDM"
      @change="handleSdmChange"
    />
  </a-form-item>
</template>
```

### 示例 2: 编辑模式（带初始值）

```vue
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { staffSdmGeneralSelect } from '@/apis/staffSdmPortalController'
import SearchSelect from '@/framework/components/common/searchSelect/index.vue'

const sdmSelectRef = ref()
const formData = ref({
  sdmId: 123,
  sdmName: '张三'
})

onMounted(() => {
  // 设置初始选项
  if (formData.value.sdmId && sdmSelectRef.value) {
    sdmSelectRef.value.setInitialOption({
      id: formData.value.sdmId,
      name: formData.value.sdmName
    })
  }
})
</script>

<template>
  <SearchSelect
    ref="sdmSelectRef"
    v-model="formData.sdmId"
    :api-fn="staffSdmGeneralSelect"
    search-property="name"
    placeholder="请输入名称搜索SDM"
  />
</template>
```

### 示例 3: 自定义显示格式

```vue
<script setup lang="ts">
import { accountGeneralSelect } from '@/apis/accountPortalController'
import SearchSelect from '@/framework/components/common/searchSelect/index.vue'

const userId = ref()
</script>

<template>
  <SearchSelect
    v-model="userId"
    :api-fn="accountGeneralSelect"
    search-property="userName"
    value-field="customerNumber"
  >
    <template #option="{ option }">
      <div style="display: flex; justify-content: space-between;">
        <span>{{ option.userName }}</span>
        <span style="color: #999;">{{ option.name }}</span>
      </div>
    </template>
  </SearchSelect>
</template>
```

### 示例 4: 自定义请求构造（多字段 OR 搜索）

```vue
<script setup lang="ts">
import { accountAdvancedQuery } from '@/apis/accountPortalController'
import SearchSelect from '@/framework/components/common/searchSelect/index.vue'

const accountNumber = ref()

// 自定义请求构造函数（适配 accountAdvancedQuery API）
const buildAccountRequest = (keyword: string) => {
  return {
    condition: {
      andOr: '1', // OR 关系
      conditionList: [
        {
          property: 'userName',
          relation: 6, // LIKE
          value: [keyword]
        },
        {
          property: 'name',
          relation: 6, // LIKE
          value: [keyword]
        }
      ],
      pageSize: 50
    }
  }
}

const handleChange = (value, option) => {
  console.log('选中账号:', option.userName, option.name)
}
</script>

<template>
  <SearchSelect
    v-model="accountNumber"
    :api-fn="accountAdvancedQuery"
    value-field="customerNumber"
    :custom-request-builder="buildAccountRequest"
    @change="handleChange"
  >
    <template #option="{ option }">
      {{ option.userName || '' }} - {{ option.name || '' }}
    </template>
  </SearchSelect>
</template>
```

**说明**：
- 使用 `customRequestBuilder` 可以完全自定义请求格式
- 适用于特殊的 API（如 `accountAdvancedQuery`）
- 支持多字段 OR 关系搜索
- 自定义插槽显示 `userName - name` 格式

### 示例 5: 两个 SearchSelect 联动（物料编码与 MatchCode）

**场景说明**：
- 物料编码和 MatchCode 可以独立搜索
- 选择 MatchCode 后，物料编码自动限定在该 MatchCode 下
- 选择物料编码后，自动填充对应的 MatchCode

```vue
<script setup lang="ts">
import { ref, watch } from 'vue'
import { materialInfoGeneralQuery } from '@/apis/materialInfoPortalController'
import { FILTER_TYPE } from '@/framework/components/common/Portal/type'
import SearchSelect from '@/framework/components/common/searchSelect/index.vue'

const materialData = ref({
  materialPartNumber: '',
  matchCode: '',
  bu: ''
})

const partNumberSelectRef = ref()
const matchCodeSelectRef = ref()

// 选择物料编码后，自动填充 MatchCode
const handleMaterialSelectByPartNumber = (value, option) => {
  if (option) {
    materialData.value.materialPartNumber = option.partNumber || ''
    materialData.value.matchCode = option.matchCode || ''
    materialData.value.bu = option.bu || ''
    
    // 更新 MatchCode 的初始选项（用于回显）
    if (matchCodeSelectRef.value && option.matchCode) {
      matchCodeSelectRef.value.setInitialOption({
        matchCode: option.matchCode
      })
    }
  } else {
    materialData.value.materialPartNumber = ''
    materialData.value.bu = ''
  }
}

// 选择 MatchCode 后，自动刷新物料编码的选项列表
const handleMaterialSelectByMatchCode = async (value) => {
  if (value) {
    materialData.value.matchCode = value
    
    // 验证当前物料编码是否属于该 MatchCode
    if (materialData.value.materialPartNumber) {
      try {
        const res = await materialInfoGeneralQuery({
          conditionList: [
            {
              property: 'partNumber',
              relation: FILTER_TYPE.EQUAL,
              value: [materialData.value.materialPartNumber]
            },
            {
              property: 'matchCode',
              relation: FILTER_TYPE.EQUAL,
              value: [value]
            }
          ],
          pageNum: 1,
          pageSize: 1
        }, false, false)
        
        // 如果物料编码不属于当前 MatchCode，清空物料编码和BU
        const isSuccess = res.status && res.status.code === 0
        if (!isSuccess || !res.payload?.records || res.payload.records.length === 0) {
          materialData.value.materialPartNumber = ''
          materialData.value.bu = ''
        }
      } catch (error) {
        console.error('验证物料编码失败:', error)
      }
    }
    
    // 刷新物料编码的选项列表，自动加载该 MatchCode 下的物料
    if (partNumberSelectRef.value) {
      try {
        const res = await materialInfoGeneralQuery({
          conditionList: [
            {
              property: 'matchCode',
              relation: FILTER_TYPE.EQUAL,
              value: [value]
            }
          ],
          pageNum: 1,
          pageSize: 100
        }, false, false)
        
        const isSuccess = res.status && res.status.code === 0
        if (isSuccess && res.payload?.records && res.payload.records.length > 0) {
          // 设置物料编码的选项列表
          partNumberSelectRef.value.setInitialOptions(res.payload.records)
        } else {
          // 清空选项列表
          partNumberSelectRef.value.clearOptions()
        }
      } catch (error) {
        console.error('加载物料列表失败:', error)
      }
    }
  } else {
    materialData.value.matchCode = ''
    // 清空物料编码的选项列表
    if (partNumberSelectRef.value) {
      partNumberSelectRef.value.clearOptions()
    }
  }
}

// 自定义物料编码搜索请求（添加 matchCode 过滤）
const buildPartNumberRequest = (searchKeyword) => {
  const conditionList = [
    {
      property: 'partNumber',
      relation: FILTER_TYPE.LIKE,
      value: [searchKeyword]
    }
  ]
  
  // 如果已选择 MatchCode，添加过滤条件
  if (materialData.value.matchCode) {
    conditionList.push({
      property: 'matchCode',
      relation: FILTER_TYPE.EQUAL,
      value: [materialData.value.matchCode]
    })
  }
  
  return {
    conditionList,
    pageNum: 1,
    pageSize: 100
  }
}
</script>

<template>
  <a-row :gutter="16">
    <a-col :span="12">
      <a-form-item>
        <template #label>
          <span style="color: #ff4d4f; margin-right: 4px">*</span>
          <span>物料编码</span>
        </template>
        <SearchSelect
          ref="partNumberSelectRef"
          v-model="materialData.materialPartNumber"
          :api-fn="materialInfoGeneralQuery"
          :custom-request-builder="buildPartNumberRequest"
          search-property="partNumber"
          value-field="partNumber"
          label-field="partNumber"
          placeholder="请输入物料编码"
          :page-size="100"
          @change="handleMaterialSelectByPartNumber"
        >
          <template #option="{ option }">
            {{ option.partNumber }} - {{ option.matchCode }}
          </template>
        </SearchSelect>
      </a-form-item>
    </a-col>
    
    <a-col :span="12">
      <a-form-item label="MatchCode">
        <SearchSelect
          ref="matchCodeSelectRef"
          v-model="materialData.matchCode"
          :api-fn="materialInfoGeneralQuery"
          search-property="matchCode"
          value-field="matchCode"
          label-field="matchCode"
          placeholder="请输入MatchCode"
          :page-size="100"
          @change="handleMaterialSelectByMatchCode"
        />
      </a-form-item>
    </a-col>
  </a-row>
</template>
```

**联动逻辑说明**：

1. **物料编码 → MatchCode**
   - 选择物料编码后，自动填充 MatchCode 和 BU
   - 使用 `setInitialOption` 方法更新 MatchCode 的显示

2. **MatchCode → 物料编码**
   - 选择 MatchCode 后，自动加载该 MatchCode 下的所有物料（最多100条）
   - 使用 `setInitialOptions` 方法预填充物料编码的选项列表
   - 验证当前物料编码是否属于新的 MatchCode，如果不属于则清空

3. **搜索过滤**
   - 使用 `customRequestBuilder` 自定义物料编码的搜索请求
   - 如果已选择 MatchCode，搜索时自动添加 MatchCode 过滤条件
   - 确保搜索结果始终在选定的 MatchCode 范围内

4. **清空处理**
   - 清空 MatchCode 时，使用 `clearOptions` 清空物料编码的选项列表
   - 保留物料编码的值，不自动清空

## 请求格式说明

### 标准模式

组件会自动构造以下格式的请求体：

```json
{
  "conditionList": [
    {
      "property": "name",
      "relation": 6,
      "value": ["关键字"]
    }
  ],
  "pageSize": 50,
  "selectColumnList": ["id", "name", "code"]  // 可选，指定返回的字段
}
```

其中 `relation: 6` 表示 LIKE 模糊查询。

**使用 `selectColumns` 参数**：

```vue
<SearchSelect
  v-model="userId"
  :api-fn="userGeneralQuery"
  search-property="name"
  :select-columns="['id', 'name', 'code', 'email']"
/>
```

请求体将包含 `selectColumnList`，告诉后端只返回指定的字段，减少数据传输量。

### 自定义模式

使用 `customRequestBuilder` 时，完全由你控制请求格式：

```javascript
const buildRequest = (keyword: string) => {
  return {
    condition: {
      andOr: '1',  // OR 关系
      conditionList: [
        { property: 'field1', relation: 6, value: [keyword] },
        { property: 'field2', relation: 6, value: [keyword] }
      ],
      pageSize: 50
    }
  }
}
```

## 数据格式说明

后端返回的数据支持两种格式：

### 格式 1: 分页数据

```json
{
  "payload": {
    "records": [
      { "id": 1, "name": "选项1" },
      { "id": 2, "name": "选项2" }
    ],
    "total": 100
  }
}
```

### 格式 2: 非分页数据

```json
{
  "payload": [
    { "id": 1, "name": "选项1" },
    { "id": 2, "name": "选项2" }
  ]
}
```

## 注意事项

1. **防抖处理**: 默认 300ms 防抖，可通过 `debounceTime` 自定义
2. **最小输入**: 需要至少输入 1 个字符才会触发搜索
3. **空值处理**: 清空输入时会自动清空选项列表
4. **错误处理**: 请求失败时会在控制台输出错误，不会显示错误提示
5. **编辑模式**: 使用 `setInitialOption` 方法设置初始值，需确保 ref 已挂载
6. **自定义构造**: `customRequestBuilder` 优先级最高，适用于特殊 API 格式
7. **标准模式**: 不使用 `customRequestBuilder` 时，使用标准的 `conditionList` 格式
8. **API 函数**: 直接传入从 apis 文件导入的函数，类型安全且通用
9. **去重处理**: 搜索结果会根据 `valueField` 自动去重，避免重复选项
10. **联动刷新**: 使用 `setInitialOptions` 可以预填充选项列表，使用 `clearOptions` 清空选项列表
11. **方法调用**: 调用组件方法时需确保 ref 已正确挂载，建议在 `onMounted` 或异步操作中调用

## 常见问题

### Q: 为什么没有搜索结果？

A: 请检查：
1. API 函数是否正确导入
2. `searchProperty` 是否与后端字段名匹配
3. 后端返回的数据格式是否符合要求
4. 浏览器控制台是否有错误信息

### Q: 如何在表单中使用？

A: 直接在 `a-form-item` 中使用即可，组件内部已处理 v-model 绑定。

### Q: 如何获取选中项的完整信息？

A: 使用 `@change` 事件，第二个参数 `option` 包含完整的选项数据。

### Q: 如何实现多选？

A: 当前组件不支持多选，如需多选功能请使用其他组件或扩展此组件。

### Q: 如何实现两个 SearchSelect 联动？

A: 参考示例 5，主要步骤：
1. 使用 `ref` 获取组件实例
2. 在 `@change` 事件中调用另一个组件的 `setInitialOptions` 或 `clearOptions` 方法
3. 使用 `customRequestBuilder` 自定义搜索请求，添加联动过滤条件
4. 验证数据一致性，必要时清空或更新关联字段

### Q: 如何预填充选项列表？

A: 使用 `setInitialOptions` 方法：
```javascript
if (selectRef.value) {
  selectRef.value.setInitialOptions([
    { id: 1, name: '选项1' },
    { id: 2, name: '选项2' }
  ])
}
```
