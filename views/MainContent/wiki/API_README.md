# Wiki看板后端API接口文档

## 概述
本文档详细说明了Wiki看板功能所需的后端API接口。所有接口的基础路径为 `/wiki`。

---

## 接口列表

### 1. 获取Wiki页面树形结构
**接口路径**: `GET /wiki/tree`

**描述**: 获取所有Wiki页面的树形结构，支持按关键词搜索

**请求参数**:
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| keyword | string | 否 | 搜索关键词 |

**请求示例**:
```http
GET /wiki/tree?keyword=测试
```

**响应数据结构**:
```typescript
interface WikiTreeNode {
  key: string               // 节点唯一标识(页面ID)
  title: string            // 节点标题
  parentId: string | null  // 父节点ID，顶级节点为null
  sortOrder: number        // 排序号
  children?: WikiTreeNode[] // 子节点列表
  isLeaf?: boolean         // 是否为叶子节点
}

// 返回值
WikiTreeNode[]
```

**响应示例**:
```json
[
  {
    "key": "1",
    "title": "产品文档",
    "parentId": null,
    "sortOrder": 1,
    "isLeaf": false,
    "children": [
      {
        "key": "2",
        "title": "快速开始",
        "parentId": "1",
        "sortOrder": 1,
        "isLeaf": true
      }
    ]
  }
]
```

---

### 2. 获取Wiki页面详情
**接口路径**: `GET /wiki/page/{id}`

**描述**: 根据页面ID获取页面的详细信息

**路径参数**:
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | string | 是 | 页面ID |

**请求示例**:
```http
GET /wiki/page/1
```

**响应数据结构**:
```typescript
interface WikiPage {
  id: string               // 页面ID
  title: string           // 页面标题
  content: string         // 页面内容(HTML格式)
  parentId: string | null // 父级页面ID
  sortOrder: number       // 排序号
  createTime: string      // 创建时间
  updateTime: string      // 更新时间
  createBy: string        // 创建人
  updateBy: string        // 更新人
}
```

**响应示例**:
```json
{
  "id": "1",
  "title": "产品文档",
  "content": "<p>这是页面内容</p>",
  "parentId": null,
  "sortOrder": 1,
  "createTime": "2024-01-01 10:00:00",
  "updateTime": "2024-01-02 15:30:00",
  "createBy": "admin",
  "updateBy": "admin"
}
```

---

### 3. 新增Wiki页面
**接口路径**: `POST /wiki/page`

**描述**: 创建一个新的Wiki页面

**请求体**:
```typescript
interface WikiFormData {
  title: string           // 页面标题，必填
  content: string         // 页面内容(HTML格式)，必填
  parentId: string | null // 父级页面ID，可为null表示顶级页面
}
```

**请求示例**:
```json
{
  "title": "新页面",
  "content": "<p>这是新页面的内容</p>",
  "parentId": "1"
}
```

**响应数据**: 返回创建成功的 `WikiPage` 对象

---

### 4. 更新Wiki页面
**接口路径**: `PUT /wiki/page/{id}`

**描述**: 更新指定ID的Wiki页面

**路径参数**:
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | string | 是 | 页面ID |

**请求体**: 与新增接口相同的 `WikiFormData` 结构

**请求示例**:
```http
PUT /wiki/page/1
```
```json
{
  "title": "更新后的标题",
  "content": "<p>更新后的内容</p>",
  "parentId": null
}
```

**响应数据**: 返回更新后的 `WikiPage` 对象

---

### 5. 删除Wiki页面
**接口路径**: `DELETE /wiki/page/{id}`

**描述**: 删除指定ID的Wiki页面及其所有子页面

**路径参数**:
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | string | 是 | 页面ID |

**请求示例**:
```http
DELETE /wiki/page/1
```

**响应数据**: 
```typescript
boolean // true表示删除成功，false表示删除失败
```

**注意事项**:
- 删除页面时需要同时删除该页面的所有子页面（级联删除）
- 建议在后端实现逻辑删除，而非物理删除

---

### 6. 更新页面排序/移动页面
**接口路径**: `PUT /wiki/page/sort`

**描述**: 更新页面的父级ID和排序号，用于实现拖拽排序功能

**请求体**:
```typescript
interface WikiSortParams {
  id: string              // 要移动的页面ID
  parentId: string | null // 新的父级页面ID
  sortOrder: number       // 新的排序号
}
```

**请求示例**:
```json
{
  "id": "2",
  "parentId": "1",
  "sortOrder": 3
}
```

**响应数据**: 
```typescript
boolean // true表示更新成功，false表示更新失败
```

**业务逻辑说明**:
- 当页面被拖拽到另一个节点下时，`parentId` 会改变
- 当页面被拖拽到同级的不同位置时，`sortOrder` 会改变
- 需要重新计算受影响节点的 `sortOrder`，保证同一层级的 sortOrder 连续

---

### 7. 搜索Wiki页面
**接口路径**: `GET /wiki/search`

**描述**: 根据关键词搜索Wiki页面

**请求参数**:
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| keyword | string | 是 | 搜索关键词 |

**请求示例**:
```http
GET /wiki/search?keyword=文档
```

**响应数据**: 返回 `WikiPage[]` 数组

**搜索范围**:
- 页面标题
- 页面内容（建议移除HTML标签后再搜索）

**排序建议**:
- 按更新时间倒序
- 或按匹配度排序

---

## 数据库表设计建议

### wiki_page 表结构

