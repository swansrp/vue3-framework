# ERP Frontend Framework

> Enterprise-grade Vue 3 frontend framework — providing universal infrastructure for business modules.

---

## Project Overview

This framework is the core frontend infrastructure of the ERP system, built with **Vue 3 + TypeScript + Vite + Ant Design Vue**. It encapsulates common capabilities such as network requests, routing & navigation, state management, dynamic tables, drag-and-drop forms, advanced search, chart configuration, and SSO login, allowing business modules to focus on domain logic without reinventing foundational layers.

---

## Architecture

```
src/framework/
├── apis/                  # API entry and request builders
│   ├── admin/             # Admin management API
│   ├── common/            # Common API
│   ├── dict/              # Dictionary API
│   ├── login/             # Authentication API
│   ├── nav/               # Navigation API
│   ├── portal/            # Portal table API
│   ├── upload/            # File upload API
│   └── index.ts           # Unified request functions (CRUD / Query / Statistic / Tree / Bind)
├── assets/                # Global styles and static assets
│   ├── css/
│   │   ├── base.css           # Base styles
│   │   ├── design-tokens.css  # Design tokens (CSS variables)
│   │   └── normalize.css      # Browser style normalization
│   └── imgs/
├── components/            # Shared components
│   ├── common/
│   │   ├── AdvancedSearch/    # Advanced query condition builder
│   │   ├── Content/           # Content layouts (Portal / List / Tree / Dict)
│   │   ├── DragGrid/          # Drag-and-drop grid forms and layouts
│   │   ├── Dropdown/          # Custom dropdown selector
│   │   ├── DynamicForm/       # Dynamic form engine
│   │   ├── GeneralDashboard/  # General dashboard framework
│   │   ├── GroupManage/       # Group management
│   │   ├── Loading/           # Full-screen loading animation
│   │   ├── Panel/             # Panel components (Tree / List panels)
│   │   ├── Portal/            # Portal dynamic table (core data display)
│   │   ├── chartConfig/       # Chart configuration and dashboard
│   │   ├── dict/              # Dictionary components
│   │   └── ...
│   └── navigationFramework/   # Navigation framework (header / sidebar / tabs / breadcrumb)
├── config/                # Vite build configuration
├── hooks/                 # Composables
│   ├── DynamicGetWindowHeight.ts
│   ├── antTreeDropSort.ts
│   ├── initKeysAndRouteInNav.ts
│   └── ...
├── mitt/                  # Global event bus (mitt-based)
├── network/               # Network layer
│   ├── request.ts         # Axios wrapper (get/post/download/upload)
│   ├── login.ts           # SSO login flow
│   └── utils.ts           # URL utility functions
├── plugin/                # Vue plugins
├── router/                # Router (Vue Router + dynamic routes)
├── store/                 # State management (Pinia)
│   ├── nav.ts             # Navigation and tab state
│   ├── navigation.ts      # Navigation state (extended)
│   ├── route.ts           # Route state & dynamic route loading
│   ├── user.ts            # User information
│   ├── theme.ts           # Theme management (dark / light)
│   ├── common.ts          # Common state
│   └── ...
├── utils/                 # Utility functions
│   ├── common.ts          # localStorage / tree traversal / forms / time utilities
│   ├── constant.ts        # Global constants
│   ├── type.ts            # Global type definitions
│   ├── formatter.ts       # Formatting utilities
│   ├── excel.ts           # Excel import/export
│   └── ...
├── views/                 # Top-level views
│   ├── Login/             # Login page
│   ├── MainContent/       # Main content area (layout container)
│   └── NotFound/          # 404 page
├── db/                    # IndexedDB wrapper
└── mock/                  # Mock configuration
```

### Layer Diagram

