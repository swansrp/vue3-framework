# ERP Frontend Framework

> 企业级 Vue 3 前端框架 — 提供通用基础设施，业务模块可直接集成使用。
> Enterprise-grade Vue 3 frontend framework — providing universal infrastructure for business modules.

---

## Project Overview | 项目概述

This framework is the core frontend infrastructure of the ERP system, built with **Vue 3 + TypeScript + Vite + Ant Design Vue**. It encapsulates common capabilities such as network requests, routing & navigation, state management, dynamic tables, drag-and-drop forms, advanced search, chart configuration, and SSO login, allowing business modules to focus on domain logic without reinventing foundational layers.

本框架是 ERP 系统的前端核心基础设施，基于 **Vue 3 + TypeScript + Vite + Ant Design Vue** 构建。它封装了网络请求、路由导航、状态管理、动态表格、拖拽表单、高级搜索、图表配置、SSO 登录等通用能力，让业务模块专注于领域逻辑，无需重复建设底层设施。

---

## Architecture | 整体架构

```
src/framework/
├── apis/                  # API 统一入口与请求构建器
│   ├── admin/             # 后台管理 API
│   ├── common/            # 通用 API
│   ├── dict/              # 字典 API
│   ├── login/             # 登录认证 API
│   ├── nav/               # 导航 API
│   ├── portal/            # Portal 表格 API
│   ├── upload/            # 文件上传 API
│   └── index.ts           # 统一请求函数 (CRUD / Query / Statistic / Tree / Bind)
├── assets/                # 全局样式与静态资源
│   ├── css/
│   │   ├── base.css           # 基础样式
│   │   ├── design-tokens.css  # 设计令牌（CSS 变量）
│   │   └── normalize.css      # 浏览器样式归一化
│   └── imgs/
├── components/            # 通用组件
│   ├── common/
│   │   ├── AdvancedSearch/    # 高级查询条件组件
│   │   ├── Content/           # 内容区布局（Portal / List / Tree / Dict）
│   │   ├── DragGrid/          # 拖拽网格表单与布局
│   │   ├── Dropdown/          # 自定义下拉选择器
│   │   ├── DynamicForm/       # 动态表单引擎
│   │   ├── GeneralDashboard/  # 通用仪表盘框架
│   │   ├── GroupManage/       # 集团管理
│   │   ├── Loading/           # 全屏加载动画
│   │   ├── Panel/             # 面板组件（Tree / List panels）
│   │   ├── Portal/            # Portal 动态表格（核心数据展示组件）
│   │   ├── chartConfig/       # 图表配置与仪表盘
│   │   ├── dict/              # 字典组件
│   │   └── ...
│   └── navigationFramework/   # 导航框架（顶栏 / 侧栏 / 标签页 / 面包屑）
├── config/                # Vite 构建配置
├── hooks/                 # 组合式函数
│   ├── DynamicGetWindowHeight.ts
│   ├── antTreeDropSort.ts
│   ├── initKeysAndRouteInNav.ts
│   └── ...
├── mitt/                  # 全局事件总线（基于 mitt）
├── network/               # 网络请求层
│   ├── request.ts         # Axios 封装 (get/post/download/upload)
│   ├── login.ts           # SSO 登录流程
│   └── utils.ts           # URL 工具函数
├── plugin/                # Vue 插件
├── router/                # 路由管理（Vue Router + 动态路由）
├── store/                 # 状态管理（Pinia）
│   ├── nav.ts             # 导航栏与标签页状态
│   ├── navigation.ts      # 导航状态（扩展版）
│   ├── route.ts           # 路由状态 & 动态路由加载
│   ├── user.ts            # 用户信息
│   ├── theme.ts           # 主题管理（深色/浅色）
│   ├── common.ts          # 通用状态
│   └── ...
├── utils/                 # 通用工具函数
│   ├── common.ts          # localStorage / 树遍历 / 表单 / 时间工具
│   ├── constant.ts        # 全局常量
│   ├── type.ts            # 全局类型定义
│   ├── formatter.ts       # 格式化工具
│   ├── excel.ts           # Excel 导入导出
│   └── ...
├── views/                 # 顶层视图
│   ├── Login/             # 登录页
│   ├── MainContent/       # 主内容区（布局容器）
│   └── NotFound/          # 404 页面
├── db/                    # IndexedDB 封装
└── mock/                  # Mock 配置
```

