# 118 Studio Manager VC 阶段化结构与体验优化设计

## 背景

当前项目整体可用，`npm run build` 与 `npm run test` 均通过，但存在以下持续扩散的问题：

- `src/legacy/selectors.ts` 过大，混合了业务规则、日期格式化、中文文案与视图模型。
- `src/views/Materials.tsx` 体量过大，承担了过多状态与交互职责。
- 部分主要交互仍依赖 `div + onClick`，弹窗与提示缺少完整的可访问性处理。
- 日期与状态文案格式化分散在多个视图与 selector 中。
- 同步与持久化链路以事件与副作用拼装，状态表达不够集中。
- 图谱页与工具页可用，但控制结构和长期扩展性一般。

## 明确范围

本次只做以下内容：

1. `legacy` 结构收口与 selector 拆分
2. `Materials` 页面模块化拆分
3. 可访问性修复
4. 日期/标签格式化收口
5. 同步与持久化状态整理
6. 图谱页与工具页的 UI / UX 提升

本次明确不做：

- 不增加 loading / skeleton
- 不引入页面懒加载
- 不调整首页的轻量初始化策略
- 不新增超出上述范围的功能

## 目标

### 工程目标

- 降低大文件复杂度，明确每个模块的职责边界
- 让 selector 只负责数据推导，不再夹带展示格式拼装
- 让同步与持久化状态更可追踪、更易测试

### 体验目标

- 补齐键盘可达、焦点可见、弹窗与 toast 的基础可访问性
- 让图谱页的控制结构更清晰，详情与主画布联动更强
- 让工具页从静态链接墙变成可搜索、可固定、可记录使用痕迹的轻量工具台

## 总体方案

采用双阶段推进：

### 第一阶段：结构层

先完成以下内容：

- `legacy` selector / formatter 拆分
- 日期与标签格式化收口
- 同步与持久化状态整理

这一阶段不主动改动大块视觉结构，只做必要的接线调整。

### 第二阶段：界面与交互层

在第一阶段稳定后完成：

- `Materials` 页面拆分
- 可访问性修复
- 图谱页 UI / UX 重构
- 工具页 UI / UX 重构

## 文件与模块设计

### 1. legacy 结构拆分

现状：

- `src/legacy/selectors.ts` 承担过多职责

目标结构：

```text
src/legacy/
  selectors/
    dashboard.ts
    projects.ts
    tasks.ts
    people.ts
    shared.ts
  formatters/
    date.ts
    labels.ts
  store.ts
  actions.ts
  utils.ts
```

拆分原则：

- `selectors/*` 只做实体到视图模型的纯函数推导
- `formatters/*` 只负责日期、标签、状态文字等格式输出
- `shared.ts` 放跨页面复用的 entity map、排序、筛选等纯逻辑
- `store.ts` 继续保留实体存取与最小运行时兼容逻辑，不塞入展示逻辑

边界要求：

- 不改变已有备份、同步与 IndexedDB schema
- 不改变现有公开函数语义，优先做等价迁移

### 2. Materials 页面拆分

现状：

- `src/views/Materials.tsx` 同时管理 briefs、accounts、folders、portal、复制、搜索、创建、移动、重命名等多块职责

目标结构：

```text
src/features/materials/
  BriefPane.tsx
  AccountPane.tsx
  AccountToolbar.tsx
  FolderGrid.tsx
  PlatformCard.tsx
  FolderPanelPortal.tsx
  AccountEntry.tsx
  materialsState.ts
  materialsSelectors.ts
  useMaterialsBriefs.ts
  useMaterialsAccounts.ts
```

页面结构：

```text
Materials
  MaterialsTopbar
    BriefToolbar
    AccountToolbar
  MaterialsSplit
    BriefPane
      BriefList | EmptyState
    AccountPane
      SecurityNotice
      FolderGrid
        PlatformCard
      FolderPanelPortal
        AccountEntry[]
      EmptyState
```

交互原则：

- 保留当前“文件夹 + 账号”的核心模式
- 保留 hover / focus 打开面板的主方向
- 但拆出定位与开关逻辑，避免 portal 交互继续堆积在页面文件里

### 3. 可访问性修复

重点范围：

- 可点击面板头
- 项目卡片 / 人员卡片 / 任务条目
- 弹窗
- toast
- 图谱页工具栏与节点详情操作

修复原则：

- 把纯点击容器改成真实 `button` 或具备完整键盘语义的交互元素
- 用 `:focus-visible` 替代简单 `outline: none`
- `Dialog` 增加焦点约束、初始聚焦与关闭后焦点恢复
- `ToastProvider` 增加 `aria-live`
- 不为了可访问性引入多余说明文案，不把实现提示渲染到 UI

