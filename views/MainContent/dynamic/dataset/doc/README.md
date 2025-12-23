# Dataset配置管理 - 技术说明

## 功能概述

Dataset配置管理模块通过SQL自动生成数据查询配置，支持多表JOIN和聚合函数，实现动态数据查询。系统自动解析SQL语句，提取表结构和列信息，生成可视化的配置界面。

## 核心功能

1. **Dataset管理** - 通过SQL创建、编辑、删除Dataset配置
   - 智能SQL解析：自动识别表名、别名、JOIN条件和列信息
   - 名称后缀规范：Dataset名称自动添加"Dataset"后缀
   - 三标签页展示：编辑SQL、结构说明、压缩SQL
   
2. **列配置** - 管理列的显示、顺序、聚合属性
   - 列的添加、编辑、删除
   - 拖拽排序（上移/下移）
   - 别名显示优化（自动去除单引号）
   
3. **SQL查看与编辑** - 多种SQL展示形式
   - 格式化SQL：易读的多行格式
   - 压缩SQL：单行紧凑格式，便于复制
   - 结构说明：表配置和列配置的详细展示
   - SQL格式化功能：一键美化SQL代码
   
4. **数据查询** - 基于Dataset配置的动态查询
   - 支持条件查询和高级查询
   - 数据导出功能

## API对接说明

### 使用的API接口

#### Dataset配置管理（datasetConfigController）
- `parseSql(req)` - 解析SQL预览（不保存）
  - 参数：`{ sql: string, dataSource?: string }`
  - 返回：解析后的表配置和列配置
  
- `parseSqlAndSave(req)` - 解析SQL并保存配置
  - 参数：`{ datasetId?: number, datasetName: string, sql: string, dataSource?: string, remark?: string }`
  - 功能：创建或更新Dataset配置，自动保存到三张表
  
- `getConfig(req)` - 获取完整Dataset配置
  - 参数：`{ datasetId: number }`
  - 返回：包含tables和columns的完整配置
  
- `getColumns(req)` - 获取列配置列表
  - 参数：`{ datasetId: number }`
  - 返回：列配置数组

#### 列配置管理
- `datasetConfigAddColumn(data)` - 添加列
- `datasetConfigUpdateColumn(data)` - 更新列
- `deleteColumn(req)` - 删除列
  - 参数：`{ id: string }`
- `datasetConfigUpdateColumnsOrder(orders)` - 批量更新列顺序
  - 参数：`[{ id: string, showOrder: number }]`

#### 基础Portal接口（sysDatasetPortalController等）
- `sysDatasetGeneralSelect` - 查询Dataset列表
- `sysDatasetDeleteItem` - 删除Dataset（级联删除）
- `sysDatasetTableGeneralSelect` - 查询表配置列表
- `sysDatasetColumnGeneralSelect` - 查询列配置列表

### 数据流程

#### 创建Dataset
```
1. 用户填写Dataset名称前缀（自动添加"Dataset"后缀）
2. 输入SQL语句
3. 【可选】点击"预览解析结果"调用parseSql查看解析效果
4. 点击"保存"调用parseSqlAndSave
5. 后端自动：
   - 创建sys_dataset记录（保存datasetName、remark等）
   - 解析SQL生成sys_dataset_table记录（表名、别名、JOIN信息）
   - 解析SQL生成sys_dataset_column记录（列名、别名、是否聚合等）
6. 前端刷新列表
```

#### 编辑Dataset
```
1. 点击Dataset名称打开编辑弹窗
2. 调用getConfig获取完整配置
3. 将配置转换为格式化SQL展示在编辑器
4. 用户修改SQL后保存
5. 调用parseSqlAndSave更新（传入datasetId）
6. 后端自动更新三张表的配置
```

#### 列配置管理
```
1. 点击"列配置"按钮
2. 调用getColumns获取当前列列表
3. 用户进行添加/编辑/删除/排序操作
4. 调用对应的API接口
5. 刷新列表和主页面
```

#### 查询数据
```
1. 选择Dataset（单选）
2. 切换到"数据查询"标签页
3. 填写查询条件
4. 调用dynamicAdvancedQuery
5. 使用dataset.id作为tableId参数
6. 返回查询结果
```

## 数据结构映射

### 前端 → 后端
- `DatasetInfo` → `SysDataset`（主表）
  - `id` - 数据库自增ID
  - `datasetName` - Dataset名称（必须以"Dataset"结尾）
  - `remark` - 备注说明
  - `dataSource` - 数据源（默认master）
  
- `DatasetTableInfo` → `SysDatasetTable`（表配置）
  - `datasetId` - 关联Dataset的ID
  - `tableOrder` - 表顺序（0开始）
  - `tableSql` - 表名
  - `tableAlias` - 表别名
  - `joinType` - JOIN类型（0:INNER, 1:LEFT, 2:RIGHT, 3:FULL）
  - `joinCondition` - JOIN条件
  
- `DatasetColumnInfo` → `SysDatasetColumn`（列配置）
  - `datasetId` - 关联Dataset的ID
  - `columnSql` - SQL表达式
  - `columnAlias` - 字段别名
  - `isAggregate` - 是否聚合字段（"0":否, "1":是）
  - `displayOrder` - 显示顺序
  - `isVisible` - 是否显示（"0":否, "1":是）