### Layer Diagram | 分层示意图

```
┌──────────────────────────────────────────────────┐
│                Business Modules                    │
│  (OM Dashboard / Customer / Project / HR / ...)   │
└────────────────────┬─────────────────────────────┘
                     │ imports from @/framework/...
┌────────────────────▼─────────────────────────────┐
│              Framework Layer (本模块)               │
│  ┌─────────┬────────┬──────────┬──────────────┐  │
│  │ Network │ Router │  Store   │  Components  │  │
│  │  Layer  │ Layer  │ (Pinia)  │  (UI Kit)    │  │
│  ├─────────┴────────┤          │              │  │
│  │  API Builder     │          │              │  │
│  │  (CRUD/Statistic)│          │              │  │
│  └──────────────────┴──────────┴──────────────┘  │
└────────────────────┬─────────────────────────────┘
                     │
┌────────────────────▼─────────────────────────────┐
│         Infrastructure (Vite / Vue 3 / AntD)      │
└──────────────────────────────────────────────────┘
```

---

## Features | 核心功能

### 1. Unified Network Layer | 统一网络层
- **Axios 封装**: 统一的 `get` / `post` / `download` / `upload` 请求方法
- **请求/响应拦截器**: 自动附加 Authorization token，统一错误处理、会话超时自动跳转登录
- **智能 Loading**: 延迟显示 + 最短持续时间，避免快闪
- **大整数安全解析**: 自动将 JSON 中超过 15 位的 ID 字段转为字符串，避免精度丢失
- **统一响应结构**: `{ status: { code, msg }, payload }` 规范

### 2. Unified API Builder | 统一 API 构建器
- **CRUD 操作**: `addRequest` / `deleteRequest` / `updateRequest` / `getByIdRequest`
- **查询模式**: `generalQuery` / `generalSelect` / `advancedQuery` / `advancedSelect`
- **统计模式**: `generalStatistic` / `advancedStatistic` / `generalSummary` / `generalCount`
- **树操作**: `getTreeData` / `getTreeParent` / `getTreeChildren` / `updateTreePid`
- **绑定/解绑**: `bindRequest` / `unbindRequest` / `bindBatch` / `bindReplaceAll`
- **导入导出**: `exportData` / `exportTemplate` / `importAdd` / `importAddProgress`

### 3. Advanced Dynamic Table (Portal) | 高级动态表格 (Portal)
- 列动态配置（显示/隐藏、排序、宽度调整）
- 行内编辑、批量操作
- 高级查询条件（AND/OR 组合）
- 列过滤、排序、分页
- 树形数据、分组展示
- 导出、绑定/解绑操作

### 4. Navigation & Routing | 导航与路由
- **动态路由**: 根据用户权限自动加载路由
- **三种根路径模式**: `auto`（自动进入第一个路由）、`showMenuOnly`（仅显示菜单）、`disabled`（禁用）
- **导航框架**: 顶栏 + 左侧菜单 + 历史标签页 + 面包屑
- **MainContent 可替换**: 业务层可通过 `setMainContentComponent` 注入自定义布局

### 5. State Management | 状态管理 (Pinia)
- **userStore**: 用户信息与认证
- **routeStore**: 路由状态与动态路由加载
- **navigationStore**: 导航状态（顶栏/侧栏/标签页/菜单选中）
- **themeStore**: 明暗主题切换
- **commonStore**: 登录状态等通用状态