### 4. 日期与标签格式化收口

需要收口的内容：

- 页面头部日期
- 设置页最近操作时间
- 搜索项副标题中的日期
- DDL / 状态 / 优先级标签

目标：

- 所有中文日期输出集中到 `legacy/formatters/date.ts`
- 所有状态与标签文本集中到 `legacy/formatters/labels.ts`
- selector 不直接拼装零散格式字符串，尽量调用 formatter

### 5. 同步与持久化状态整理

现状问题：

- `CloudSyncProvider` 既管远端元数据、自动同步定时器、应用远端数据，又管标签文本
- `createSyncableSettingsStore()` 写入失败只做控制台输出

目标结构：

```text
src/features/sync/
  SyncProvider.tsx
  syncController.ts
  syncDirtyState.ts
  syncStatusFormatter.ts
  syncApi.ts
  syncShared.ts
```

目标行为：

- provider 只负责 React context 接线
- 控制器负责自动同步、远端应用、本地脏状态
- 文本格式由 formatter 单独输出
- 写入失败时能形成可追踪状态，而不是仅打印到控制台

约束：

- 不改 Cloudflare Access 相关边界判断
- 不改现有 `/meta`、`/data` 协议语义

## 图谱页改造设计

### 目标

- 让控制项比现在更易理解
- 让“选中节点”成为页面核心状态
- 强化主画布、快速定位、详情面板之间的联动

### 组件树

```text
Graph
  GraphHeader
    GraphSearch
  GraphLayout
    GraphStagePanel
      GraphHintBar
      GraphToolbar
        ScopeToggle
        LayoutToggle
        LabelToggle
        DoneFilterToggle
        ViewActions
      GraphStage
      GraphTooltip
    GraphSidebar
      SearchResultList
      GraphOverview
      TopNodeList
      GraphDetailPanel
```

### 交互调整

- 工具栏改为显式分组，而不是连续一列仅靠图标区分
- 选中节点后，详情面板优先展示节点信息与直接动作
- 搜索结果、关键节点、关联节点统一使用同一类列表项样式
- 保留现有 force / radial / lanes 三种布局
- 不引入沉重动画库，不做复杂转场

## 工具页改造设计

### 目标

- 从静态链接墙升级为轻量工具台
- 支持快速搜索、固定常用、记录最近使用

### 组件树

```text
Tools
  ToolsHeader
    ToolSearchBar
    ToolViewControls
  ToolsContent
    PinnedToolsSection
    RecentToolsSection
    InspirationSection
    WebToolsSection
```

### 数据策略

- 工具源数据仍可先保留本地静态常量
- `pinned` 与 `recent` 放入 `settings` store
- 最近使用只记录轻量元信息，不新增单独 IndexedDB store

### 交互原则

- 卡片样式保留现有轻量基调
- 新增搜索过滤
- 支持固定/取消固定
- 打开外链时记录最近使用

## 测试策略

第一阶段新增测试：

- selector 拆分后保持原行为
- formatter 输出稳定
- sync 状态控制逻辑稳定

第二阶段新增测试：

- `Materials` 主要交互拆分后不回归
- `Dialog` 焦点行为
- `Toast` 的可访问性属性
- 图谱页工具栏与选中节点联动
- 工具页搜索 / 固定 / 最近使用

## 风险与控制

### 风险 1：结构拆分引入隐性回归

控制方式：

- 第一阶段只做等价迁移
- 先补测试再搬函数

### 风险 2：Materials 拆分时 hover / portal 行为变化

控制方式：

- 先抽定位与开关逻辑，再抽渲染组件
- 保留当前交互模式，不一次性改交互范式

### 风险 3：可访问性修复影响现有样式

控制方式：

- 统一引入 `:focus-visible`
- 不大范围重写按钮样式

### 风险 4：图谱页改动导致用户学习成本增加

控制方式：

- 保留原有三种布局和搜索入口
- 只重组控制结构，不重做心智模型

## 实施顺序

1. 拆 `legacy/selectors` 与 `legacy/formatters`
2. 整理 sync controller / dirty state / status formatter
3. 回归测试并稳定第一阶段
4. 拆 `Materials` 页面与相关子组件
5. 做通用可访问性修复
6. 改图谱页
7. 改工具页
8. 运行 `npm run build` 与 `npm run test`

## 验收标准

- 不触碰第 3 项明确排除内容
- `Materials.tsx` 不再维持当前超大体量
- `legacy/selectors.ts` 被拆分，职责明确
- `Dialog`、toast、主要点击块具备更完整可访问性
- 图谱页控制结构更清晰
- 工具页支持搜索、固定、最近使用
- `npm run build` 和 `npm run test` 通过
