# 首页渲染流畅度优化设计

## 目标

在严格保持当前 `b8f0e1e` 版本显示与交互观感的前提下，降低首页深浅主题切换和“项目焦点”时间轴 Hover 的主线程、样式计算与绘制开销。

当前版本是唯一视觉基准。以下内容均不得改变：

- 页面布局、尺寸、间距和响应式断点
- 浅色与深色模式的颜色、透明度、边框和阴影
- 项目焦点 SVG 图标的尺寸、位置和四层 `drop-shadow()` 参数
- Hover、Focus 和主题切换的动画属性、时长及缓动
- 文案、DOM 可访问名称和用户操作路径

## 已确认的性能根因

1. `theme` 位于 `App` 顶层 React state。切换主题时，`App` 及其可见页面子树会重新执行渲染，即使首页数据没有变化。
2. 当前首页约有 838 个 DOM 元素，其中约 93 个元素带 CSS transition。根主题属性变化会触发较大范围的样式计算和绘制。
3. 项目焦点当前有 12 个 SVG 标记，每个标记使用四层 `drop-shadow()`。项目行背景和边框在 Hover 过渡期间变化时，这些滤镜区域容易参与重复绘制。
4. 真实浏览器基线中，主题切换并强制读取最终布局状态的单次耗时约为 292–480ms。

## 方案

### 1. 主题状态隔离

新增独立主题 store，负责：

- 从 `localStorage` 读取并保存用户主题偏好
- 直接更新 `document.documentElement[data-theme]`
- 仅通知需要显示主题名称的侧栏按钮
- 保持异象模式强制浅色、退出后恢复用户偏好的现有行为

`App` 不再订阅普通主题切换，因此切换主题不会触发整个页面 React 树重渲染。主题 store 不添加“关闭 transition”类名，也不改变任何现有 CSS 动画。

### 2. React 渲染边界

- 使用 `memo` 固定无 props 的 `Dashboard` 边界，避免侧栏局部状态变化重新执行首页渲染。
- 使用 `memo` 固定 `ProjectFocusTimeline`，仅在时间轴模型或打开项目回调实际变化时重新渲染。
- 保持现有 selector、数据流和 DOM 结构不变，不引入新的业务状态或抽象。

### 3. 项目焦点渲染隔离

- 在不裁剪溢出内容的前提下，为时间轴和轨道增加安全的 layout/style containment。
- 对已有 SVG 滤镜使用 `will-change: filter` 合成提示，使 12 个小型滤镜元素更容易保留独立缓存层。
- 不使用 `contain: paint`，避免裁剪当前阴影光晕。
- 不使用 `translateZ(0)`，避免文字或 SVG 的抗锯齿观感变化。
- 不修改任何现有颜色、滤镜、阴影、尺寸或 transition 声明。

## 组件与数据流

```text
ThemeStore
├─ localStorage theme preference
├─ html[data-theme]
└─ FooterModeButton subscriber

App
└─ memo(Dashboard)
   ├─ DashboardHeader
   ├─ today-focus
   │  └─ memo(ProjectFocusTimeline)
   │     ├─ axis
   │     ├─ today overlay
   │     └─ project rows and SVG markers
   └─ lower dashboard panels
```

主题切换链路变为：

```text
点击侧栏主题按钮
→ ThemeStore 更新偏好
→ 同步写入 html[data-theme] 与 localStorage
→ 仅通知 FooterModeButton 更新文案和图标
→ 浏览器按现有 CSS 完成主题过渡
```

## 测试与验收

### 自动化测试

- 主题偏好的读取、写入和非法值回退
- 主题订阅与取消订阅
- 异象模式进入和退出后的主题恢复
- 切换主题时不触发 Dashboard 重新渲染
- 项目焦点现有结构、图标和样式契约保持不变
- `npm run build`
- `npm run test`

### 真实浏览器验证

- 使用同一 URL、同一 IndexedDB 数据和同一桌面视口复测
- 检查页面标题、非空内容、错误覆盖层和控制台错误
- 对比浅色、深色及项目行 Hover 状态
- 对关键节点比较布局矩形和计算样式指纹
- 使用与基线相同的八次交替主题切换测量流程复测

任何可见差异、交互差异或无明确收益的渲染提示都必须移除，不以主观“接近一致”作为验收。

## 范围限制

- 不修改业务数据、IndexedDB、云同步或 Cloudflare 配置
- 不修改首页文案和交互功能
- 不重写 SVG 图标或滤镜视觉实现
- 不顺带重构无关页面
