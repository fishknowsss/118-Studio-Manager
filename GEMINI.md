# Gemini CLI 项目指引

> 本文件供 Gemini CLI 在此项目中自动加载。完整说明见 `CLAUDE.md`。

- 所有非代码输出**一律使用中文**
- 每次修改后运行 `npm run build` 和 `npm run test` 确认通过
- 不做超出要求的功能扩展或过度抽象

## ⚠️ 新增 IndexedDB store 必须遵守的规则

`BACKUP_COLLECTION_NAMES`（`src/legacy/utils.ts`）是云端同步的唯一注册中心。
**每次新增 IndexedDB store，必须在以下所有位置同步更改：**

1. `src/legacy/db.ts` — 创建 store + 升级 `DB_VERSION`
2. `src/legacy/utils.ts` — `BackupPayload` 类型 + `BACKUP_COLLECTION_NAMES` 数组
3. `src/legacy/selectors.ts` — `BackupSummary` + `buildBackupSummary`
4. `src/features/settings/settingsTransferState.ts` — `PersistedTransferState.summary`

遗漏任意一步会导致该 store 的数据无法云端同步。
