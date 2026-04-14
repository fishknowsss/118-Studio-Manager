# 118 Studio Manager (vc)

118 Studio 的本地优先项目协作工具，聚焦「项目 / 任务 / 人员 / 日历 / 备份同步」。

- 在线预览：https://118.fishknowsss.com/
- 主开发分支：`vc`
- 仓库地址：https://github.com/fishknowsss/118-Studio-Manager/tree/vc

> 本 README 已按当前仓库代码与配置校准（2026-04-14）。

## 核心能力

- 今日看板：焦点项目、任务池、人员负载、迷你日历
- 项目管理：状态、优先级、DDL、里程碑、时间轴
- 任务管理：筛选、搜索、快速状态/优先级/负责人更新
- 人员管理：成员状态、技能、任务分配
- 月历视图：按日期聚合 DDL 与里程碑，可打开当天排期面板
- 数据管理：JSON/CSV 导出、JSON 导入、全量清空
- 云同步（可选）：本地 IndexedDB 与 Cloudflare Worker/KV 同步

## 页面路由

当前使用 hash 路由：

| 路由 | 页面 | 说明 |
| --- | --- | --- |
| `#dashboard` | 今日 | 焦点项目、任务池、人员与日历联动 |
| `#projects` | 项目 | 卡片/时间轴视图，支持状态快捷操作 |
| `#tasks` | 任务 | 任务筛选与右键快捷更新 |
| `#people` | 人员 | 成员信息、启用停用、任务关联 |
| `#calendar` | 日历 | 月历查看 DDL/里程碑并打开日程面板 |
| `#settings` | 设置 | 备份导入导出、云同步、统计与日志 |

## 界面截图

![Dashboard](docs/screenshots/vc-dashboard.png)
![Projects](docs/screenshots/vc-projects.png)
![Tasks](docs/screenshots/vc-tasks.png)
![People](docs/screenshots/vc-people.png)
![Calendar](docs/screenshots/vc-calendar.png)
![Dashboard Dark](docs/screenshots/vc-dashboard-dark.png)
![Settings](docs/screenshots/vc-settings.png)

## 快速开始

### 环境要求

- Node.js：`24.14.1`（见 `package.json` 的 `engines` / `volta`）
- npm：`11.11.0`

### 安装与运行

```bash
npm install
npm run dev
```

默认开发地址：`http://127.0.0.1:5173/`

macOS 可用一键脚本：

```bash
./118-start.command
```

### 常用命令

```bash
npm run lint
npm run test
npm run build
npm run preview
```

## 技术架构

当前是「React 视图层 + legacy 数据层」结构：

- 入口与应用壳：`src/main.tsx`、`src/App.tsx`
- 页面层：`src/views/*`
- 领域组件：`src/features/*`
- 复用 UI 与反馈组件：`src/components/*`
- 数据层与业务动作：`src/legacy/*`

关键点：

1. 状态来源是 `legacy/store`（内存态），通过 `useSyncExternalStore` 接入 React。
2. 持久化存储使用 IndexedDB（数据库名：`studio118db`）。
3. 选择器模型集中在 `legacy/selectors.ts`，减少页面内重复计算。
4. 空库启动时优先尝试云端恢复，失败则写入演示数据。

## 本地数据、备份与恢复

IndexedDB object stores：

| Store | 用途 |
| --- | --- |
| `projects` | 项目主体、状态、DDL、里程碑 |
| `tasks` | 任务、负责人、排期与状态 |
| `people` | 人员与技能 |
| `logs` | 操作日志（保留最近 50 条） |
| `settings` | 本地设置 |

JSON 备份结构（schema v2）包含：

- `projects`
- `tasks`
- `people`
- `logs`
- `settings`
- `schemaVersion`
- `exportedAt`

## 云同步（可选）

前端通过环境变量连接同步服务：

```bash
VITE_SYNC_API_URL=https://sync.fishknowsss.com
```

示例见 `.env.example`。

同步行为：

1. 自动同步：本地变更后约 2 分钟触发一次自动上传。
2. 手动同步并备份：立即上传当前数据，并下载一份本地 JSON。
3. 云端优先恢复：用云端快照覆盖本地 IndexedDB。
4. 启动恢复：本地空库且云端有数据时，启动阶段自动拉取。

Cloudflare Worker 参考：`cloudflare/sync-worker/README.md`。

## 部署说明

GitHub Pages 工作流：`.github/workflows/deploy.yml`

分支到路径映射：

- `vc` -> 站点根路径 `/`（https://118.fishknowsss.com/）
- `main` -> `/v1/`
- `singleD` -> `/singleD/`

构建基路径通过 `DEPLOY_BASE` 注入，Vite 配置在 `vite.config.ts`。

如需在 Pages 使用云同步，请在仓库 Actions Variables 中设置：

- `VITE_SYNC_API_URL`

## 测试与质量

- 单元与回归测试：`tests/*`（Vitest + jsdom）
- 代码检查：ESLint
- 构建：TypeScript build + Vite build

建议提交前至少执行：

```bash
npm run lint && npm run test && npm run build
```

## 目录结构

```text
.
├─ src/
│  ├─ components/      # 通用 UI 与反馈组件
│  ├─ content/         # 文案内容
│  ├─ features/        # 业务域组件（dashboard/projects/tasks/...）
│  ├─ legacy/          # 数据层、actions、selectors、db
│  ├─ views/           # 页面入口
│  ├─ App.tsx
│  └─ main.tsx
├─ tests/              # 回归与单元测试
├─ cloudflare/
│  └─ sync-worker/     # 云同步 Worker 示例
├─ css/style.css       # 主样式
└─ README.md
```

## 分支策略

| 分支 | 角色 | 状态 |
| --- | --- | --- |
| `vc` | 主力版本 | 持续开发 |
| `main` | 历史版本 | 保留，不作为主线 |
| `singleD` | 历史版本 | 保留，不作为主线 |

如无特殊说明，请直接基于 `vc` 开发。
