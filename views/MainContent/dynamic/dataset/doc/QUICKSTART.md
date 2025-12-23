# Dataset配置管理 - 快速开始

## 5分钟快速上手

### 步骤1: 准备SQL语句

首先，准备一个完整的SELECT SQL语句。例如，我们要创建一个订单汇总视图：

```sql
SELECT 
  o.id,
  o.order_no AS orderNo,
  o.amount,
  o.created_at AS createTime,
  c.name AS customerName,
  c.phone AS customerPhone,
  COUNT(oi.id) AS itemCount,
  SUM(oi.quantity) AS totalQuantity
FROM t_order o
LEFT JOIN t_customer c ON o.customer_id = c.id
LEFT JOIN t_order_item oi ON o.id = oi.order_id
WHERE o.status = 1
GROUP BY o.id, o.order_no, o.amount, o.created_at, c.name, c.phone
```

### 步骤2: 创建Dataset

1. 打开Dataset配置页面，切换到"数据集管理"标签页
2. 点击工具栏的"新建"按钮
3. 填写表单：
   - **数据集名称**: `orderSummary`（只需输入前缀，系统会自动添加"Dataset"后缀）
   - **备注**: “订单汇总数据集”
   - **数据源**: `master`（默认值）
   - **SQL语句**: 粘贴上面准备的SQL

4. 【可选】点击"格式化SQL"按钮美化代码

5. 【可选】点击"预览解析结果"按钮查看解析效果：

**解析结果预览**:
- **表配置**:
  - 表1: `t_order` (别名: `o`) - 主表
  - 表2: `t_customer` (别名: `c`) - LEFT JOIN, 条件: `o.customer_id = c.id`
  - 表3: `t_order_item` (别名: `oi`) - LEFT JOIN, 条件: `o.id = oi.order_id`

- **列配置**:
  - `o.id` → `id`
  - `o.order_no` → `orderNo`
  - `o.amount` → `amount`
  - `o.created_at` → `createTime`
  - `c.name` → `customerName`
  - `c.phone` → `customerPhone`
  - `COUNT(oi.id)` → `itemCount` (聚合)
  - `SUM(oi.quantity)` → `totalQuantity` (聚合)

6. 确认无误后点击"保存"按钮
7. 系统会自动：
   - 创建`sys_dataset`记录（保存为`orderSummaryDataset`）
   - 解析SQL创建3条`sys_dataset_table`记录
   - 解析SQL创建8条`sys_dataset_column`记录
8. 保存成功后列表自动刷新

### 步骤3: 编辑或查看Dataset

创建Dataset后，可以随时编辑或查看其配置：

1. 在Dataset列表中点击数据集名称（如点击`orderSummaryDataset`）
2. 系统会打开Dataset SQL管理弹窗，包含三个标签页：

#### 标签页 1：编辑SQL
- 显示格式化后的SQL语句
- 提供以下功能按钮：
  - **格式化SQL**: 美化SQL代码的换行和缩进
  - **复制SQL**: 将SQL复制到剪贴板
  - **预览解析结果**: 查看SQL解析后的表和列配置
  - **查看SQL示例**: 查看常用SQL模板
- 可以修改SQL后点击"保存"更新配置

#### 标签页 2：结构说明
- 以可视化方式展示Dataset的结构
- **Dataset表配置**：显示所有表名、别名、JOIN类型和JOIN条件
- **列配置**：显示每个列的SQL表达式、别名、是否聚合、是否显示等

#### 标签页 3：压缩SQL
- 展示单行紧凑格式的SQL
- 适合复制到其他地方使用
- 点击"复制压缩SQL"复制到剪贴板

### 步骤4: 配置列信息（可选）

### 示例1: 简单查询

```sql
SELECT 
  id,
  order_no AS orderNo,
  amount,
  status
FROM t_order
WHERE status = 1
```

### 示例2: 多表JOIN

```sql
SELECT 
  o.id,
  o.order_no AS orderNo,
  o.amount,
  c.name AS customerName,
  c.phone AS customerPhone
FROM t_order o
LEFT JOIN t_customer c ON o.customer_id = c.id
WHERE o.status = 1
```

