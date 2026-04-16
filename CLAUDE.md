# Claude 项目说明

## 输出语言

非代码内容（说明、回复、注释等）一律使用中文输出。

## 常用命令

- `npm run dev` — 启动开发服务器
- `npm run build` — TypeScript 类型检查 + Vite 生产构建
- `npm run test` — 运行 Vitest 测试
- `npm run lint` — ESLint 检查

每次修改后必须确保 `npm run build` 和 `npm run test` 均通过。

## 技术栈

- React 19 + TypeScript 6 + Vite 8
- 测试：Vitest + jsdom
- 样式：纯 CSS + CSS 变量（无 Tailwind / CSS Modules）
- 本地存储：IndexedDB（`studio118db`）
- 云端同步：Cloudflare Worker + KV
- 路径别名：`@` → `/src`

## 项目结构

```
src/legacy/       — 核心数据层：store, db, utils, selectors, actions, editUndo
src/features/     — 按功能域划分的模块（dashboard, sync, planner, materials 等）
src/views/        — 页面级组件（Dashboard, Projects, Tasks, Settings 等）
src/components/   — 共享 UI 组件（Dialog, ContextMenu, ExpandPanel, 反馈组件）
src/content/      — 静态内容数据
css/              — 全局样式
tests/            — 测试文件
cloudflare/       — Cloudflare Worker 后端
```

## ⚠️ 数据同步规则（最关键）

项目使用 IndexedDB 存储数据，通过 `db.exportAll()` 将全量数据推送到 Cloudflare KV 实现云端同步。

### 新增 IndexedDB store 时必须完成以下步骤：

1. **`src/legacy/db.ts`** — 在 `openDB()` 的 `onupgradeneeded` 中添加新 store + 升级 `DB_VERSION`
2. **`src/legacy/utils.ts`** — 在 `BackupPayload` 类型中添加对应字段
3. **`src/legacy/utils.ts`** — 在 `BACKUP_COLLECTION_NAMES` 数组中添加 store 名称
4. **`src/legacy/selectors.ts`** — `BackupSummary` 类型和 `buildBackupSummary` 中添加计数
5. **`src/features/settings/settingsTransferState.ts`** — `PersistedTransferState.summary` 中添加计数

步骤 2 和 3 是**自动参与同步的关键**——`db.exportAll()`、`db.importAll()`、`db.clearAll()` 均基于 `BACKUP_COLLECTION_NAMES` 常量循环执行，无需逐个手动修改。

**遗漏任何步骤都会导致新数据无法云端同步或恢复。**

### 同步机制

- 本地变更经 `emitStoreUpdated()` 或 `syncableDataUpdated` 事件触发 SyncProvider
- 自动同步：变更后 2 分钟防抖推送
- 手动同步：立即执行
- 远程拉取：每 10 分钟轮询 + 页面 visibility change 时检查
- 配置：通过 `VITE_SYNC_API_URL` 环境变量启用

## 状态管理

- **Legacy Store**（`src/legacy/store.ts`）：核心数据的单例 store，基于观察者模式 + IndexedDB
  - `store.subscribe(listener)` 订阅变更
  - 写操作通过 `store.saveXxx()` / `store.deleteXxx()` → `db.put()` → `emitStoreUpdated()`
- **Syncable Settings**（`src/features/persistence/`）：键值对形式的持久化设置
  - 通过 `createSyncableSettingsStore()` 创建
  - 写入触发 `syncableDataUpdated` 事件，参与自动同步

## CSS 规范

- 使用纯 CSS，通过 CSS 变量实现主题
- 暗色模式：`[data-theme='dark']` 属性选择器
- 命名：BEM 风格（如 `.focus-highlight-tier`、`.settings-transfer-note`）
- Dashboard 下半区是 grid + flex 组合；若某个 panel-body 设为 `overflow: visible`，必须显式保留 `min-height: 0`，否则内容区会撑爆高度

## 日期格式

- 统一使用 `YYYY-MM-DD` 本地日期字符串（非 UTC）
- 工具函数：`formatLocalDateKey()`、`parseLocalDateKey()`、`today()`、`shiftLocalDateKey()`
- 所有 ID 使用 `crypto.randomUUID()`

## 测试规范

- 框架：Vitest + jsdom 环境
- 需 DOM 的测试文件头部加 `// @vitest-environment jsdom`
- 测试放在 `tests/` 目录，文件名 `*.test.ts` / `*.test.tsx`
