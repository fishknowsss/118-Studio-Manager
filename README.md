# 118 Studio Manager

面向 118 Studio 的本地项目管理工具。当前仓库默认分支是 `vc`，也是唯一持续开发的版本。

## 当前版本

- 默认分支：`vc`
- 在线预览：[https://118.fishknowsss.com/](https://118.fishknowsss.com/)
- 仓库地址：[https://github.com/fishknowsss/118-Studio-Manager/tree/vc](https://github.com/fishknowsss/118-Studio-Manager/tree/vc)

## 这个版本能做什么

- 在今日页集中看最紧急项目、逾期任务、任务池和成员负载
- 按状态、优先级、DDL 管理项目和里程碑
- 按负责人、日期、状态管理任务
- 管理人员状态、技能标签和任务分配
- 在日历里查看 DDL、里程碑和当天排期
- 导出 JSON / CSV、导入备份、清空数据，并查看基础统计和最近日志

## 页面一览

| 路由 | 页面 | 当前用途 |
| --- | --- | --- |
| `#dashboard` | 今日 | 焦点项目、逾期任务、任务池、人员概览 |
| `#projects` | 项目 | 项目筛选、状态管理、里程碑编辑 |
| `#tasks` | 任务 | 任务筛选、搜索、编辑、新建 |
| `#people` | 人员 | 人员管理、技能标签、启用停用 |
| `#calendar` | 日历 | 月历、DDL、里程碑、排期入口 |
| `#settings` | 设置 | 备份、导入、导出、清库、数据统计 |

## 界面截图

以下截图来自 `vc` 分支本地运行页面，基于 `118studio-backup-2026-04-11.json` 导入后的状态拍摄。

**今日**

![VC Dashboard](docs/screenshots/vc-dashboard.png)

**项目**

![VC Projects](docs/screenshots/vc-projects.png)

**任务**

![VC Tasks](docs/screenshots/vc-tasks.png)

**人员**

![VC People](docs/screenshots/vc-people.png)

**日历**

![VC Calendar](docs/screenshots/vc-calendar.png)

**深色**

![VC Dashboard Dark](docs/screenshots/vc-dashboard-dark.png)

**设置**

![VC Settings](docs/screenshots/vc-settings.png)

## 适合怎么用

这个版本更适合做工作室内部的轻量项目协作：

- 用项目承接阶段、DDL 和里程碑
- 用任务跟踪执行人、开始/截止时间和排期
- 用人员页维护成员状态和技能
- 用设置页定期导出 JSON 做备份

它目前是本地优先方案，数据保存在浏览器本地，不依赖服务器。

## 分支说明

当前仓库已经把 `vc` 设为默认分支，后续开发以它为准。

| 分支 | 角色 | 状态 |
| --- | --- | --- |
| `vc` | 主力版本 | 默认分支，持续开发 |
| `main` | 历史版本 | 保留早期 Pages 版本，不再作为主线 |
| `singleD` | 历史版本 | 保留单屏方案和 README 记录，不再作为主线 |

如果只是继续开发 118 Studio Manager，请直接基于 `vc`。

## 技术说明

这个版本目前是“React 页面 + legacy 数据层”的结构。

### 前端壳

- React 负责应用入口、侧栏导航、视图切换和主题同步
- 当前视图通过 hash 切换，不走正式路由
- 主入口见 [App.tsx](/Users/fishknowsss/Documents/MMSS/118SM/118studio-vc/src/App.tsx)

主要视图：

- [Dashboard.tsx](/Users/fishknowsss/Documents/MMSS/118SM/118studio-vc/src/views/Dashboard.tsx)
- [Projects.tsx](/Users/fishknowsss/Documents/MMSS/118SM/118studio-vc/src/views/Projects.tsx)
- [Tasks.tsx](/Users/fishknowsss/Documents/MMSS/118SM/118studio-vc/src/views/Tasks.tsx)
- [People.tsx](/Users/fishknowsss/Documents/MMSS/118SM/118studio-vc/src/views/People.tsx)
- [Calendar.tsx](/Users/fishknowsss/Documents/MMSS/118SM/118studio-vc/src/views/Calendar.tsx)
- [Settings.tsx](/Users/fishknowsss/Documents/MMSS/118SM/118studio-vc/src/views/Settings.tsx)

### 数据与交互底层

- `legacy` 模块负责启动初始化、IndexedDB 读写、store 和演示数据
- 通用交互由 React 组件接管，包括弹窗、确认框、Toast 和日程侧栏
- 相关文件：
  - [bootstrap.ts](/Users/fishknowsss/Documents/MMSS/118SM/118studio-vc/src/legacy/bootstrap.ts)
  - [db.ts](/Users/fishknowsss/Documents/MMSS/118SM/118studio-vc/src/legacy/db.ts)
  - [store.ts](/Users/fishknowsss/Documents/MMSS/118SM/118studio-vc/src/legacy/store.ts)
  - [Dialog.tsx](/Users/fishknowsss/Documents/MMSS/118SM/118studio-vc/src/components/ui/Dialog.tsx)
  - [PlannerProvider.tsx](/Users/fishknowsss/Documents/MMSS/118SM/118studio-vc/src/features/planner/PlannerProvider.tsx)

## 数据与备份

本地数据库名：

```text
studio118db
```

当前核心 store：

| store | 内容 |
| --- | --- |
| `projects` | 项目、优先级、DDL、描述、里程碑 |
| `tasks` | 任务、负责人、日期、工时、状态 |
| `people` | 成员、状态、技能、备注 |
| `logs` | 操作日志 |
| `settings` | 本地设置 |

空库时会自动写入一组演示数据，方便直接查看页面状态和交互流程。

JSON 备份当前会包含：

- 项目
- 任务
- 人员
- 操作日志
- 本地设置

## 本地开发

安装依赖：

```bash
npm install
```

启动开发环境：

```bash
npm run dev
```

默认地址：

```text
http://127.0.0.1:5173/
```

常用检查命令：

```bash
npm run lint
npm run test
npm run build
```

当前回归测试见 [current-app-regressions.test.tsx](/Users/fishknowsss/Documents/MMSS/118SM/118studio-vc/tests/current-app-regressions.test.tsx)。

## 部署说明

GitHub Pages 现在采用“`vc` 占根路径、其他分支保留子目录”的方式发布：

- `vc` -> `https://118.fishknowsss.com/`
- `main` -> `/118-Studio-Manager/v1/`
- `singleD` -> `/118-Studio-Manager/singleD/`

`vc` 自定义域名构建 base 定义在 [vite.config.ts](/Users/fishknowsss/Documents/MMSS/118SM/118studio-vc/vite.config.ts)，部署流程在 [deploy.yml](/Users/fishknowsss/Documents/MMSS/118SM/118studio-vc/.github/workflows/deploy.yml)。

`vc` 部署会直接覆盖站点根目录，`v1` 和 `singleD` 继续作为独立版本路径保留。

## 云同步

当前版本支持“本地 IndexedDB + Cloudflare Worker/KV”同步：

- 自动同步：本地变更会合并后自动上传当前主数据
- 手动同步并备份：立即上传，同时覆盖云端最新一次手动备份
- 云端优先，更新本地：用当前云端主数据覆盖本地 IndexedDB

前端通过 `VITE_SYNC_API_URL` 连接同步接口，示例见 [.env.example](/Users/fishknowsss/Documents/MMSS/118SM/118studio-vc/.env.example)。

GitHub Pages 线上构建需要在仓库 `Settings -> Secrets and variables -> Actions -> Variables` 中添加同名变量 `VITE_SYNC_API_URL`。

Worker 示例代码见 [cloudflare/sync-worker/README.md](/Users/fishknowsss/Documents/MMSS/118SM/118studio-vc/cloudflare/sync-worker/README.md)。

## 目录结构

```text
src/
  App.tsx
  components/
  content/
  features/
  legacy/
  views/
tests/
  current-app-regressions.test.tsx
```

## 更新记录

| 版本 | 日期 | 说明 |
| --- | --- | --- |
| vc-readme-5 | 2026-04-12 | README 改为产品说明 + 开发说明双段结构，并同步当前分支状态 |
| vc-readme-4 | 2026-04-12 | 按 `118studio-backup-2026-04-11.json` 备份数据重做 7 张 README 页面截图 |
| vc-readme-2 | 2026-04-12 | README 改成带真实截图的版本，并补充当前迁移状态说明 |
| vc-readme-1 | 2026-04-12 | 首次补充 `vc` 分支专用 README |
