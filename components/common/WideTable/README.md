# WideTable 宽表收集统计组件

通用的表单数据宽表收集与查看框架组件，支持动态建表、数据收集和数据可视化查看。

---

## 架构概览

```
┌─ 框架层 (forge / framework) ──────────────────────────┐
│                                                        │
│  WideTableConfigProvider (接口)                        │
│  ├── getFixedColumns() → 固定列定义                     │
│                                                        │
│  WideTableBusinessContextProvider (接口)               │
│  ├── getContext(historyId) → 单条业务上下文              │
│  └── getSubmittedHistories(formId) → 待收集列表          │
│                                                        │
│  FormWideTableManager (框架服务)                        │
│  ├── 建表 DDL 生成                                      │
│  ├── Portal 列配置生成                                  │
│  └── 物理表增量更新                                     │
│                                                        │
│  FormWideTableCollector (框架服务)                      │
│  └── 从 FormData(EAV) → 物理宽表 INSERT                │
│                                                        │
│  WideTableView.vue (前端骨架组件)                       │
│  ├── 产品树选择                                         │
│  ├── 字段树（Module → Section → Group）                 │
│  └── 动态数据表格（字典翻译）                            │
│                                                        │
└────────────────────────────────────────────────────────┘
         ▲ 实现 / 注入
         │
┌─ 业务层 (mpbe-manage / 业务页面) ──────────────────────┐
│                                                        │
│  EvalWideTableConfigProvider (实现)                    │
│  └── 定义: 企业名称、产品名称、批号、提交时间、审批状态   │
│                                                        │
│  EvalWideTableContextProvider (实现)                   │
│  └── 从 EvalEnterpriseHistory 组装业务上下文            │
│                                                        │
│  view.vue (业务调用页，~30 行)                          │
│  └── 传入 productSelectFn + fixedColumns               │
│                                                        │
└────────────────────────────────────────────────────────┘
```

## 新项目接入步骤

### 一、后端接入（3 步）

#### Step 1: 实现 `WideTableConfigProvider`

定义你的业务固定列（企业名、状态等维度字段）：

```java
@Service
public class YourConfigProvider implements WideTableConfigProvider {

    @Override
    public List<WideTableFixedColumn> getFixedColumns() {
        return Arrays.asList(
            // 参数: 列名, MySQL类型, 显示名, PortalFieldDict值, 字典ID(可null), contextKey, 列宽
            new WideTableFixedColumn("org_name", "varchar(200)", "机构名称",
                    PortalFieldDict.STRING.getValue(), null, "orgName", 150),
            new WideTableFixedColumn("status", "varchar(10)", "审批状态",
                    PortalFieldDict.ENUM.getValue(), "YOUR_DICT", "status", 100)
        );
    }
}
```

**`WideTableFixedColumn` 字段说明：**

| 字段 | 说明 | 示例 |
|------|------|------|
| `columnName` | 物理表列名 | `enterprise_name` |
| `columnType` | MySQL 列类型 | `varchar(200)` / `datetime` / `bigint(20)` |
| `columnLabel` | 列显示名 | `企业名称` |
| `portalFieldType` | Portal 字段类型 | `PortalFieldDict.STRING/ENUM/DATETIME` |
| `dictId` | 关联字典 ID | `APPROVAL_DICT`（非字典字段为 null） |
| `contextKey` | 上下文取值键 | `enterpriseName`（对应 `WideTableBusinessContext` 字段） |
| `width` | Portal 列宽 | `150` |

#### Step 2: 实现 `WideTableBusinessContextProvider`

提供数据来源（如何从业务表关联到表单填报记录）：

```java
@Service
public class YourContextProvider implements WideTableBusinessContextProvider {

    @Override
    public WideTableBusinessContext getContext(String historyId) {
        // 根据 historyId 查询业务表，组装上下文
        YourHistory hist = yourHistoryService.findByDataHistoryId(historyId);
        WideTableBusinessContext ctx = new WideTableBusinessContext();
        ctx.setHistoryId(historyId);
        ctx.setEnterpriseName(hist.getOrgName());  // 对应 configProvider 中的 contextKey
        ctx.setStatus(hist.getStatus());
        // ... 设置其他字段
        return ctx;
    }

    @Override
    public List<WideTableBusinessContext> getSubmittedHistories(String formId, List<String> excludeIds) {
        // 查询待收集的已提交记录，排除已收集的
        // 返回 WideTableBusinessContext 列表
    }
}
```

> **注意**：如果你的业务需要额外的上下文字段，可以在 `WideTableBusinessContext` 中添加字段，
> 并在 `getContextValue()` 的 switch 中添加对应的 case。

#### Step 3: 注入 Provider

```java
@Component
@RequiredArgsConstructor
public class YourWideTableInjection {

    private final FormWideTableCollector collector;
    private final FormWideTableManager manager;
    private final YourConfigProvider configProvider;
    private final YourContextProvider contextProvider;

    @PostConstruct
    public void inject() {
        collector.setContextProvider(contextProvider);
        collector.setConfigProvider(configProvider);
        manager.setConfigProvider(configProvider);
    }
}
```

