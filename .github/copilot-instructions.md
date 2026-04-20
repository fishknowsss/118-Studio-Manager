# Copilot 项目指引

非代码内容一律使用中文输出。修改后必须确保 `npm run build` 和 `npm run test` 均通过。

技术栈：React 19 + TypeScript 6 + Vite 8，纯 CSS（无 Tailwind），IndexedDB 本地存储，Cloudflare Worker 云端同步。

## ⚠️ Cloudflare / 云同步判断口径

- 生产同步接口的真实鉴权边界依赖 Cloudflare Access，不要仅因仓库里没有 Bearer token 就判定“生产无鉴权”。
- 生产同步 Worker 当前走的是 Custom Domain；若 Worker routes 为空，不代表未部署。
- `ALLOWED_ORIGIN` 仅用于 CORS，不是身份认证。
- 当前同步定位是小团队备份式同步，不是实时协同；在没有明确痛点前，不要默认建议 D1、Durable Objects、CRDT、操作日志等重型方案。
- 对 Cloudflare 相关结论，优先以 Dashboard 或 Cloudflare API 的实时配置为准，不要只看仓库静态配置。
- 公开仓库文档不要写入真实生产域名、KV id 或其他线上基础设施标识。

完整背景见 `docs/cloud-sync-context.md`。

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
