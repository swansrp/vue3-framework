# Dataset配置管理 - API对接说明

## 概述

本文档说明Dataset配置管理模块需要对接的后端API接口，包括接口路径、请求参数、响应格式等。

## API清单

### 1. Dataset配置管理

#### 1.1 解析SQL（预览，不保存）

**接口**: `POST /web/dataset/config/parse`

**说明**: 将SQL解析为Dataset配置，用于预览，不保存到数据库

**请求体**:
```typescript
interface ParseRequest {
  tableId: string      // Dataset ID
  sql: string          // 完整的SELECT SQL
  dataSource?: string  // 数据源，默认default
}
```

**响应**:
```typescript
interface ParseResponse {
  tableId: string
  dataSource?: string
  datasets: DatasetTableInfo[]
  columns: DatasetColumnInfo[]
}
```

**前端调用位置**: `SqlEditModal.vue` - `handlePreview()`

---

#### 1.2 解析SQL并保存

**接口**: `POST /web/dataset/config/replace`

**说明**: 将SQL解析为Dataset配置并保存，会替换原有配置

**请求体**: 同1.1

**响应**: 同1.1

**前端调用位置**: `SqlEditModal.vue` - `handleOk()`

---

#### 1.3 获取Dataset配置

**接口**: `GET /web/dataset/config?tableId={tableId}`

**说明**: 获取指定Dataset的完整配置

**请求参数**:
- `tableId`: string - Dataset ID

**响应**: 同1.1

**前端调用位置**: 
- `DatasetManage.vue` - `loadData()`
- `DatasetDetail.vue` - 初始化数据

---

#### 1.4 获取Dataset列表

**接口**: `GET /web/dataset/config/list` 或 `POST /web/dataset/config/query`

**说明**: 获取所有Dataset配置列表

**请求参数**:
```typescript
interface QueryRequest {
  pageNum?: number
  pageSize?: number
  tableId?: string     // 搜索条件：Dataset ID
}
```

**响应**:
```typescript
interface QueryResponse {
  total: number
  records: DatasetInfo[]
}
```

**前端调用位置**: `DatasetManage.vue` - `loadData()`

---

#### 1.5 删除Dataset配置

**接口**: `POST /web/dataset/config/delete` 或 `DELETE /web/dataset/config/{tableId}`

**说明**: 删除指定Dataset的所有配置（包括表配置和列配置）

**请求参数**:
```typescript
interface DeleteRequest {
  tableId: string
}
```

**响应**:
```typescript
interface CommonResponse {
  code: number
  message: string
}
```

**前端调用位置**: `DatasetManage.vue` - `handleDelete()`

---

### 2. 列配置管理

#### 2.1 获取列配置列表

**接口**: `GET /web/dataset/config/column/list?tableId={tableId}`

**说明**: 获取指定Dataset的所有列配置

**请求参数**:
- `tableId`: string - Dataset ID

**响应**:
```typescript
interface ColumnListResponse {
  data: DatasetColumnInfo[]
}
```

**前端调用位置**: `ColumnConfig.vue` - `loadData()`

---

#### 2.2 添加列配置

**接口**: `POST /web/dataset/config/column/add`

**说明**: 为Dataset添加新列

**请求体**:
```typescript
interface AddColumnRequest {
  tableId: string
  columnSql: string       // SQL表达式
  columnAlias: string     // 字段别名
  isAggregate?: string    // 是否聚合 Y/N
  displayOrder?: number   // 显示顺序
  isVisible?: string      // 是否显示 Y/N
  remark?: string         // 备注
}
```

**响应**: CommonResponse

**前端调用位置**: `ColumnEditModal.vue` - `handleOk()` (新增模式)

---

#### 2.3 更新列配置

**接口**: `POST /web/dataset/config/column/update`

**说明**: 更新列配置信息

**请求体**:
```typescript
interface UpdateColumnRequest {
  id: string              // 列配置ID
  tableId: string
  columnSql: string
  columnAlias: string
  isAggregate?: string
  displayOrder?: number
  isVisible?: string
  remark?: string
}
```

**响应**: CommonResponse

**前端调用位置**: 
- `ColumnEditModal.vue` - `handleOk()` (编辑模式)
- `ColumnConfig.vue` - `handleVisibleChange()`

---

#### 2.4 删除列配置

**接口**: `POST /web/dataset/config/column/delete`

**说明**: 删除指定列配置

**请求体**:
```typescript
interface DeleteColumnRequest {
  id: string
}
```

**响应**: CommonResponse

