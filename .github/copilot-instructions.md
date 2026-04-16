# Copilot 项目指引

非代码内容一律使用中文输出。修改后必须确保 `npm run build` 和 `npm run test` 均通过。

技术栈：React 19 + TypeScript 6 + Vite 8，纯 CSS（无 Tailwind），IndexedDB 本地存储，Cloudflare Worker 云端同步。

## ⚠️ 新增 IndexedDB store 检查清单

`BACKUP_COLLECTION_NAMES`（`src/legacy/utils.ts`）是云端同步的唯一注册中心。新增 store 时必须同时更新：

1. `src/legacy/db.ts` — `openDB()` 中创建 store + 升级 `DB_VERSION`
2. `src/legacy/utils.ts` — `BackupPayload` 类型 + `BACKUP_COLLECTION_NAMES` 数组
3. `src/legacy/selectors.ts` — `BackupSummary` 和 `buildBackupSummary`
4. `src/features/settings/settingsTransferState.ts` — `PersistedTransferState.summary`

遗漏会导致数据无法云端同步。完整说明见 `CLAUDE.md`。

## 关键架构约定

- 写操作：`store.saveXxx()` → `db.put()` → `emitStoreUpdated()`
- 日期：`YYYY-MM-DD` 本地字符串，用 `formatLocalDateKey()` 等工具函数
- ID：`crypto.randomUUID()`
- CSS 暗色模式：`[data-theme='dark']` 属性选择器
- 路径别名：`@` → `/src`