### 6. Rich Component Library | 丰富的组件库
| 组件 | 说明 |
|------|------|
| **Portal** | 高级动态表格（核心数据展示组件） |
| **DynamicForm** | 动态表单引擎，支持自定义字段与布局 |
| **DragGrid** | 拖拽网格表单、布局与面板 |
| **AdvancedSearch** | 高级查询条件构造器（AND/OR 组合） |
| **GeneralDashboard** | 通用仪表盘框架（指标树 + 图表展示） |
| **chartConfig** | ECharts 图表配置与仪表盘网格 |
| **Dropdown** | 自定义下拉选择器 |
| **GroupManage** | 集团管理组件 |
| **Content** | 内容区布局（Portal / List / Tree / Dict） |
| **Loading** | 全屏加载动画 |
| **Watermark** | 水印组件 |
| **UploadFile** | 文件上传 |

### 7. SSO Login | 单点登录
- 支持 SSO 与本地开发两种模式
- Token 自动获取、验证、续期
- 会话超时自动跳转登录

### 8. Theme System | 主题系统
- 基于 Ant Design Vue 的暗色/亮色主题自动切换
- CSS 设计令牌（design-tokens.css）实现样式统一

---

## Tech Stack | 技术栈

| Category | Technology |
|----------|-----------|
| **Framework** | Vue 3 (Composition API + `<script setup>`) |
| **Language** | TypeScript |
| **Build Tool** | Vite 4.x |
| **UI Library** | Ant Design Vue 4.x |
| **State Management** | Pinia |
| **Router** | Vue Router 4.x (Hash History) |
| **HTTP Client** | Axios |
| **Charts** | ECharts |
| **Table** | Surely Vue Table (Portal) |
| **Drag & Drop** | grid-layout-plus / interactjs |
| **Event Bus** | mitt |
| **Date** | dayjs |
| **CSS** | design-tokens.css (CSS Variables) |
| **Lint** | ESLint |
| **Auto Import** | unplugin-auto-import / unplugin-vue-components |

---

## Quick Start | 快速开始

### Prerequisites | 前置条件
- Node.js >= 16
- npm >= 7

### Installation | 安装

```bash
# Navigate to the project root (erp-view)
cd erp-view

# Install dependencies
npm install
```

### Development | 本地开发

```bash
# Start dev server (default: http://localhost:8082)
npm run dev
```

The dev server proxies API requests from `/{project-name}/web/**` to `http://127.0.0.1:8080` (configurable in `vite.config.ts`).

### Build | 构建

```bash
# Build for production
npm run build
```

### Framework Usage | 框架使用

Business modules import framework capabilities via `@/framework/...`:

```typescript
// Example: Using the API layer in a business module
import { advancedQueryRequest } from '@/framework/apis'
import { get } from '@/framework/network/request'

// Using the Portal table component
// <portal-content ... />
```

---

## Project Initialization | 项目初始化

You can quickly scaffold a new project using the built-in `init-project.sh` script, which copies templates from `src/framework/setup/` and configures the project.

你可以使用内置的 `init-project.sh` 脚本快速搭建新项目，该脚本会从 `src/framework/setup/` 复制模板并完成项目配置。

### 1. How It Works | 工作原理

The script performs the following:

| Step | Action |
|------|--------|
| 1 | Copies template files from `src/framework/setup/` to project root |
| 2 | Creates `package.json` from `src/framework/config/package.json.backup`, replacing placeholders with your project info |
| 3 | Updates `deploy.sh` with your project code for deployment configuration |
| 4 | (Optional) Installs dependencies via `npm install` |
| 5 | (Optional) Starts the dev server via `npm run dev` |

### 2. Prerequisites | 前置条件

- Node.js >= 16
- npm >= 7
- Bash environment (Git Bash on Windows, or any Linux/macOS terminal)
- The `src/framework/setup/` and `src/framework/config/package.json.backup` must exist

### 3. Usage Guide | 使用指南

