# 118 Studio Manager SingleD

`singleD` 分支不是 `main` 的多页面版本说明页。  
这个分支实际发布的是一个 **单屏工作台（single dashboard）**：所有关键操作都收拢在一个固定画布内完成，而不是在多个页面之间切换。

## 在线预览

- 预览地址: [https://fishknowsss.github.io/118-Studio-Manager/singleD/](https://fishknowsss.github.io/118-Studio-Manager/singleD/)
- 分支地址: [https://github.com/fishknowsss/118-Studio-Manager/tree/singleD](https://github.com/fishknowsss/118-Studio-Manager/tree/singleD)

## 这个分支是什么

`singleD` 是一个面向“单屏调度台”方向的实现分支，核心特征是：

- 应用只有一个主路由 `/`
- 主界面固定为一张 `1440 × 900` 的工作台画布
- 通过缩放适配当前窗口，而不是拆成多个独立页面
- 项目、任务、成员、日程、月历、数据操作都在同一视图内完成

从代码上看，这个分支当前入口只渲染 `DashboardPage`。对应实现见 [src/App.tsx](/Users/fishknowsss/Documents/MMSS/118SM/118studio-singleD/src/App.tsx) 和 [src/pages/DashboardPage.tsx](/Users/fishknowsss/Documents/MMSS/118SM/118studio-singleD/src/pages/DashboardPage.tsx)。

## 当前真实功能

`singleD` 当前围绕一个单屏 Dashboard 展开，主要包含这些能力：

| 区域 | 当前实现 | 作用 |
| --- | --- | --- |
| Today 卡片 | 显示当天日期、工作室名称 | 形成工作台入口信息 |
| Quote / Prompt 区 | 按日期切换一句引导语和当天工作提示 | 提供当天工作语境 |
| Workspace 快捷区 | 直接打开数据中心、新建项目、新建成员、新建任务 | 把高频动作收进顶部 |
| 今日焦点 | 展示近期最需要关注的项目截止日期 | 快速看 DDL 压力 |
| 日程区 | 展示后续里程碑和日程节点 | 看近期安排 |
| 任务池 | 展示未完成任务，支持状态切换和拖拽分配 | 任务调度入口 |
| 人员配置 | 展示启用中的成员卡片，支持拖拽接收任务 | 成员调度入口 |
| 月历总览 | 按天显示项目 DDL、日程、分配数量 | 基于日期查看负载 |
| 日期事项弹窗 | 查看某一天的成员分配、日程、项目 DDL、任务截止 | 细看单日工作内容 |
| 数据中心 | 修改工作室名称、导出 JSON、导入恢复旧备份 | 进行本地数据管理 |

## 交互特点

这个分支最重要的不是 CRUD 本身，而是单屏交互方式：

- 任务卡可以拖到成员卡上，直接完成某日分配
- 成员卡也可以拖到任务卡上完成反向分配
- 月历上的每天会显示 `DDL / 日程 / 分配` 三类计数标记
- 点击月历日期会打开当天事项弹窗
- 项目、任务、成员、日程都通过 modal 在当前画布内新增
- 数据中心内支持 JSON 备份导出和完整恢复

## 与 main 分支的区别

这个 README 只描述 `singleD` 分支当前真实内容。  
它和 `main` 分支的差异是明确的：

- `main` 更接近多页面工作室管理应用
- `singleD` 当前是单屏 Dashboard 方向
- `singleD` 重点在“一个画布内完成调度”，不是多页面导航

如果只看线上地址 [https://fishknowsss.github.io/118-Studio-Manager/singleD/](https://fishknowsss.github.io/118-Studio-Manager/singleD/)，应当把它理解为 **单屏工作台原型的运行版本**。

## 技术栈

| 类别 | 当前使用 |
| --- | --- |
| 前端框架 | React 19 |
| 语言 | TypeScript |
| 构建工具 | Vite 8 |
| 样式 | Tailwind CSS 4 |
| 路由 | React Router |
| 本地存储 | Dexie + IndexedDB |
| 日期处理 | Day.js |
| 部署 | GitHub Pages + GitHub Actions |

## 代码结构

这个分支虽然仍保留部分历史多页面代码，但当前真正生效的核心在这些位置：

```text
src/
  App.tsx                 应用入口，只渲染 DashboardPage
  pages/
    DashboardPage.tsx     单屏工作台主页面
  hooks/                  项目、任务、成员、分配、设置等数据 hooks
  services/               Dexie 数据写入、备份恢复逻辑
  db/                     本地数据库定义
public/
  dashboard-prototype.html  更早期的静态原型稿
```

## 本地运行

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

构建检查：

```bash
npm run lint
npm run build
```

## 数据说明

这个分支的数据仍然保存在浏览器本地 `IndexedDB`，数据库名称为：

```text
studio_manager_db
```

当前支持：

- 导出完整 JSON 备份
- 导入旧版完整备份
- 导入时自动补齐部分新增字段

## 部署说明

这个仓库的 GitHub Pages 采用“分支对应目录”的发布方式：

- `main` 发布到 `/118-Studio-Manager/v1/`
- `singleD` 发布到 `/118-Studio-Manager/singleD/`

`singleD` 分支构建时会注入对应基路径。相关配置见：

- [vite.config.ts](/Users/fishknowsss/Documents/MMSS/118SM/118studio-singleD/vite.config.ts)
- [.github/workflows/deploy.yml](/Users/fishknowsss/Documents/MMSS/118SM/118studio-singleD/.github/workflows/deploy.yml)

## 版本记录

| 版本 | 日期 | 说明 |
| --- | --- | --- |
| v0.3.2-singleD | 2026-04-12 | 按 `singleD` 实际线上内容重写 README，改为单屏工作台介绍 |
| v0.3.1-singleD | 2026-04-12 | 首次改写 `singleD` README，但内容仍偏向 `main` 分支 |
| v0.3.0 | 2026-04-10 | 引入 README 展示化改造 |
| v0.2.0 | 2026-04-09 | 修复 GitHub Pages 设置初始化问题 |
| v0.1.0 | 2026-04-09 | 完成首版工作台实现 |
