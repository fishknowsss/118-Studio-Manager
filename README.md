# 118 Studio Manager

面向小型工作室与内容团队的本地优先运营管理台。  
项目使用 `React 19 + TypeScript + Vite + Tailwind CSS + Dexie` 构建，数据保存在浏览器 `IndexedDB`，不依赖后端服务即可运行。

## 在线预览

- `singleD` 分支预览: [https://fishknowsss.github.io/118-Studio-Manager/singleD/](https://fishknowsss.github.io/118-Studio-Manager/singleD/)
- 仓库地址: [https://github.com/fishknowsss/118-Studio-Manager/tree/singleD](https://github.com/fishknowsss/118-Studio-Manager/tree/singleD)

## 这个项目解决什么问题

这个应用把工作室常见的几类管理动作收拢到一个界面里：

- 项目立项与截止时间管理
- 任务拆分、优先级和状态跟踪
- 成员信息与每日分配
- 里程碑、项目 DDL 和近期节点提醒
- 本地数据备份恢复与 CSV 导出

目标不是做复杂协同平台，而是提供一个可以快速落地、成本低、适合持续维护的单体工具。

## 核心功能

| 模块 | 实际能力 | 作用 |
| --- | --- | --- |
| Dashboard | 汇总今日分配、进行中任务、逾期项目、最近操作 | 快速判断当前工作室状态 |
| Projects | 管理项目名称、类型、客户来源、截止日期、状态、优先级 | 建立清晰的项目视图 |
| Tasks | 维护任务状态、优先级、所属项目与工时信息 | 把项目拆成可执行单元 |
| People | 管理成员角色、技能、备注和启用状态 | 明确谁可参与执行 |
| Daily Planner | 按天分配任务、查看当日焦点、月历节点与未来 7 天关键事项 | 把计划真正落到当天 |
| Milestones | 记录 kickoff、draft、review、delivery 等节点 | 提前暴露风险和交付压力 |
| Settings & Backup | JSON 完整备份恢复、CSV 导出、默认视图与备份提醒配置 | 保证数据可迁移和可恢复 |

## 界面预览

下面的截图来自项目当前真实界面。

| 页面 | 预览 |
| --- | --- |
| Dashboard | ![Dashboard](./docs/screenshots/dashboard.png) |
| Daily Planner | ![Planner](./docs/screenshots/planner.png) |
| Projects | ![Projects](./docs/screenshots/projects.png) |
| Settings | ![Settings](./docs/screenshots/settings.png) |

## 技术栈

| 类别 | 选型 |
| --- | --- |
| 前端框架 | React 19 |
| 语言 | TypeScript |
| 构建工具 | Vite 8 |
| 样式 | Tailwind CSS 4 |
| 路由 | React Router |
| 本地存储 | Dexie + IndexedDB |
| 日历 | FullCalendar |
| 日期处理 | Day.js |
| 部署 | GitHub Pages + GitHub Actions |

## 项目结构

```text
src/
  components/   通用 UI 组件
  pages/        页面级视图
  hooks/        页面数据聚合与状态逻辑
  services/     项目、任务、人员、备份等业务操作
  db/           Dexie 数据库定义
  constants/    常量、状态映射、导航配置
  types/        业务类型声明
  utils/        日期、CSV、排序、校验等工具
docs/
  screenshots/  README 中使用的界面截图
```

## 本地开发

安装依赖：

```bash
npm install
```

启动开发服务器：

```bash
npm run dev
```

默认访问地址：

```text
http://127.0.0.1:5173/
```

## 构建与检查

```bash
npm run lint
npm run build
```

## 数据与备份

- 数据默认保存在浏览器 `IndexedDB`
- 支持导出完整 `JSON` 作为全量备份
- 支持导出项目、任务、日程分配的 `CSV`
- 支持导入备份文件进行完整恢复

如果用于长期实际数据，建议定期导出 JSON 备份。

## singleD 分支部署说明

这个仓库的 GitHub Pages 采用分支到目录的发布方式：

- `main` 分支发布到 `/118-Studio-Manager/v1/`
- `singleD` 分支发布到 `/118-Studio-Manager/singleD/`

在这个分支中，构建基路径会通过 `DEPLOY_BASE` 注入，默认部署目标就是 `singleD`。对应配置可以在 [vite.config.ts](/Users/fishknowsss/Documents/MMSS/118SM/118studio-singleD/vite.config.ts) 和 [.github/workflows/deploy.yml](/Users/fishknowsss/Documents/MMSS/118SM/118studio-singleD/.github/workflows/deploy.yml) 中看到。

## 版本记录

| 版本 | 日期 | 说明 |
| --- | --- | --- |
| v0.3.1-singleD | 2026-04-12 | 重写 `singleD` 分支 README，内容与该分支部署路径和实际结构对齐 |
| v0.3.0 | 2026-04-10 | README 加入真实截图、在线预览和版本记录 |
| v0.2.0 | 2026-04-09 | 修复 GitHub Pages 设置初始化问题 |
| v0.1.0 | 2026-04-09 | 完成首版工作室管理台 |