```sql
CREATE TABLE wiki_page (
  id VARCHAR(36) PRIMARY KEY COMMENT '页面ID',
  title VARCHAR(100) NOT NULL COMMENT '页面标题',
  content TEXT COMMENT '页面内容(HTML)',
  parent_id VARCHAR(36) COMMENT '父级页面ID',
  sort_order INT DEFAULT 0 COMMENT '排序号',
  create_time DATETIME COMMENT '创建时间',
  update_time DATETIME COMMENT '更新时间',
  create_by VARCHAR(50) COMMENT '创建人',
  update_by VARCHAR(50) COMMENT '更新人',
  is_deleted TINYINT DEFAULT 0 COMMENT '是否删除(0-否,1-是)',
  
  INDEX idx_parent_id (parent_id),
  INDEX idx_create_time (create_time),
  INDEX idx_update_time (update_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Wiki页面表';
```

### 索引说明
- `idx_parent_id`: 用于快速查找子页面
- `idx_create_time`: 用于按创建时间排序
- `idx_update_time`: 用于按更新时间排序

---

## 常见问题

### Q0: Wiki中的图片如何上传？
**A**: 图片上传已集成到TinyMCE编辑器中，有三种方式插入图片：

1. **直接粘贴**：复制图片后直接在编辑器中 `Ctrl+V` 粘贴
2. **拖拽上传**：直接将图片文件拖拽到编辑器中
3. **工具栏插入**：点击工具栏的「插入图片」按钮，选择文件上传

图片会自动上传到OSS，并存储在 `wiki/images` 目录下。

**限制说明**：
- 图片大小限制：5MB
- 支持格式：jpg, jpeg, png, gif, webp等常见图片格式
- 上传后会返回图片的URL地址并自动插入到编辑器中

**注意事项**：
- 图片上传使用项目统一的OSS上传接口 `/oss`
- 请确保后端已配置OSS存储服务
- 如果上传失败，请检查OSS配置和网络连接

---

### Q1: 如何实现树形结构的返回？
**A**: 有两种方式：
1. **递归查询**: 从顶级节点开始递归查询子节点
2. **一次性查询**: 查询所有数据后在内存中组装树形结构（推荐）

示例代码（Java）：
```java
// 1. 查询所有页面
List<WikiPage> allPages = wikiPageMapper.selectAll();

// 2. 按 parentId 分组
Map<String, List<WikiPage>> groupByParent = allPages.stream()
    .collect(Collectors.groupingBy(
        page -> page.getParentId() == null ? "root" : page.getParentId()
    ));

// 3. 递归构建树
List<WikiTreeNode> buildTree(String parentId) {
    return groupByParent.getOrDefault(parentId, Collections.emptyList())
        .stream()
        .map(page -> {
            WikiTreeNode node = new WikiTreeNode();
            node.setKey(page.getId());
            node.setTitle(page.getTitle());
            node.setParentId(page.getParentId());
            node.setSortOrder(page.getSortOrder());
            node.setChildren(buildTree(page.getId()));
            return node;
        })
        .sorted(Comparator.comparing(WikiTreeNode::getSortOrder))
        .collect(Collectors.toList());
}

// 4. 返回顶级节点
return buildTree("root");
```

### Q2: 拖拽排序的 sortOrder 如何计算？
**A**: 建议方案：
1. 同一层级的 sortOrder 从 1 开始递增
2. 当节点移动时，重新计算该层级所有节点的 sortOrder
3. 在数据库中按 `parent_id` 和 `sort_order` 排序

### Q3: 如何实现全文搜索？
**A**: 建议方案：
1. **基础方案**: 使用 MySQL 的 `LIKE` 进行模糊查询
2. **进阶方案**: 使用 MySQL 全文索引（FULLTEXT）
3. **高级方案**: 集成 Elasticsearch 进行全文检索

### Q4: 删除页面时如何处理子页面？
**A**: 实现级联删除：
```java
public void deletePage(String id) {
    // 1. 查找所有子页面（递归）
    List<String> allChildIds = findAllChildIds(id);
    
    // 2. 删除所有子页面和当前页面
    allChildIds.add(id);
    wikiPageMapper.batchDelete(allChildIds);
}

private List<String> findAllChildIds(String parentId) {
    List<WikiPage> children = wikiPageMapper.selectByParentId(parentId);
    List<String> allIds = new ArrayList<>();
    
    for (WikiPage child : children) {
        allIds.add(child.getId());
        allIds.addAll(findAllChildIds(child.getId()));
    }
    
    return allIds;
}
```

---

## 测试数据

可以使用以下 SQL 初始化测试数据：

```sql
INSERT INTO wiki_page (id, title, content, parent_id, sort_order, create_time, update_time, create_by, update_by) VALUES
('1', '产品文档', '<h1>产品文档</h1><p>这是产品文档的根目录</p>', NULL, 1, NOW(), NOW(), 'admin', 'admin'),
('2', '快速开始', '<h2>快速开始</h2><p>这是快速开始指南</p>', '1', 1, NOW(), NOW(), 'admin', 'admin'),
('3', 'API文档', '<h2>API文档</h2><p>这是API接口文档</p>', '1', 2, NOW(), NOW(), 'admin', 'admin'),
('4', '技术规范', '<h1>技术规范</h1><p>这是技术规范文档</p>', NULL, 2, NOW(), NOW(), 'admin', 'admin'),
('5', '代码规范', '<h2>代码规范</h2><p>这是代码编写规范</p>', '4', 1, NOW(), NOW(), 'admin', 'admin');
```

---

## 联系方式
如有问题，请联系前端开发团队。
