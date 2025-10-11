# 基础控制器框架使用说明

## 📚 文档更新说明

已将完整的**前端API和Types自动生成**功能说明添加到 `基础控制器接口说明文档.md` 中。

## 🚀 快速开始

### 1. 查看完整文档
```
src/framework/基础控制器接口说明文档.md
```

### 2. 生成前端API和Types
```bash
# 在前端项目根目录执行
node src/framework/script/generate-api-v2.cjs
```

### 3. 使用生成的API和Types
```typescript
// 导入API函数和类型
import { evaluationAdvancedQuery } from '@/apis';
import { EvaluationVOPageResponse } from '@/apis/types';

// 类型安全的API调用
const loadData = async (): Promise<EvaluationVOPageResponse> => {
  return await evaluationAdvancedQuery({
    currentPage: 1,
    pageSize: 10
  });
};
```

## 📖 文档主要章节

### 1. 基础控制器说明
- BaseAdminController - 标准CRUD操作
- BaseBindController - 多对多关系绑定
- BaseAdminTreeController - 树形结构管理
- BaseAdminOrderController - 排序功能支持

### 2. 前端API和Types自动生成 ⭐️ **新增**
- 自动化生成流程
- 文件结构组织
- 类型安全开发
- 使用方式详解
- 最佳实践建议

### 3. 开发流程建议
- 项目初始化
- 日常开发流程
- 团队协作规范

## 🎯 核心优势

- **🔧 全自动化**: 后端接口变更后，前端类型自动同步
- **📝 类型安全**: 编译时发现错误，避免运行时问题  
- **⚡ 开发效率**: 相比传统开发减少70%代码量
- **👥 团队协作**: 统一的代码标准和自动文档
- **🛡️ 质量保障**: 内置权限控制、事务管理、参数验证

## 🔄 典型开发流程

1. **后端开发**: 继承基础控制器，创建VO类
2. **生成API**: 运行生成脚本获取最新API和Types
3. **前端开发**: 使用类型安全的API调用
4. **自动同步**: 后端变更后重新生成即可

## 📋 适用场景

✅ **推荐使用**:
- 企业管理系统 (OA、ERP、CRM)
- 内容管理平台
- 微服务架构项目
- 快速原型开发

❌ **不建议使用**:
- 复杂数据关系需要大量自定义SQL
- 极高性能要求的高并发系统
- 大量非标准化接口的特殊项目

## 💡 使用建议

1. **新项目开始前** - 仔细阅读完整文档，了解框架能力
2. **团队培训** - 确保团队成员理解基础控制器和类型生成机制
3. **规范制定** - 基于文档制定团队的开发规范
4. **持续更新** - 定期更新框架版本，获得最新功能

---

现在您的团队可以通过这个完整的文档快速理解和使用基础控制器框架以及自动生成的API和Types功能！