```
┌──────────────────────────────────────────────────┐
│                Business Modules                    │
│  (OM Dashboard / Customer / Project / HR / ...)   │
└────────────────────┬─────────────────────────────┘
                     │ imports from @/framework/...
┌────────────────────▼─────────────────────────────┐
│              Framework Layer (this module)          │
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

## Features

### 1. Unified Network Layer
- **Axios wrapper**: Unified `get` / `post` / `download` / `upload` methods
- **Request/response interceptors**: Automatic Authorization token injection, unified error handling, auto-redirect on session timeout
- **Smart loading**: Delayed display + minimum duration to avoid flickering
- **Big integer safe parsing**: Automatically converts ID fields exceeding 15 digits to strings in JSON responses
- **Unified response structure**: `{ status: { code, msg }, payload }` convention

### 2. Unified API Builder
- **CRUD operations**: `addRequest` / `deleteRequest` / `updateRequest` / `getByIdRequest`
- **Query modes**: `generalQuery` / `generalSelect` / `advancedQuery` / `advancedSelect`
- **Statistics modes**: `generalStatistic` / `advancedStatistic` / `generalSummary` / `generalCount`
- **Tree operations**: `getTreeData` / `getTreeParent` / `getTreeChildren` / `updateTreePid`
- **Bind/Unbind**: `bindRequest` / `unbindRequest` / `bindBatch` / `bindReplaceAll`
- **Import/Export**: `exportData` / `exportTemplate` / `importAdd` / `importAddProgress`

### 3. Advanced Dynamic Table (Portal)
- Dynamic column configuration (show/hide, sorting, resizing)
- Inline editing, batch operations
- Advanced query conditions (AND/OR combinations)
- Column filtering, sorting, pagination
- Tree data support, grouped display
- Export, bind/unbind operations

### 4. Navigation & Routing
- **Dynamic routing**: Automatically loads routes based on user permissions
- **Three root path modes**: `auto` (auto-enter first route), `showMenuOnly` (show menus only), `disabled` (disabled)
- **Navigation framework**: Top header + left sidebar + history tabs + breadcrumbs
- **Replaceable MainContent**: Business layer can inject custom layouts via `setMainContentComponent`

### 5. State Management (Pinia)
- **userStore**: User info & authentication
- **routeStore**: Route state & dynamic route loading
- **navigationStore**: Navigation state (top bar / sidebar / tabs / menu selection)
- **themeStore**: Dark/light theme switching
- **commonStore**: Login state and common status

### 6. Rich Component Library

| Component | Description |
|-----------|-------------|
| **Portal** | Advanced dynamic table (core data display component) |
| **DynamicForm** | Dynamic form engine with custom fields and layouts |
| **DragGrid** | Drag-and-drop grid forms, layouts, and panels |
| **AdvancedSearch** | Advanced query condition builder (AND/OR) |
| **GeneralDashboard** | General dashboard framework (indicator tree + charts) |
| **chartConfig** | ECharts chart configuration and dashboard grid |
| **Dropdown** | Custom dropdown selector |
| **GroupManage** | Group management component |
| **Content** | Content area layouts (Portal / List / Tree / Dict) |
| **Loading** | Full-screen loading animation |
| **Watermark** | Watermark overlay component |
| **UploadFile** | File upload component |

### 7. SSO Login
- Supports both SSO and local development modes
- Automatic token retrieval, verification, and refresh
- Session timeout auto-redirect to login

### 8. Theme System
- Automatic dark/light theme switching based on Ant Design Vue
- CSS design tokens (design-tokens.css) for style uniformity

---

## Tech Stack

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

## Quick Start

### Prerequisites
- Node.js >= 16
- npm >= 7

### Installation

```bash
# Navigate to the project root (erp-view)
cd erp-view

# Install dependencies
npm install
```

### Development

```bash
# Start dev server (default: http://localhost:8082)
npm run dev
```

The dev server proxies API requests from `/{project-name}/web/**` to `http://127.0.0.1:8080` (configurable in `vite.config.ts`).

### Build

```bash
# Build for production
npm run build
```

### Framework Usage

Business modules import framework capabilities via `@/framework/...`:

```typescript
// Example: Using the API layer in a business module
import { advancedQueryRequest } from '@/framework/apis'
import { get } from '@/framework/network/request'

// Using the Portal table component
// <portal-content ... />
```

---

## Project Initialization

You can quickly scaffold a new project using the built-in `init-project.sh` script, which copies templates from `src/framework/setup/` and configures the project.

### 1. How It Works

The script performs the following:

| Step | Action |
|------|--------|
| 1 | Copies template files from `src/framework/setup/` to project root |
| 2 | Creates `package.json` from `src/framework/config/package.json.backup`, replacing placeholders with your project info |
| 3 | Updates `deploy.sh` with your project code for deployment configuration |
| 4 | (Optional) Installs dependencies via `npm install` |
| 5 | (Optional) Starts the dev server via `npm run dev` |

### 2. Prerequisites

- Node.js >= 16
- npm >= 7
- Bash environment (Git Bash on Windows, or any Linux/macOS terminal)
- The `src/framework/setup/` and `src/framework/config/package.json.backup` must exist

### 3. Usage Guide

```bash
# From the project root (erp-view), run:
bash src/framework/script/init-project.sh
```

You will then be prompted:

**Step 1 — Enter project code**: An English identifier used as `name` in `package.json` (e.g., `erp-view`, `my-project`).

```
Please enter project code (English, used for package.json name): erp-view
```

**Step 2 — Enter project name**: A display name used as `title` in `package.json` (e.g., `ERP`).

```
Please enter project name (used for package.json title): ERP
```

**Step 3 — Confirm**: Review and confirm before files are overwritten.

```
Confirm to initialize the project? This will overwrite existing files (y/n): y
```

**Step 4 (Optional) — Install dependencies**:

```
Install dependencies now? (y/n): y
```

**Step 5 (Optional) — Start dev server**:

```
Start the dev server? (y/n): y
```

### 4. Files Being Copied

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

### 5. Customization

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

## Directory Convention

```
src/
├── framework/        ← This framework (generic infrastructure, no business logic)
├── views/            ← Business view modules (separate directories)
│   └── dashboard/om/customer/
│       ├── apis/     ← Business API files
│       ├── components/
│       ├── index.vue
│       └── ...
├── apis/             ← Business-level API files (optional)
├── components/       ← Business-level shared components
└── ...
```

**Core Principle**: `src/framework/` contains only pure framework infrastructure, free of any business domain logic. Business modules reside in their own directories under `src/views/`.

---

## Roadmap

- [ ] **Component Lazy Loading**: Further refine on-demand loading strategies for large components (Portal, DynamicForm, etc.)
- [ ] **Micro-frontend Support**: Explore Module Federation to enable multi-team independent development and deployment
- [ ] **Unit Test Coverage**: Add Vitest unit tests for core modules (network, api builder, utils)
- [ ] **Internationalization**: Provide a complete i18n solution for multi-language support
- [ ] **Performance Monitoring**: Integrate frontend performance monitoring (LCP, FID, CLS) and error tracking
- [ ] **Theme Editor**: Visual theme editor based on design-tokens.css
- [ ] **CLI Scaffolding**: Provide `create-business-module` scaffolding for rapid business module generation
- [ ] **TypeScript Strict Mode**: Gradually adopt strict mode for enhanced type safety