### 关键字段说明
- **tableId**: 前端用于标识Dataset的字段，通常等于`datasetName`或`id`
- **datasetId**: 后端自增ID，用于关联三张表
- **isAggregate**: 影响查询条件的位置（WHERE vs HAVING）
- **isVisible**: 控制列是否在查询界面显示

## 使用方式

### 创建Dataset
1. 点击工具栏的"新建"按钮
2. 填写Dataset名称前缀（系统会自动添加"Dataset"后缀）
3. 填写备注说明
4. 选择数据源（默认master）
5. 在SQL编辑器中输入完整的SELECT语句
6. 【可选】点击"格式化SQL"美化代码
7. 【可选】点击"预览解析结果"查看解析效果
8. 点击"保存"完成创建

### 编辑Dataset
1. 在列表中点击Dataset名称
2. 系统自动加载完整配置并转换为SQL
3. 在"编辑SQL"标签页修改SQL语句
4. 点击"保存"更新配置
5. 或切换到"结构说明"查看表和列的详细配置
6. 或切换到"压缩SQL"复制单行SQL

### 管理列配置
1. 在列表中点击"列配置"按钮
2. 查看当前所有列的配置
3. 点击"添加列"手动添加新列
4. 点击"编辑"修改列的属性
5. 使用"上移"/"下移"调整列的显示顺序
6. 点击"删除"移除不需要的列
7. 关闭抽屉后自动刷新主列表

### 查询数据
1. 在列表中选中目标Dataset（单选框）
2. 切换到"数据查询"标签页
3. 根据列配置填写查询条件
4. 点击"查询"按钮获取结果
5. 支持数据导出

## 注意事项

### Dataset命名规范
1. **名称格式**: 用户输入的名称会自动添加"Dataset"后缀
   - 输入：`orderSummary` → 保存为：`orderSummaryDataset`
   - 通过前端validator强制校验后缀
   
2. **校验规则**: Dataset名称必须以"Dataset"结尾
   - 编辑时会自动移除后缀供用户修改，保存时再添加回来

### SQL编写要求
1. **表别名**: 多表查询必须为每个表指定别名
   - ✅ 正确：`FROM t_order o`
   - ❌ 错误：`FROM t_order`
   
2. **列别名**: 建议为所有列指定别名（使用AS）
   - ✅ 推荐：`SELECT o.id AS orderId`
   - ⚠️ 可用：`SELECT o.id`（别名会等于字段名）
   
3. **聚合函数**: 使用聚合函数时必须配合GROUP BY
   - 系统会自动识别聚合字段（COUNT、SUM、AVG等）
   - 聚合字段的查询条件会放入HAVING子句
   
4. **JOIN语法**: 支持INNER、LEFT、RIGHT、FULL JOIN
   - 系统会自动解析JOIN类型和条件
   - JOIN条件会以代码块形式展示

### 字段配置注意
1. **别名显示**: 系统会自动去除别名两侧的单引号
2. **顺序调整**: 使用上下箭头按钮，失败时会自动重新加载
3. **删除影响**: 删除列配置后需要刷新主页面

### 性能优化
1. **列表加载**: 并发加载Dataset、Tables、Columns三张表数据
2. **搜索功能**: 支持Dataset名称和备注的模糊搜索
3. **级联删除**: 删除Dataset会自动删除关联的Tables和Columns

## 文件结构

```
src/views/dataset/
├── components/
│   ├── DatasetManage.vue        # Dataset管理主组件
│   ├── DatasetSqlModal.vue      # SQL编辑弹窗（三标签页）
│   ├── ColumnConfig.vue         # 列配置组件
│   ├── ColumnEditModal.vue      # 列编辑弹窗
│   ├── DatasetDetail.vue        # Dataset详情展示
│   └── DataQuery.vue            # 数据查询组件
├── doc/
│   ├── README.md                # 技术说明（本文档）
│   ├── QUICKSTART.md            # 快速开始
│   ├── API对接说明.md
│   ├── Dataset配置管理API文档.md
│   ├── 列配置重构方案.md
│   ├── 实现说明.md
│   └── 项目交付清单.md
├── index.vue                    # 主入口页面（标签页布局）
├── types.ts                     # TypeScript类型定义
```

## 技术栈

### 前端
- **框架**: Vue 3 + TypeScript
- **UI组件**: Ant Design Vue
  - Table（列表展示）
  - Modal（弹窗）
  - Drawer（抽屉）
  - Form（表单）
  - Tabs（标签页）
- **代码编辑器**: bin-editor-next (Ace Editor)
  - SQL语法高亮
  - 代码格式化
  - 主题: chrome

### 后端API
- **Dataset配置接口**: datasetConfigController
  - 智能SQL解析
  - 配置的增删改查
- **基础Portal接口**: 
  - sysDatasetPortalController
  - sysDatasetTablePortalController
  - sysDatasetColumnPortalController
- **查询接口**: dynamicPortalController
  - 动态数据查询
  - 条件过滤和排序

### 核心特性
- **响应式设计**: Composition API
- **类型安全**: 完整的TypeScript类型定义
- **智能解析**: 自动识别表结构和列信息
- **实时预览**: SQL解析结果即时展示
- **格式化工具**: 一键美化SQL代码
