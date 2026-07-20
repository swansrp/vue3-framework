# ResourcePerm 通用资源权限组件

给任意 list / tree 数据配置「谁能看」的通用权限组件。组件本身**不感知业务**，只认两样东西：

- `resourceType`：资源类型（即数据库表名，如 `sys_portal_dashboard_statistic`）
- `resources`：**由调用方传入的全部资源**（树形 `{ id, name, children? }`）

> 核心设计：组件不自己枚举资源，资源由「知道全部数据」的调用方传进来。因此后端反向接口完全通用，换业务场景只需换 `resourceType` + `resources`，组件零改动。

---

## 权限规则

| 情况 | 结果 |
|------|------|
| 资源无任何授权记录 | 不限制，所有人可见 |
| 资源有授权记录 | 仅授权的主体（角色/用户/用户组/部门）可见 |
| 当前用户是管理员 | 跳过校验，全部可见 |

授权主体类型（`subjectType`）：`0=角色` `1=用户` `2=用户组` `3=部门`

数据落在通用表 `ac_resource_perm(resource_type, resource_id, subject_type, subject_id)`。

---

## 文件结构

```
ResourcePerm/
├── ResourcePermManager.vue   # 入口弹窗容器：正向/反向切换，接收 resources
├── ForwardConfig.vue         # 正向面板：选资源 → 配主体
├── ReverseConfig.vue         # 反向面板：选主体 → 批量勾选资源
├── useResourcePerm.ts        # 弹窗状态 Hook：openPerm(resourceType, resources)
├── useSubjectData.ts         # 主体数据加载（角色/用户组树/部门），正反向复用
└── types.ts                  # PermResourceNode 类型定义
```

---

## 快速接入（3 步）

### 1. 准备资源数据

把你场景里的「全部资源」映射成 `PermResourceNode[]`（`{ id, name, children? }`）。
可以是扁平 list，也可以是 tree。

```ts
import type { PermResourceNode } from '@/framework/components/common/ResourcePerm/types'

// 例：把指标树 IndicatorNode { id, title, children } 映射过来
const commonIndicatorResources = computed<PermResourceNode[]>(() => {
  const mapNodes = (nodes: IndicatorNode[]): PermResourceNode[] =>
    (nodes || []).map(n => ({
      id: String(n.id),
      name: n.title,                                   // 显示名
      children: n.children?.length ? mapNodes(n.children) : undefined
    }))
  return mapNodes(commonIndicators.value)
})
```

### 2. 用 Hook 管理弹窗状态

```ts
import { useResourcePerm } from '@/framework/components/common/ResourcePerm/useResourcePerm'

const { permVisible, permResourceType, permResources, openPerm } = useResourcePerm()

// 在「知道全部资源」的地方放一个按钮触发
const openPermManager = () => {
  openPerm('sys_portal_dashboard_statistic', commonIndicatorResources.value)
}
```

### 3. 放置组件 + 触发按钮

```vue
<template>
  <a-button @click="openPermManager">权限配置</a-button>

  <ResourcePermManager
    v-model:visible="permVisible"
    :resource-type="permResourceType"
    :resources="permResources"
  />
</template>

<script setup>
import ResourcePermManager from '@/framework/components/common/ResourcePerm/ResourcePermManager.vue'
</script>
```

---

## 两种配置方向

弹窗顶部用分段切换器在两种方向间切换：

### 正向：按资源配置
左侧资源树选一个资源 → 右侧配置该资源的授权主体。
- 「已配置」Tab 竖向展示当前已授权的主体（类型 Tag + 名称）
- 角色 / 用户 / 用户组 / 部门 四个 Tab 进行多选
- 底部「清除权限」恢复为不限制、「保存」全量覆盖该资源的授权

### 反向：按主体配置
左侧选一个主体（角色/用户/用户组/部门）→ 右侧资源树批量勾选该主体可访问的资源。
- 多主体（如多选用户）时回显取**交集**，保存时对每个主体分别生效
- 保存为 **diff 增删**：只增删该主体的授权行，**不影响其他主体**
- 注意：给资源新增授权记录后，该资源会从「所有人可见」变为「仅授权主体可见」（界面有提示）

---

## Props 参考（ResourcePermManager）

| Prop | 类型 | 必填 | 说明 |
|------|------|------|------|
| `visible` | `boolean` | 是 | 弹窗显隐（支持 `v-model:visible`） |
| `resourceType` | `string` | 是 | 资源类型（表名） |
| `resources` | `PermResourceNode[]` | 是 | 该场景下的全部资源（树形） |
| `title` | `string` | 否 | 弹窗标题，默认「权限配置」 |

```ts
interface PermResourceNode {
  id: string
  name: string
  children?: PermResourceNode[]
}
```

---

## 后端接入：让展示侧按权限过滤

组件只负责「配置」，展示侧需要在查询 Service 里调用过滤服务。

`ResourcePermFilterService`（authorization 模块）：

```java
// 批量过滤：传入资源 id 列表，返回当前用户有权限的子集
List<String> filterAccessibleIds(String resourceType, List<String> resourceIds);

// 单个判断：当前用户是否有某资源的权限
boolean hasPermission(String resourceType, String resourceId);
```

接入示例（仪表盘指标）：

```java
private static final String RESOURCE_TYPE = "sys_portal_dashboard_statistic";
private final ResourcePermFilterService resourcePermFilterService;

public List<DashboardStatisticVO> getCommonStatistic(String tableId) {
    List<DashboardStatisticVO> list = /* 查出全部指标 */;
    return filterByPermission(list);
}

private List<DashboardStatisticVO> filterByPermission(List<DashboardStatisticVO> list) {
    if (FuncUtil.isEmpty(list)) return list;
    List<String> allIds = list.stream().map(v -> String.valueOf(v.getId())).collect(Collectors.toList());
    List<String> accessibleIds = resourcePermFilterService.filterAccessibleIds(RESOURCE_TYPE, allIds);
    return list.stream()
            .filter(v -> accessibleIds.contains(String.valueOf(v.getId())))
            .collect(Collectors.toList());
}
```

> `filterAccessibleIds` 内部对整批资源只查 1 次 SQL、用户身份只解析 1 次，过滤为纯内存操作；管理员直接返回全部。

---

## 后端接口（/web/resource-perm）

| 接口 | 说明 |
|------|------|
| `GET /list?resourceType=&resourceId=` | 查某资源的全部授权记录（正向回显） |
| `POST /save` | 全量覆盖某资源的授权（正向保存） |
| `DELETE /clear?resourceType=&resourceId=` | 清空某资源授权（恢复不限制） |
| `GET /check?resourceType=&resourceId=` | 检查当前用户是否有某资源权限 |
| `GET /list-by-subject?resourceType=&subjectType=&subjectId=` | 查某主体已授权的资源 id（反向回显） |
| `POST /save-by-subject` | 按主体全量设置授权资源（反向保存，diff 增删） |

前端 API 见 `@/framework/apis/resourcePerm.ts`。

---

## 接入新业务清单

1. **后端**：在对应查询 Service 中调用 `filterAccessibleIds("新表名", ids)` 做展示过滤
2. **前端**：在「知道全部资源」处加按钮，把全部资源映射为 `PermResourceNode[]` 传入 `openPerm("新表名", resources)`

组件、Hook、API 全部复用，零改动。