```bash
# From the project root (erp-view), run:
bash src/framework/script/init-project.sh
```

You will then be prompted:

**Step 1 — Enter project code**: An English identifier used as `name` in `package.json` (e.g., `erp-view`, `my-project`).

```
请输入项目编码 (英文，用于 package.json 的 name): erp-view
```

**Step 2 — Enter project name**: A Chinese name used as `title` in `package.json` (e.g., `ERP系统`, `我的项目`).

```
请输入项目名称 (中文，用于 package.json 的 title): ERP系统
```

**Step 3 — Confirm**: Review and confirm before files are overwritten.

```
确认要初始化项目吗？这将覆盖现有文件 (y/n): y
```

**Step 4 (Optional) — Install dependencies**:

```
是否立即安装依赖？(y/n): y
```

**Step 5 (Optional) — Start dev server**:

```
是否启动开发服务器？(y/n): y
```

### 4. Files Being Copied | 被复制的文件

The script copies the following from `src/framework/setup/` to the project root:

| File / Directory | Purpose |
|------------------|---------|
| `.env.development` | Development environment variables |
| `.env.pre` | Pre-release environment variables |
| `.env.production` | Production environment variables |
| `.env.test` | Test environment variables |
| `.eslintrc.cjs` | ESLint configuration |
| `.gitignore` | Git ignore rules |
| `deploy.sh` | Deployment script |
| `index.html` | Vite entry HTML |
| `tsconfig.json` | TypeScript configuration |
| `public/` | Static public assets (icon, etc.) |
| `agent.md` | AI agent guidance file |
| `src/App.vue` | Root Vue component |
| `src/main.ts` | Application entry point |
| `src/assets/` | Initial asset directory |

### 5. Customization | 自定义模板

If you need to customize the templates:

- **Modify project files**: Edit files under `src/framework/setup/` directly.
- **Modify `package.json` template**: Edit `src/framework/config/package.json.backup`.
  - Use `server_name` as placeholder for the project code (`name` field).
  - Use `server_title` as placeholder for the project name (`title` field).
- **Add files to copy**: Edit the `FILES_TO_COPY` array in the script:

```bash
# src/framework/script/init-project.sh
FILES_TO_COPY=(
  ".env.development"
  # Add your custom files here
  "src/my-custom-file.ts"
)
```

---

## Directory Convention | 目录约定

```
src/
├── framework/        ← 本框架（通用基础设施，不包含业务逻辑）
├── views/            ← 业务视图模块（各自独立目录）
│   └── dashboard/om/customer/
│       ├── apis/     ← 业务 API 文件
│       ├── components/
│       ├── index.vue
│       └── ...
├── apis/             ← 业务层 API 文件（可选的）
├── components/       ← 业务层公共组件
└── ...
```

**核心原则**: `src/framework/` 只包含纯框架基础设施，不包含任何业务领域逻辑。业务模块位于 `src/views/` 下各自独立的目录中。

**Core Principle**: `src/framework/` contains only pure framework infrastructure, free of any business domain logic. Business modules reside in their own directories under `src/views/`.

---

## Roadmap | 后续规划

- [ ] **组件按需加载优化**: 进一步细化 Portal / DynamicForm 等大型组件的按需加载策略
- [ ] **微前端支持**: 探索模块联邦（Module Federation）以支持多团队独立开发部署
- [ ] **单元测试覆盖**: 为核心模块（network / api builder / utils）添加 Vitest 单元测试
- [ ] **国际化支持**: 提供完整的 i18n 方案，支持多语言切换
- [ ] **性能监控**: 集成前端性能监控（LCP / FID / CLS）与错误追踪
- [ ] **主题编辑器**: 基于 design-tokens.css 的可视化主题编辑器
- [ ] **CLI 脚手架**: 提供 `create-business-module` 脚手架，快速生成业务模块模板
- [ ] **TypeScript 严格模式**: 逐步推进 strict mode，增强类型安全
