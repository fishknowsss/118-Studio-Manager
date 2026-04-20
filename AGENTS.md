# Agent 项目指引

> 适用于 OpenAI Codex 及其他支持项目级 agents 规范的工具。完整说明见 `CLAUDE.md`。

- 非代码内容**一律使用中文**
- 每次修改后必须确保 `npm run build` 和 `npm run test` 均通过
- 不要添加超出请求范围的功能、注释或抽象

## ⚠️ Cloudflare Access 鉴权约定

- 生产环境中，Cloudflare Worker 同步接口的鉴权边界依赖 Cloudflare Access；主站自定义域名与同步自定义域名都必须受保护。
- 公开仓库文档不要写入真实生产域名；若需举例，统一使用占位域名。
- 生产同步 Worker 当前走的是 **Custom Domain**，不是传统 Worker Route；若 zone 的 Worker routes 为空，不代表未部署。
- 生产环境应关闭 `workers.dev` 或其他可绕过 Access 的公开入口；若存在可匿名访问的备用域名，应视为高危。
- 不要仅因仓库代码未实现 Bearer token 就直接判定“生产无鉴权”；应先结合部署说明确认同步自定义域是否已启用 Access。
- 对 Cloudflare 相关结论，优先以 Dashboard 或 Cloudflare API 的实时配置为准，不要把仓库里的 `wrangler.toml` 当成唯一事实来源。
- `ALLOWED_ORIGIN` 仅用于 CORS，不是身份认证。
- 任何发现匿名访问仍可读取同步入口 `/data` 或 `/meta` 的情况，都应视为高危。

## ⚠️ 云同步评审口径

- 当前云同步的定位是 **小团队备份式同步**，不是实时协同系统；默认不要把它按多人实时协同产品的标准直接判定为架构缺陷。
- 当前实际编辑场景是小规模、低并发、可沟通协作；除非已出现真实工作流痛点，不要默认建议 D1、Durable Objects、CRDT、操作日志等重型方案。
- 当前同步单位仍是整包快照；“可能发生覆盖”应被描述为低频操作性风险，不要夸大成当前的主要生产事故风险。
- 若未来需要升级，同步优化优先级应为：先补冲突提示与恢复路径，再考虑集合级增量同步，最后才是记录级或协同级重构。
- 评审时要把以下问题拆开判断：鉴权、数据一致性、交互体验、公开仓库暴露真实线上信息。不要混成单一结论。

完整背景见 `docs/cloud-sync-context.md`。

## ⚠️ 新增 IndexedDB store 必须遵守的规则

`BACKUP_COLLECTION_NAMES`（`src/legacy/utils.ts`）是云端同步的唯一注册中心。
**每次新增 IndexedDB store，必须在以下所有位置同步更改：**

1. `src/legacy/db.ts` — 创建 store + 升级 `DB_VERSION`
2. `src/legacy/utils.ts` — `BackupPayload` 类型 + `BACKUP_COLLECTION_NAMES` 数组
3. `src/legacy/selectors.ts` — `BackupSummary` + `buildBackupSummary`
4. `src/features/settings/settingsTransferState.ts` — `PersistedTransferState.summary`

遗漏任意一步会导致该 store 的数据无法云端同步。
