# Agent 项目指引

> 适用于 OpenAI Codex 及其他支持项目级 agents 规范的工具。完整说明见 `CLAUDE.md`。

- 非代码内容**一律使用中文**
- 每次修改后必须确保 `npm run build` 和 `npm run test` 均通过
- 不要添加超出请求范围的功能、注释或抽象

## ⚠️ 新增 IndexedDB store 必须遵守的规则

`BACKUP_COLLECTION_NAMES`（`src/legacy/utils.ts`）是云端同步的唯一注册中心。
**每次新增 IndexedDB store，必须在以下所有位置同步更改：**

1. `src/legacy/db.ts` — 创建 store + 升级 `DB_VERSION`
2. `src/legacy/utils.ts` — `BackupPayload` 类型 + `BACKUP_COLLECTION_NAMES` 数组
3. `src/legacy/selectors.ts` — `BackupSummary` + `buildBackupSummary`
4. `src/features/settings/settingsTransferState.ts` — `PersistedTransferState.summary`

遗漏任意一步会导致该 store 的数据无法云端同步。
