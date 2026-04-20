# Gemini CLI 项目指引

> 本文件供 Gemini CLI 在此项目中自动加载。完整说明见 `CLAUDE.md`。

- 所有非代码输出**一律使用中文**
- 每次修改后运行 `npm run build` 和 `npm run test` 确认通过
- 不做超出要求的功能扩展或过度抽象

## ⚠️ Cloudflare / 云同步判断口径

- 生产同步接口的真实鉴权边界依赖 Cloudflare Access，不要仅因仓库里没有 Bearer token 就判定“生产无鉴权”。
- 生产同步 Worker 当前走的是 Custom Domain；若 Worker routes 为空，不代表未部署。
- `ALLOWED_ORIGIN` 仅用于 CORS，不是身份认证。
- 当前同步定位是小团队备份式同步，不是实时协同；在没有明确痛点前，不要默认建议 D1、Durable Objects、CRDT、操作日志等重型方案。
- 对 Cloudflare 相关结论，优先以 Dashboard 或 Cloudflare API 的实时配置为准，不要只看仓库静态配置。
- 公开仓库文档不要写入真实生产域名、KV id 或其他线上基础设施标识。

完整背景见 `docs/cloud-sync-context.md`。

## ⚠️ 新增 IndexedDB store 必须遵守的规则

`BACKUP_COLLECTION_NAMES`（`src/legacy/utils.ts`）是云端同步的唯一注册中心。
**每次新增 IndexedDB store，必须在以下所有位置同步更改：**

1. `src/legacy/db.ts` — 创建 store + 升级 `DB_VERSION`
2. `src/legacy/utils.ts` — `BackupPayload` 类型 + `BACKUP_COLLECTION_NAMES` 数组
3. `src/legacy/selectors.ts` — `BackupSummary` + `buildBackupSummary`
4. `src/features/settings/settingsTransferState.ts` — `PersistedTransferState.summary`

遗漏任意一步会导致该 store 的数据无法云端同步。