**前端调用位置**: `ColumnConfig.vue` - `handleDelete()`

---

#### 2.5 批量更新列顺序

**接口**: `POST /web/dataset/config/column/update/order`

**说明**: 批量更新列的显示顺序

**请求体**:
```typescript
interface UpdateOrderRequest {
  orders: Array<{
    id: string
    showOrder: number
  }>
}
```

**响应**: CommonResponse

**前端调用位置**: `ColumnConfig.vue` - `updateOrder()`

---

### 3. 数据查询

#### 3.1 查询Dataset数据

**接口**: `POST /web/dataset/data/query` 或 `POST /dynamic/portal/{tableId}/query`

**说明**: 基于Dataset配置查询数据

**请求体**:
```typescript
interface DataQueryRequest {
  tableId: string
  pageNum?: number
  pageSize?: number
  conditionList?: Array<{
    field: string
    filterType: string    // EQUAL, LIKE, HAVING_EQUAL等
    value: any[]
  }>
  orderList?: Array<{
    field: string
    order: 'ASC' | 'DESC'
  }>
}
```

**响应**:
```typescript
interface DataQueryResponse {
  total: number
  records: any[]         // 根据Dataset配置的列返回数据
}
```

**前端调用位置**: `DataQuery.vue` - `handleQuery()`

---

## 对接步骤

### 第一步：创建API接口文件

在 `src/apis/` 目录下创建 `datasetConfigController.ts`:

```typescript
import { request } from '@/framework/network/request'
import type { 
  DatasetInfo, 
  DatasetColumnInfo, 
  DatasetConfigReq,
  IdOrderReqVO 
} from '@/views/dataset/types'

// 解析SQL（预览）
export const parseDatasetSql = (data: DatasetConfigReq) => {
  return request<DatasetInfo>({
    url: '/web/dataset/config/parse',
    method: 'POST',
    data
  })
}

// 解析SQL并保存
export const replaceDatasetConfig = (data: DatasetConfigReq) => {
  return request<DatasetInfo>({
    url: '/web/dataset/config/replace',
    method: 'POST',
    data
  })
}

// 获取Dataset配置
export const getDatasetConfig = (tableId: string) => {
  return request<DatasetInfo>({
    url: '/web/dataset/config',
    method: 'GET',
    params: { tableId }
  })
}

// 获取Dataset列表
export const getDatasetList = (params?: any) => {
  return request<{ total: number; records: DatasetInfo[] }>({
    url: '/web/dataset/config/query',
    method: 'POST',
    data: params
  })
}

// 删除Dataset
export const deleteDataset = (tableId: string) => {
  return request({
    url: '/web/dataset/config/delete',
    method: 'POST',
    data: { tableId }
  })
}

// 获取列配置列表
export const getDatasetColumns = (tableId: string) => {
  return request<DatasetColumnInfo[]>({
    url: '/web/dataset/config/column/list',
    method: 'GET',
    params: { tableId }
  })
}

// 添加列配置
export const addDatasetColumn = (data: DatasetColumnInfo) => {
  return request({
    url: '/web/dataset/config/column/add',
    method: 'POST',
    data
  })
}

// 更新列配置
export const updateDatasetColumn = (data: DatasetColumnInfo) => {
  return request({
    url: '/web/dataset/config/column/update',
    method: 'POST',
    data
  })
}

// 删除列配置
export const deleteDatasetColumn = (id: string) => {
  return request({
    url: '/web/dataset/config/column/delete',
    method: 'POST',
    data: { id }
  })
}

// 批量更新列顺序
export const updateDatasetColumnOrder = (orders: IdOrderReqVO[]) => {
  return request({
    url: '/web/dataset/config/column/update/order',
    method: 'POST',
    data: orders
  })
}

// 查询Dataset数据
export const queryDatasetData = (data: any) => {
  return request<{ total: number; records: any[] }>({
    url: '/web/dataset/data/query',
    method: 'POST',
    data
  })
}
```

### 第二步：替换组件中的API调用

在各个组件中，将临时的mock代码替换为真实的API调用：

**DatasetManage.vue**:
```typescript
import { 
  getDatasetList, 
  deleteDataset 
} from '@/apis/datasetConfigController'

// 替换 loadData 方法
const loadData = async () => {
  loading.value = true
  try {
    const res = await getDatasetList({
      tableId: searchText.value || undefined
    })
    dataSource.value = res.data.records
  } catch (error) {
    console.error('加载数据失败:', error)
    message.error('加载数据失败')
  } finally {
    loading.value = false
  }
}

// 替换 handleDelete 方法
const handleDelete = async (record: DatasetInfo) => {
  try {
    await deleteDataset(record.tableId)
    message.success('删除成功')
    loadData()
  } catch (error) {
    console.error('删除失败:', error)
    message.error('删除失败')
  }
}
```

