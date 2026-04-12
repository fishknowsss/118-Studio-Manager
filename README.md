# 118 Studio Manager VC

`vc` 分支是我在现有 118 Studio Manager 基础上整理的一条 **过渡版本 / version candidate** 分支。  
这个分支的目标不是继续沿用当前主线的页面结构，而是把一套已经成型的工作室管理逻辑，收敛成一个更稳定、可继续迁移的 React 外壳版本。

线上预览地址：

- [https://fishknowsss.github.io/118-Studio-Manager/vc/](https://fishknowsss.github.io/118-Studio-Manager/vc/)

分支地址：

- [https://github.com/fishknowsss/118-Studio-Manager/tree/vc](https://github.com/fishknowsss/118-Studio-Manager/tree/vc)

## 这个分支当前是什么

`vc` 不是 `main` 的直接拷贝，也不是 `singleD` 的单屏版本。

它当前的实际形态是：

- 用 `React + Vite` 承载整个应用入口和视图切换
- 保留一套仍在工作的 legacy JS 数据层、组件层和部分交互逻辑
- 通过 Hash 路由切换几个核心视图
- 继续使用本地 `IndexedDB` 存储数据
- 在没有任何本地数据时自动写入一套 demo 数据，方便直接预览和测试

这条分支本质上是一个 **可运行的迁移中版本**：UI 已经进入 React 视图层，但核心数据流、通用弹窗、Planner、部分业务逻辑仍来自 legacy 模块。

## 当前功能范围

`vc` 分支目前包含这些可用视图：

| 视图 | 当前用途 |
| --- | --- |
| Dashboard | 显示今日信息、随机 quote、最紧急项目、任务池、人员面板、月历概览 |
| Projects | 项目卡片 / 时间轴两种视图，支持筛选、快速改状态、里程碑编辑 |
| Tasks | 任务列表、筛选、右键快速改状态 / 优先级 / 负责人 |
| People | 管理成员信息、技能、状态和分配情况 |
| Calendar | 打开 Planner 面板查看按天安排 |
| Settings | 本地数据导入导出、清库、基础设置 |

从入口实现上看，当前 Hash 导航只会在这些视图之间切换：

- `#dashboard`
- `#projects`
- `#tasks`
- `#people`
- `#calendar`
- `#settings`

对应代码在 [src/App.tsx](/Users/fishknowsss/Documents/MMSS/118SM/118studio-vc/src/App.tsx)。

## 实际架构

这个分支最重要的不是页面数量，而是它的混合架构。

### 1. React 负责应用壳和主视图

React 当前负责：

- 应用入口
- 侧边栏和主区域切换
- 视图级组件
- 主题状态同步
- 订阅 store 更新并触发重渲染

相关代码：

- [src/App.tsx](/Users/fishknowsss/Documents/MMSS/118SM/118studio-vc/src/App.tsx)
- [src/views/Dashboard.tsx](/Users/fishknowsss/Documents/MMSS/118SM/118studio-vc/src/views/Dashboard.tsx)
- [src/views/Projects.tsx](/Users/fishknowsss/Documents/MMSS/118SM/118studio-vc/src/views/Projects.tsx)
- [src/views/Tasks.tsx](/Users/fishknowsss/Documents/MMSS/118SM/118studio-vc/src/views/Tasks.tsx)
- [src/views/People.tsx](/Users/fishknowsss/Documents/MMSS/118SM/118studio-vc/src/views/People.tsx)
- [src/views/Calendar.tsx](/Users/fishknowsss/Documents/MMSS/118SM/118studio-vc/src/views/Calendar.tsx)
- [src/views/Settings.tsx](/Users/fishknowsss/Documents/MMSS/118SM/118studio-vc/src/views/Settings.tsx)

### 2. legacy JS 仍在提供底层能力

legacy 层目前仍承担这些职责：

- 应用初始化
- IndexedDB 打开与读写
- store 状态对象
- modal / toast / planner 面板
- demo seed
- 一部分业务交互

相关代码：

- [js/app.js](/Users/fishknowsss/Documents/MMSS/118SM/118studio-vc/js/app.js)
- [js/components.js](/Users/fishknowsss/Documents/MMSS/118SM/118studio-vc/js/components.js)
- [js/views/calendar.js](/Users/fishknowsss/Documents/MMSS/118SM/118studio-vc/js/views/calendar.js)
- [src/legacy/db.ts](/Users/fishknowsss/Documents/MMSS/118SM/118studio-vc/src/legacy/db.ts)
- [src/legacy/store.ts](/Users/fishknowsss/Documents/MMSS/118SM/118studio-vc/src/legacy/store.ts)

React 和 legacy 的连接方式比较直接：

- React 启动时 `import('../js/app.js')`
- `app.js` 负责初始化 DB、加载 store、注入 demo 数据
- React 通过 `useSyncExternalStore(store.subscribe, ...)` 订阅 legacy store

这套方式不算终态，但当前是可工作的。

## 数据模型

这个分支当前维护四类核心数据：

| Store | 说明 |
| --- | --- |
| `projects` | 项目本身，包含状态、优先级、DDL、描述、里程碑 |
| `tasks` | 任务，包含负责人、安排日期、开始/截止日期、工时、描述 |
| `people` | 成员，包含姓名、性别、状态、技能、备注 |
| `logs` | 操作日志 |

本地数据库名：

```text
studio118db
```

当前 IndexedDB store：

- `projects`
- `tasks`
- `people`
- `logs`
- `settings`

对应定义在 [src/legacy/db.ts](/Users/fishknowsss/Documents/MMSS/118SM/118studio-vc/src/legacy/db.ts)。

## Demo 数据

如果浏览器本地数据库是空的，`vc` 分支会自动写入一套演示数据。

当前 demo seed 会生成：

- 3 个成员
- 3 个项目
- 若干任务
- 项目 milestone
- 一条日志

这样做是为了让线上预览首次打开时不是空白系统，而是能直接看到 Dashboard、项目和任务的真实状态。

Demo seed 逻辑在 [js/app.js](/Users/fishknowsss/Documents/MMSS/118SM/118studio-vc/js/app.js)。

## 当前交互特点

这个分支已经具备几类比较完整的交互：

- Dashboard 直接展示最紧急项目和任务池
- 任务可分配给成员，支持快速修改状态
- 项目支持右键快速切换状态
- 任务支持右键快速改状态、优先级和负责人
- Calendar 会打开 Planner 面板处理按日安排
- Settings 支持本地导入、导出和清理数据
- 主题支持浅色 / 深色切换，并保存在 `localStorage`

## 当前局限

这个 README 不回避当前问题。`vc` 现在的状态很明确：

- 不是纯 React 架构，legacy 依赖还比较重
- modal / planner / toast 仍然走旧组件逻辑
- 数据模型是历史结构，不是主线版本那套类型系统
- 路由仍然基于 hash，而不是正式的 React Router 业务路由
- 当前更适合继续迁移、迭代和验证，不适合作为终版架构直接扩展

这也是我保留 `vc` 分支独立存在的原因：它是一个可运行的过渡层，不该和主线产品形态混为一谈。

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

## 检查命令

Lint：

```bash
npm run lint
```

构建：

```bash
npm run build
```

测试：

```bash
npm run test
```

当前测试文件：

- [tests/review-fixes.test.js](/Users/fishknowsss/Documents/MMSS/118SM/118studio-vc/tests/review-fixes.test.js)

测试内容主要覆盖：

- 停用成员仍可在任务编辑里正确显示
- modal backdrop 监听不重复累积
- blocked 任务不会进入 planner 的可分配列表
- deploy workflow 会先跑 lint 再 build

## 部署方式

这个仓库的 Pages 发布采用“分支 -> 子目录”的方式：

- `main` -> `/118-Studio-Manager/v1/`
- `singleD` -> `/118-Studio-Manager/singleD/`
- `vc` -> `/118-Studio-Manager/vc/`

`vc` 分支构建时使用的 base path 在 [vite.config.ts](/Users/fishknowsss/Documents/MMSS/118SM/118studio-vc/vite.config.ts) 中定义：

```ts
/118-Studio-Manager/vc/
```

部署工作流在 [.github/workflows/deploy.yml](/Users/fishknowsss/Documents/MMSS/118SM/118studio-vc/.github/workflows/deploy.yml)。

## 目录说明

```text
src/
  App.tsx            React 应用入口
  views/             React 视图层
  legacy/            TS 包装后的旧数据层 / store / util
js/
  app.js             legacy 启动逻辑
  components.js      modal / toast / 表单构造
  views/             legacy Planner 等交互模块
tests/
  review-fixes.test.js
```

## 版本记录

| 版本 | 日期 | 说明 |
| --- | --- | --- |
| vc-readme-1 | 2026-04-12 | 首次补充 `vc` 分支专用 README，明确说明这是一条 React + legacy 混合架构分支 |
| 3e45bf2 | 2026-04-11 | 重做 VC workspace 的视图和交互 |
| c594da5 | 2026-04-11 | 修复 VC 的 GitHub Pages 发布 |
| 0cfd3c6 | 2026-04-12 | 升级 Actions runtime 版本 |
