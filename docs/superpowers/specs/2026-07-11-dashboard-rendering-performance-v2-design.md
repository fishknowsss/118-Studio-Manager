# 首页流畅度深度优化设计

## 目标

解决第一阶段优化在真实观感上提升不明显的问题。保持当前首页的布局、尺寸、颜色、阴影、SVG 图标、文案、交互终态和响应式行为不变，只调整主题切换与项目焦点 Hover 的动画时序，消除持续重绘。

## 根因证据

Chromium 性能轨迹显示：

- 当前主题切换产生约 439 个 `RasterTask`，累计约 186ms，并产生约 29ms Paint。
- 单帧主题切换产生约 52 个 `RasterTask`，累计约 22ms，并产生约 3.5ms Paint。
- 当前主题切换的主要成本是 150ms 内大量元素持续进行颜色、背景、边框和阴影插值，不是 React 重渲染。
- 项目焦点 Hover 的主要成本是行背景、边框和阴影在 150ms 内重复绘制。

以下实验已否决：

- View Transition：4 倍 CPU 压力下出现约 36ms 长帧，且完整切换时间更长。
- 整行或轨道合成层：会改变文字和 SVG 抗锯齿，整行方案约有 14% 像素变化。
- layout/style containment：会改变项目焦点区域像素输出。
- 共享 SVG 滤镜：像素不同且 Raster 成本显著上升。
- 删除 `will-change: filter`：压力测试中 Raster 成本严重恶化。

## 实施方案

### 主题切换

`themeStore` 在普通主题切换前给 `document.documentElement` 添加 `theme-switching` class，同步更新 `data-theme` 与 `localStorage`，再于连续两个 `requestAnimationFrame` 后移除该 class。

CSS 在该 class 存在期间只关闭 transition，不修改 animation、颜色、尺寸或布局：

```css
html.theme-switching,
html.theme-switching *,
html.theme-switching *::before,
html.theme-switching *::after {
  transition: none !important;
}
```

连续快速切换时，新的切换会取消上一轮待执行的帧回调并重新安排清理，避免 class 提前移除。异象模式继续复用同一主题应用函数，但不额外改写用户主题偏好。

### 项目焦点 Hover

保留 `.pft-row` 当前三个过渡属性和 ease：

- `border-color`
- `background`
- `box-shadow`

只把持续时间从 `150ms` 调整为 `90ms`。Hover 普通态和终态的计算样式必须与当前版本逐项一致。

## 不变量

- 不修改任何浅色或深色颜色值。
- 不修改 `color-mix()`、边框、阴影和 SVG `drop-shadow()` 参数。
- 不修改 20px marker 尺寸、时间轴位置、网格或 today overlay。
- 不修改 Dashboard DOM、数据模型、IndexedDB 或云同步。
- 不添加 View Transition、containment、整行合成层或共享 SVG filter。
- 不添加 UI 文案、提示或实现说明。

## 测试

### 自动化

- `themeStore` 切换时立即添加 `theme-switching`。
- 连续两个动画帧后移除 class。
- 连续切换不会被旧帧回调提前清理。
- 主题偏好、订阅和异象模式行为保持不变。
- CSS 契约锁定 Hover 为 90ms，锁定颜色、阴影、marker 尺寸和滤镜参数不变。
- `npm run build`、`npm run test`、`npm run lint`。

### 浏览器

- 桌面 1280×720 与移动端视口。
- 深色、浅色、Hover 普通态与终态截图及计算样式对比。
- Chromium 原生与 4 倍 CPU 压力轨迹。
- 主题切换 Raster/Paint 数量和总耗时必须显著下降。
- 控制台无相关 warning/error，页面无框架错误覆盖层。