**SqlEditModal.vue**:
```typescript
import { 
  parseDatasetSql, 
  replaceDatasetConfig 
} from '@/apis/datasetConfigController'

// 替换 handlePreview 方法
const handlePreview = async () => {
  try {
    await formRef.value?.validate()
    previewLoading.value = true
    
    const res = await parseDatasetSql({
      tableId: formState.tableId,
      sql: formState.sql,
      dataSource: formState.dataSource
    })
    
    previewResult.value = res.data
    message.success('解析成功')
  } catch (error) {
    console.error('预览失败:', error)
    message.error('预览失败')
  } finally {
    previewLoading.value = false
  }
}

// 替换 handleOk 方法
const handleOk = async () => {
  try {
    await formRef.value?.validate()
    confirmLoading.value = true
    
    const res = await replaceDatasetConfig({
      tableId: formState.tableId,
      sql: formState.sql,
      dataSource: formState.dataSource
    })
    
    emit('ok', res.data)
    message.success('保存成功')
  } catch (error) {
    console.error('保存失败:', error)
    message.error('保存失败')
  } finally {
    confirmLoading.value = false
  }
}
```

**ColumnConfig.vue**:
```typescript
import {
  getDatasetColumns,
  addDatasetColumn,
  updateDatasetColumn,
  deleteDatasetColumn,
  updateDatasetColumnOrder
} from '@/apis/datasetConfigController'

// 替换各个方法...
```

**DataQuery.vue**:
```typescript
import { queryDatasetData } from '@/apis/datasetConfigController'

// 替换 handleQuery 方法
const handleQuery = async () => {
  loading.value = true
  try {
    const conditionList = Object.keys(queryForm)
      .filter(key => queryForm[key] !== undefined && queryForm[key] !== '')
      .map(key => {
        const column = queryableColumns.value.find(col => col.columnAlias === key)
        return {
          field: key,
          filterType: column?.isAggregate === 'Y' ? 'HAVING_EQUAL' : 'EQUAL',
          value: [queryForm[key]],
        }
      })

    const res = await queryDatasetData({
      tableId: props.dataset.tableId,
      pageNum: pagination.current,
      pageSize: pagination.pageSize,
      conditionList,
    })
    
    dataSource.value = res.data.records
    pagination.total = res.data.total
    message.success('查询成功')
  } catch (error) {
    console.error('查询失败:', error)
    message.error('查询失败')
  } finally {
    loading.value = false
  }
}
```

### 第三步：测试API对接

1. 确保后端服务已启动
2. 测试各个功能：
   - ✅ 创建Dataset
   - ✅ 预览SQL解析
   - ✅ 保存Dataset配置
   - ✅ 查看Dataset列表
   - ✅ 添加/编辑/删除列
   - ✅ 调整列顺序
   - ✅ 查询数据
   - ✅ 删除Dataset

3. 检查错误处理是否完善
4. 检查loading状态是否正确

## 注意事项

### 1. 响应格式统一

确保后端返回的数据格式符合前端期望：

```typescript
// 成功响应
{
  code: 0 或 200,
  data: {...},
  message: "操作成功"
}

// 错误响应
{
  code: 非0,
  data: null,
  message: "错误信息"
}
```

### 2. 错误处理

在API调用时要做好错误处理：

```typescript
try {
  const res = await someApi(params)
  if (res.code === 0) {
    // 成功处理
  } else {
    message.error(res.message || '操作失败')
  }
} catch (error) {
  console.error('API调用失败:', error)
  message.error('网络错误')
}
```

### 3. Loading状态

所有API调用都应该有loading状态：

```typescript
loading.value = true
try {
  await someApi()
} finally {
  loading.value = false
}
```

### 4. 数据刷新

数据修改后要及时刷新列表：

```typescript
const handleSubmit = async () => {
  await saveApi()
  message.success('保存成功')
  loadData()  // 刷新数据
}
```

## 后续优化

1. **请求拦截器**: 统一处理token、错误提示等
2. **响应拦截器**: 统一处理响应数据格式
3. **API缓存**: 对不常变化的数据进行缓存
4. **请求取消**: 防止重复请求
5. **错误重试**: 网络错误时自动重试
