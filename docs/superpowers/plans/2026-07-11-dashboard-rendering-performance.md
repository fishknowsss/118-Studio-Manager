# Dashboard Rendering Performance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不改变当前视觉、DOM 可访问语义和动画参数的前提下，隔离主题更新并降低首页项目焦点的重复渲染与滤镜重绘成本。

**Architecture:** 使用独立 external store 管理主题偏好和根节点 `data-theme`，仅让侧栏主题按钮订阅变化；Dashboard 与项目焦点时间轴建立 React memo 边界。CSS 只增加 SVG 滤镜合成提示，现有布局和视觉声明原样保留。

**Tech Stack:** React 19、TypeScript 6、CSS、Vitest、jsdom、Vite、内置浏览器

---

## 文件结构

- Create: `src/features/theme/themeStore.ts` — 主题偏好、DOM 应用、订阅与异象模式覆盖的唯一职责
- Create: `tests/theme-store.test.ts` — 主题 store 的状态、持久化、订阅和覆盖行为
- Modify: `src/App.tsx` — 移除顶层主题 state，只让侧栏按钮订阅主题 store
- Modify: `tests/konami-mode.test.tsx` — 证明普通主题切换不再重渲染 Dashboard，且异象模式行为不变
- Modify: `src/views/Dashboard.tsx` — 建立首页 memo 边界和稳定的项目展开回调
- Modify: `src/features/dashboard/ProjectFocusTimeline.tsx` — 建立时间轴 memo 边界
- Modify: `tests/current-app-regressions.test.tsx` — 固定首页与时间轴渲染边界契约
- Modify: `css/style.css` — 增加 SVG filter 合成提示
- Modify: `tests/dashboard-theme.test.ts` — 固定渲染提示并防止视觉声明被替换

### Task 1: 主题 external store

**Files:**
- Create: `tests/theme-store.test.ts`
- Create: `src/features/theme/themeStore.ts`

- [ ] **Step 1: 写主题 store 的失败测试**

测试必须覆盖读取、非法值回退、订阅、取消订阅和异象覆盖：

```ts
// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getTheme,
  hydrateThemeFromStorage,
  setEasterThemeOverride,
  setTheme,
  subscribeTheme,
  toggleTheme,
} from '../src/features/theme/themeStore'

describe('theme store', () => {
  beforeEach(() => {
    localStorage.clear()
    setEasterThemeOverride(false)
    hydrateThemeFromStorage()
  })

  it('hydrates valid preferences and falls back to light', () => {
    localStorage.setItem('theme', 'dark')
    hydrateThemeFromStorage()
    expect(getTheme()).toBe('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')

    localStorage.setItem('theme', 'invalid')
    hydrateThemeFromStorage()
    expect(getTheme()).toBe('light')
    expect(document.documentElement.dataset.theme).toBe('light')
  })

  it('persists changes and only notifies active subscribers', () => {
    const listener = vi.fn()
    const unsubscribe = subscribeTheme(listener)
    setTheme('dark')
    expect(localStorage.getItem('theme')).toBe('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(listener).toHaveBeenCalledTimes(1)

    unsubscribe()
    toggleTheme()
    expect(getTheme()).toBe('light')
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('temporarily forces light without changing the preference', () => {
    setTheme('dark')
    setEasterThemeOverride(true)
    expect(document.documentElement.dataset.theme).toBe('light')
    expect(localStorage.getItem('theme')).toBe('dark')

    setEasterThemeOverride(false)
    expect(document.documentElement.dataset.theme).toBe('dark')
  })
})
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `npm run test -- tests/theme-store.test.ts`

Expected: FAIL，提示无法解析 `src/features/theme/themeStore`。

- [ ] **Step 3: 实现最小主题 store**

实现 `AppTheme`、`getTheme`、`getServerThemeSnapshot`、`subscribeTheme`、`hydrateThemeFromStorage`、`setTheme`、`toggleTheme` 和 `setEasterThemeOverride`。实现不得添加关闭 transition 的 class、timer 或动画覆盖：

```ts
export type AppTheme = 'light' | 'dark'

const listeners = new Set<() => void>()
let theme: AppTheme = readStoredTheme()
let easterForcesLight = false