### 示例3: 聚合函数

```sql
SELECT 
  o.customer_id AS customerId,
  c.name AS customerName,
  COUNT(o.id) AS orderCount,
  SUM(o.amount) AS totalAmount,
  AVG(o.amount) AS avgAmount,
  MAX(o.created_at) AS lastOrderTime
FROM t_order o
LEFT JOIN t_customer c ON o.customer_id = c.id
WHERE o.status = 1
GROUP BY o.customer_id, c.name
```

### 示例4: 复杂聚合

```sql
SELECT 
  DATE_FORMAT(o.created_at, '%Y-%m') AS orderMonth,
  o.status,
  COUNT(o.id) AS orderCount,
  SUM(o.amount) AS totalAmount,
  AVG(o.amount) AS avgAmount,
  MIN(o.amount) AS minAmount,
  MAX(o.amount) AS maxAmount
FROM t_order o
GROUP BY DATE_FORMAT(o.created_at, '%Y-%m'), o.status
HAVING COUNT(o.id) > 10
```

## 常见问题

### Q1: SQL解析失败怎么办？

**A**: 检查以下几点：
1. SQL语句是否是标准的SELECT语句
2. 多表JOIN是否都使用了表别名（必须）
3. 是否有语法错误（建议先在数据库测试）
4. 聚合函数是否配合了GROUP BY
5. 点击"查看SQL示例"查看正确的SQL格式

### Q2: 如何修改已创建的Dataset？

**A**: 
1. 点击Dataset名称进入编辑弹窗
2. 在"编辑SQL"标签页修改SQL语句
3. 点击"保存"更新配置
4. 或者在"列配置"中单独修改某些列的属性

**注意**: 修改Dataset名称需要在编辑弹窗中修改，保存时会自动添加"Dataset"后缀。

### Q3: 聚合字段和非聚合字段有什么区别？

**A**: 
- **非聚合字段**: 查询条件会放入WHERE子句
- **聚合字段**: 查询条件会放入HAVING子句
- 使用聚合函数（SUM、COUNT等）的字段必须标记为"聚合字段"

### Q4: 如何隐藏某些列？

**A**: 
1. 进入"列配置"抽屉
2. 找到要隐藏的列
3. 点击"编辑"按钮
4. 将"是否显示"修改为"否"(0)
5. 保存后，该列将不会在查询界面显示

### Q5: 列的顺序可以调整吗？

**A**: 
可以！在"列配置"中每一列都有上移/下移箭头按钮，点击后系统会自动保存新的顺序。

## 最佳实践

### 1. SQL编写建议

- ✅ 使用有意义的表别名（如 `o` 代表 order）
- ✅ 为所有字段指定别名（使用 AS）
- ✅ 别名使用驼峰命名法（orderNo、customerName）
- ✅ 复杂查询先在数据库测试通过
- ❌ 避免使用 `SELECT *`
- ❌ 避免使用保留字作为别名

### 2. Dataset名称规范

- ✅ 系统会自动添加"Dataset"后缀
- ✅ 使用有意义的名称（如`orderSummary`、`customerList`）
- ✅ 使用驼峰命名法或下划线命名法
- ✅ 保持简短且描述准确
- ❌ 避免使用中文
- ❌ 避免使用特殊字符

### 3. 列配置建议

- ✅ 为列添加清晰的备注说明
- ✅ 合理设置列的显示顺序（使用上移/下移）
- ✅ 隐藏不需要展示的技术字段（将“是否显示”设为“否”）
- ✅ 正确标记聚合字段（使用COUNT、SUM等函数的列）
- ✅ 别名会自动去除单引号，无需手动处理

### 4. 查询优化

- ✅ 使用索引字段作为查询条件
- ✅ 避免在大数据量表上进行全表扫描
- ✅ 合理使用分页
- ✅ 复杂聚合查询考虑创建物化视图

## 下一步

- 查看 [README.md](README.md) 了解完整功能和技术细节
- 查看 [Dataset配置管理API文档.md](Dataset配置管理API文档.md) 了解API详情
- 尝试创建更复杂的多表JOIN和聚合查询
- 体验列配置的细粒度控制
