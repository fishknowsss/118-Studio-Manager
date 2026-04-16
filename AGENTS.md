# Agent 项目指引

> 适用于 OpenAI Codex 及其他支持项目级 agents 规范的工具。完整说明见 `CLAUDE.md`。

- 非代码内容**一律使用中文**
- 每次修改后必须确保 `npm run build` 和 `npm run test` 均通过
- 不要添加超出请求范围的功能、注释或抽象

## ⚠️ Cloudflare Access 鉴权约定

- 生产环境中，Cloudflare Worker 同步接口的鉴权边界依赖 Cloudflare Access；主站自定义域名与同步自定义域名都必须受保护。
- 公开仓库文档不要写入真实生产域名；若需举例，统一使用占位域名。
- 不要仅因仓库代码未实现 Bearer token 就直接判定“生产无鉴权”；应先结合部署说明确认同步自定义域是否已启用 Access。
- `ALLOWED_ORIGIN` 仅用于 CORS，不是身份认证。
- 任何发现匿名访问仍可读取同步入口 `/data` 或 `/meta` 的情况，都应视为高危。

## ⚠️ 新增 IndexedDB store 必须遵守的规则

`BACKUP_COLLECTION_NAMES`（`src/legacy/utils.ts`）是云端同步的唯一注册中心。
**每次新增 IndexedDB store，必须在以下所有位置同步更改：**

1. `src/legacy/db.ts` — 创建 store + 升级 `DB_VERSION`
2. `src/legacy/utils.ts` — `BackupPayload` 类型 + `BACKUP_COLLECTION_NAMES` 数组
3. `src/legacy/selectors.ts` — `BackupSummary` + `buildBackupSummary`
4. `src/features/settings/settingsTransferState.ts` — `PersistedTransferState.summary`

遗漏任意一步会导致该 store 的数据无法云端同步。