function readStoredTheme(): AppTheme {
  try {
    return localStorage.getItem('theme') === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

function applyDocumentTheme() {
  document.documentElement.dataset.theme = easterForcesLight ? 'light' : theme
}

export function getTheme() { return theme }
export function getServerThemeSnapshot(): AppTheme { return 'light' }
export function subscribeTheme(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
export function hydrateThemeFromStorage() {
  const next = readStoredTheme()
  const changed = next !== theme
  theme = next
  applyDocumentTheme()
  if (changed) listeners.forEach((listener) => listener())
}
export function setTheme(next: AppTheme | ((current: AppTheme) => AppTheme)) {
  const resolved = typeof next === 'function' ? next(theme) : next
  if (resolved === theme) return
  theme = resolved
  try { localStorage.setItem('theme', theme) } catch { /* storage unavailable */ }
  applyDocumentTheme()
  listeners.forEach((listener) => listener())
}
export function toggleTheme() { setTheme((current) => current === 'dark' ? 'light' : 'dark') }
export function setEasterThemeOverride(active: boolean) {
  easterForcesLight = active
  applyDocumentTheme()
}
```

- [ ] **Step 4: 运行主题 store 测试**

Run: `npm run test -- tests/theme-store.test.ts`

Expected: PASS，3 tests passed。

- [ ] **Step 5: 提交主题 store**

```bash
git add src/features/theme/themeStore.ts tests/theme-store.test.ts
git commit -m "perf: isolate theme preference updates"
```

### Task 2: App 主题更新范围隔离

**Files:**
- Modify: `tests/konami-mode.test.tsx:36-45,109-197`
- Modify: `src/App.tsx:1-13,52-106,231-310`

- [ ] **Step 1: 写 Dashboard 不重渲染的失败测试**

把 Dashboard mock 改为调用 hoisted spy，并新增普通主题切换测试：

```ts
const { dashboardRenderSpy } = vi.hoisted(() => ({ dashboardRenderSpy: vi.fn() }))

vi.mock('../src/views/Dashboard', () => ({
  Dashboard() {
    dashboardRenderSpy()
    return <div><input aria-label="首页搜索" /><div>Dashboard</div></div>
  },
}))

it('switches the normal theme without rerendering the dashboard', async () => {
  const view = await renderApp()
  const rendersBefore = dashboardRenderSpy.mock.calls.length
  const button = Array.from(view.container.querySelectorAll('button'))
    .find((item) => item.textContent?.includes('深色模式'))

  await act(async () => {
    button?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })

  expect(document.documentElement.dataset.theme).toBe('dark')
  expect(localStorage.getItem('theme')).toBe('dark')
  expect(view.container.textContent).toContain('浅色模式')
  expect(dashboardRenderSpy).toHaveBeenCalledTimes(rendersBefore)
  view.cleanup()
})
```

在 `beforeEach` 中加入 `dashboardRenderSpy.mockClear()`。

- [ ] **Step 2: 运行测试并确认失败**

Run: `npm run test -- tests/konami-mode.test.tsx -t "without rerendering"`

Expected: FAIL，Dashboard render 次数增加。

- [ ] **Step 3: 将 App 接入主题 store**

- 从 React 导入 `useSyncExternalStore`。
- 移除 `App` 的 `theme` state 和两个主题 effect。
- 挂载时调用 `hydrateThemeFromStorage()`。
- 在异象 effect 中调用 `setEasterThemeOverride(easterMode)`，cleanup 调用 `setEasterThemeOverride(false)`。
- `FooterModeButton` 内使用：

```ts
const theme = useSyncExternalStore(subscribeTheme, getTheme, getServerThemeSnapshot)
```

- 普通模式按钮直接使用 `toggleTheme`，不再从 `App` 接收 `theme` 和 `onToggleTheme` props。
- 保留当前 SVG、按钮 class、文案条件和异象退出回调不变。

- [ ] **Step 4: 运行主题和异象测试**

Run: `npm run test -- tests/theme-store.test.ts tests/konami-mode.test.tsx`

Expected: PASS，新增测试以及现有异象模式测试全部通过。

- [ ] **Step 5: 提交 App 隔离**

```bash
git add src/App.tsx tests/konami-mode.test.tsx
git commit -m "perf: avoid app rerender on theme toggle"
```

### Task 3: 首页与时间轴 React 边界

**Files:**
- Modify: `tests/current-app-regressions.test.tsx`
- Modify: `src/views/Dashboard.tsx:1,65,286-301`
- Modify: `src/features/dashboard/ProjectFocusTimeline.tsx:1,14,183`

- [ ] **Step 1: 写渲染边界失败测试**

在 source regression 测试中新增：

```ts
it('keeps dashboard and project focus behind stable render boundaries', () => {
  const dashboardSource = readFileSync(join(process.cwd(), 'src/views/Dashboard.tsx'), 'utf8')
  const timelineSource = readFileSync(join(process.cwd(), 'src/features/dashboard/ProjectFocusTimeline.tsx'), 'utf8')

  expect(dashboardSource).toMatch(/export const Dashboard = memo\(function Dashboard\(\)/)
  expect(dashboardSource).toMatch(/const openProjectPanel = useCallback/)
  expect(dashboardSource).toMatch(/onExpandProject=\{openProjectPanel\}/)
  expect(timelineSource).toMatch(/export const ProjectFocusTimeline = memo\(function ProjectFocusTimeline/)
})
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `npm run test -- tests/current-app-regressions.test.tsx -t "stable render boundaries"`

Expected: FAIL，尚未出现 memo 与稳定回调。

- [ ] **Step 3: 实现稳定边界**

- Dashboard 导入 `memo`、`useCallback`。
- 改为 `export const Dashboard = memo(function Dashboard() { ... })`。
- 增加：

```ts
const openProjectPanel = useCallback((id: string, ox: number, oy: number) => {
  setExpandedPanel({ type: 'project', projectId: id, ox, oy })
}, [])
```

- 将时间轴的 inline callback 替换为 `onExpandProject={openProjectPanel}`。
- `ProjectFocusTimeline` 导入 `memo`，改为 `export const ProjectFocusTimeline = memo(function ProjectFocusTimeline(...) { ... })`。
- 不改变 JSX 内容、条件分支、key、可访问名称或 marker 尺寸。

- [ ] **Step 4: 运行相关测试**

Run: `npm run test -- tests/current-app-regressions.test.tsx tests/dashboard-panels.test.tsx`

Expected: PASS。

- [ ] **Step 5: 提交 React 边界**

```bash
git add src/views/Dashboard.tsx src/features/dashboard/ProjectFocusTimeline.tsx tests/current-app-regressions.test.tsx
git commit -m "perf: stabilize dashboard render boundaries"
```

### Task 4: 项目焦点渲染隔离

**Files:**
- Modify: `tests/dashboard-theme.test.ts`
- Modify: `css/style.css:1369-1380,1659-1667,1728-1740`

- [ ] **Step 1: 写 CSS 性能契约失败测试**

```ts
it('isolates project focus rendering without changing its visual declarations', () => {
  const timelineRule = stylesheet.match(/\.project-focus-timeline\s*\{[\s\S]*?\n\}/)?.[0] ?? ''
  const trackRule = stylesheet.match(/\.pft-track\s*\{[\s\S]*?\n\}/)?.[0] ?? ''
  const markerRule = stylesheet.match(/\.pft-marker-glyph\s*\{[\s\S]*?\n\}/)?.[0] ?? ''

  expect(timelineRule).not.toMatch(/contain:/)
  expect(trackRule).not.toMatch(/contain:/)
  expect(markerRule).toMatch(/will-change:\s*filter;/)
  expect(markerRule).toMatch(/width:\s*20px;/)
  expect(markerRule).toMatch(/height:\s*20px;/)
  expect(markerRule).toMatch(/drop-shadow\(0 0 0\.75px #ffffff\)/)
  expect(stylesheet).not.toMatch(/theme-switching/)
})
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `npm run test -- tests/dashboard-theme.test.ts -t "isolates project focus"`

Expected: FAIL，缺少 `will-change`。

- [ ] **Step 3: 添加不改变视觉值的渲染提示**

只增加以下声明：

```css
.pft-marker-glyph { will-change: filter; }
```

不得增加 containment，也不得修改相邻的 background、border、box-shadow、filter、transition、尺寸或 overflow。

- [ ] **Step 4: 运行 CSS 与 Dashboard 测试**

Run: `npm run test -- tests/dashboard-theme.test.ts tests/dashboard-panels.test.tsx`

Expected: PASS。

- [ ] **Step 5: 提交渲染隔离**

```bash
git add css/style.css tests/dashboard-theme.test.ts
git commit -m "perf: isolate project focus rendering"
```

### Task 5: 完整验证与浏览器回归

**Files:**
- Verify only

- [ ] **Step 1: 运行完整静态验证**

Run: `npm run build`

Expected: TypeScript 与 Vite build 成功。

Run: `npm run test`

Expected: 全部 Vitest 测试通过。

- [ ] **Step 2: 运行同一真实浏览器流程**

流程：`/#dashboard` → 浅色 → 深色 → 交替切换八次 → Hover 首个项目焦点行。

检查：页面标题、非空 DOM、无框架错误覆盖层、控制台无错误、按钮文案随主题变化、项目行 Hover 正常。

- [ ] **Step 3: 比较视觉指纹**

对 `.dashboard`、`.today-focus`、`.project-focus-timeline`、`.pft-row`、`.pft-track`、`.pft-bar`、`.pft-marker-glyph` 和 `.focus-section-header` 比较优化前后：

- 布局矩形完全一致
- background、border、shadow、filter、尺寸、transform、transition 完全一致
- 仅允许 `will-change` 这一项预期计算样式差异

- [ ] **Step 4: 比较性能基线**

使用与优化前相同的八次主题切换和强制最终样式读取流程，报告每次结果、范围和中位数。若结果没有明确改善，分别撤销无收益的渲染提示，保留已被测试证明可减少 React 更新范围的主题隔离。

- [ ] **Step 5: 自查禁止模式**

确认：

- 没有 UI 实现说明、额外小字或新文案
- 没有改变颜色、阴影、尺寸、Hover 或 transition
- 没有 `theme-switching`、关闭动画或 SVG 视觉替换
- 没有修改业务、IndexedDB、同步或其他页面功能