### 二、前端接入（1 步）

在业务页面引入框架组件，传入配置即可：

```vue
<script setup lang="ts">
import { WideTableView } from '@/framework/components/common/WideTable'
import type { FixedColumn } from '@/framework/components/common/WideTable'

// 你的产品列表 API
import { yourProductSelect } from '@/apis/yourProductController'

const props = defineProps<{
  configId?: number | null
  isEmbedded?: boolean
}>()
const emit = defineEmits<{ back: [] }>()

// 产品加载函数
const productSelectFn = () => yourProductSelect({
  sortList: [{ property: 'sort', type: 0 }],
})

// 固定列定义（与后端 WideTableConfigProvider 一一对应）
const fixedColumns: FixedColumn[] = [
  { field: 'enterprise_name', label: '企业名称', width: 150 },
  { field: 'product_name', label: '产品名称', width: 150 },
  { field: 'submitted_at', label: '提交时间', width: 160, type: 'datetime' },
  { field: 'status', label: '审批状态', width: 80, type: 'dict', dictId: 'APPROVAL_DICT' },
]
</script>

<template>
  <WideTableView
    :product-select-fn="productSelectFn"
    :fixed-columns="fixedColumns"
    :is-embedded="props.isEmbedded"
    :config-id="props.configId"
    @back="emit('back')"
  />
</template>
```

## 组件 API

### `<WideTableView>` Props

| Prop | 类型 | 必填 | 说明 |
|------|------|------|------|
| `productSelectFn` | `() => Promise<any>` | ✅ | 产品列表加载函数，返回 `{ id, title, formId }` 数组 |
| `fixedColumns` | `FixedColumn[]` | ✅ | 固定列定义数组 |
| `configApiPrefix` | `string` | ❌ | 宽表 API 前缀，默认 `/form/widetable` |
| `isEmbedded` | `boolean` | ❌ | 嵌入模式（显示返回按钮），默认 `false` |
| `configId` | `number` | ❌ | 配置入口 ID，传入后自动锁定产品和方案 |

### `<WideTableView>` Events

| 事件 | 参数 | 说明 |
|------|------|------|
| `back` | 无 | 点击返回按钮时触发 |

### `FixedColumn` 类型

```typescript
interface FixedColumn {
  field: string                  // 物理列名
  label: string                  // 显示名
  width?: number                 // 列宽（默认 150）
  type?: 'string' | 'datetime' | 'dict'  // 列类型
  dictId?: string                // 字典ID（type='dict' 时必填）
}
```

## 交互说明

### 双模式切换

```
┌─────────────────────────────────────────────────┐
│  独立页面模式                     嵌入模式       │
│  （无返回按钮）                  （有返回按钮）    │
│                                                 │
│  初始：产品树                    自动锁定产品+方案 │
│    ├── 产品 A                   直接进入字段选择  │
│    └── 产品 B                                    │
│                                                 │
│  选定产品后：                                    │
│  ┌────────────┬──────────────────┐              │
│  │ 产品A [变更]│ 方案：[Tab1][Tab2]│              │
│  │ 收集字段    │                  │              │
│  │ ▼ 模块A    │  数据表格         │              │
│  │   ☑ 字段   │                  │              │
│  └────────────┴──────────────────┘              │
│                                                 │
│  点击「变更」→ 恢复产品树，隐藏字段               │
└─────────────────────────────────────────────────┘
```

### 字段选择

- 仅已配置收集的字段可勾选，未收集字段灰显禁用
- 支持全选 / 反选
- 字典类型字段标记「字典」标签
- 字段名旁显示 ID（对应物理列名后缀）

## 数据链路

```
FormDataHistory (框架表)          YourHistory (业务表)
  ├── id ─────────────── data_history_id ────┤
  ├── form_id                               │
  ├── status                                ├── org_id → YourOrg
  └── submitted_at                          └── product_id → YourProduct
       │
       ▼
FormData (框架表, EAV 模型)
  ├── history_id → FormDataHistory.id
  ├── attribute_id → FormSchemaAttribute.id
  └── value
       │
       ▼  FormWideTableCollector
       │
物理宽表 wt_form_xxx
  ├── id, history_id (框架固定列)
  ├── org_name, status, ... (业务固定列, provider 定义)
  ├── field_1, field_2, ... (动态字段列, 按配置生成)
  └── create_at
```

## 注意事项

1. **前后端对齐**：前端 `FixedColumn.field` 必须与后端 `WideTableFixedColumn.columnName` 一致
2. **contextKey 映射**：后端 `contextKey` 对应 `WideTableBusinessContext` 的字段名，在 `getContextValue()` 中处理
3. **字典预加载**：框架组件会自动预加载 `fixedColumns` 和动态字段中标记的字典
4. **物理表列名规则**：动态字段列名 = 拼音(截断50字符) + `_` + attributeId，确保唯一且不超 MySQL 64 字符限制
5. **字段类型映射**：`text`（默认）、`decimal(20,4)`（数字）、`varchar(50)`（日期），统一避免行大小超限
