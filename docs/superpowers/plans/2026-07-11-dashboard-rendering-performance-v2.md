# Dashboard Rendering Performance V2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 通过单帧主题切换和 90ms 项目焦点 Hover，消除首页持续重绘，同时保持所有静态视觉与交互终态不变。

**Architecture:** `themeStore` 负责在主题更新前后维护短生命周期的 `html.theme-switching` class，CSS 只在该 class 存在时关闭 transition。项目焦点保留现有三个 Hover 属性和所有视觉值，只缩短持续时间。

**Tech Stack:** React 19、TypeScript 6、CSS、Vitest、jsdom、Playwright Chromium、Chrome DevTools Protocol

---

## 文件结构

- Modify: `src/features/theme/themeStore.ts` — 管理主题切换 class 与双动画帧清理
- Modify: `tests/theme-store.test.ts` — 验证添加、清理和连续切换时序
- Modify: `css/style.css` — 增加主题切换 transition 抑制规则，并将 `.pft-row` 改为 90ms
- Modify: `tests/dashboard-theme.test.ts` — 锁定 transition 抑制范围和项目焦点视觉契约

### Task 1: 单帧主题切换

**Files:**
- Modify: `tests/theme-store.test.ts`
- Modify: `src/features/theme/themeStore.ts`
- Modify: `tests/dashboard-theme.test.ts`
- Modify: `css/style.css`

- [ ] **Step 1: 写主题切换时序失败测试**

在 `tests/theme-store.test.ts` 中使用可控动画帧队列：

```ts
let animationFrameId = 0
let animationFrames = new Map<number, FrameRequestCallback>()

function runNextAnimationFrame() {
  const next = animationFrames.entries().next().value as [number, FrameRequestCallback] | undefined
  if (!next) return
  animationFrames.delete(next[0])
  next[1](performance.now())
}

beforeEach(() => {
  animationFrames = new Map()
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    animationFrameId += 1
    animationFrames.set(animationFrameId, callback)
    return animationFrameId
  })
  vi.stubGlobal('cancelAnimationFrame', (id: number) => {
    animationFrames.delete(id)
  })
  document.documentElement.classList.remove('theme-switching')
})
```

新增两个测试：

```ts
it('suppresses transitions until two animation frames complete', () => {
  setTheme('dark')
  expect(document.documentElement.classList.contains('theme-switching')).toBe(true)

  runNextAnimationFrame()
  expect(document.documentElement.classList.contains('theme-switching')).toBe(true)

  runNextAnimationFrame()
  expect(document.documentElement.classList.contains('theme-switching')).toBe(false)
})

it('restarts transition suppression during rapid toggles', () => {
  setTheme('dark')
  runNextAnimationFrame()
  toggleTheme()

  expect(document.documentElement.classList.contains('theme-switching')).toBe(true)
  expect(animationFrames.size).toBe(1)

  runNextAnimationFrame()
  runNextAnimationFrame()
  expect(document.documentElement.classList.contains('theme-switching')).toBe(false)
})
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `npm run test -- tests/theme-store.test.ts`

Expected: FAIL，`theme-switching` 尚未添加。

- [ ] **Step 3: 实现双动画帧清理**

在 `themeStore.ts` 增加：

```ts
const THEME_SWITCHING_CLASS = 'theme-switching'
let switchingFrameOne: number | null = null
let switchingFrameTwo: number | null = null

function cancelSwitchingFrames() {
  if (typeof cancelAnimationFrame === 'function') {
    if (switchingFrameOne !== null) cancelAnimationFrame(switchingFrameOne)
    if (switchingFrameTwo !== null) cancelAnimationFrame(switchingFrameTwo)
  }
  switchingFrameOne = null
  switchingFrameTwo = null
}

function beginThemeSwitching() {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  root.classList.add(THEME_SWITCHING_CLASS)
  cancelSwitchingFrames()
  if (typeof requestAnimationFrame !== 'function') {
    root.classList.remove(THEME_SWITCHING_CLASS)
    return
  }
  switchingFrameOne = requestAnimationFrame(() => {
    switchingFrameOne = null
    switchingFrameTwo = requestAnimationFrame(() => {
      switchingFrameTwo = null
      root.classList.remove(THEME_SWITCHING_CLASS)
    })
  })
}
```

在 `setTheme` 确认主题实际变化后、写入 `theme` 前调用 `beginThemeSwitching()`。`hydrateThemeFromStorage()` 不调用，避免首屏改变现有行为。`setEasterThemeOverride()` 仅在 effective theme 实际变化时调用。

- [ ] **Step 4: 写 CSS 抑制范围失败测试**

在 `tests/dashboard-theme.test.ts` 新增：

```ts
it('disables only transitions during an active theme switch', () => {
  expect(stylesheet).toMatch(/html\.theme-switching,[\s\S]*html\.theme-switching \*::after[\s\S]*transition:\s*none !important;/)
  expect(stylesheet).not.toMatch(/theme-switching[\s\S]{0,300}animation-duration:/)
})
```

- [ ] **Step 5: 运行 CSS 测试并确认失败**

Run: `npm run test -- tests/dashboard-theme.test.ts -t "active theme switch"`

Expected: FAIL，尚无 `theme-switching` CSS。

- [ ] **Step 6: 增加最小 CSS 规则**

```css
html.theme-switching,
html.theme-switching *,
html.theme-switching *::before,
html.theme-switching *::after {
  transition: none !important;
}
```

- [ ] **Step 7: 运行主题相关测试**

Run: `npm run test -- tests/theme-store.test.ts tests/konami-mode.test.tsx tests/dashboard-theme.test.ts`

Expected: PASS。

- [ ] **Step 8: 提交主题切换优化**

```bash
git add src/features/theme/themeStore.ts css/style.css tests/theme-store.test.ts tests/dashboard-theme.test.ts
git commit -m "perf: eliminate theme transition repainting"
```

### Task 2: 90ms 项目焦点 Hover

**Files:**
- Modify: `tests/dashboard-theme.test.ts`
- Modify: `css/style.css`

- [ ] **Step 1: 写 Hover 视觉契约失败测试**

```ts
it('keeps project focus hover visual values with a 90ms response', () => {
  const rowRule = stylesheet.match(/\n\.pft-row\s*\{[\s\S]*?\n\}/)?.[0] ?? ''
  const hoverRule = stylesheet.match(/\n\.pft-row:hover,[\s\S]*?\n\}/)?.[0] ?? ''

  expect(rowRule).toMatch(/transition:\s*border-color \.09s ease, background \.09s ease, box-shadow \.09s ease;/)
  expect(hoverRule).toMatch(/background:\s*color-mix\(in srgb, var\(--pft-accent\) 5\.5%, var\(--c-surface\)\);/)
  expect(hoverRule).toMatch(/border-color:\s*color-mix\(in srgb, var\(--pft-accent\) 36%, var\(--c-border\)\);/)
  expect(hoverRule).toMatch(/box-shadow:\s*0 1px 4px rgba\(15, 23, 42, \.04\);/)
})
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `npm run test -- tests/dashboard-theme.test.ts -t "90ms response"`

Expected: FAIL，当前仍为 `.15s`。

- [ ] **Step 3: 只修改持续时间**

将 `.pft-row` 的 transition 改为：

```css
transition: border-color .09s ease, background .09s ease, box-shadow .09s ease;
```

不得修改普通态、Hover 态、深色覆盖或 marker 规则。

- [ ] **Step 4: 运行 Dashboard 测试**

Run: `npm run test -- tests/dashboard-theme.test.ts tests/dashboard-panels.test.tsx`

Expected: PASS。

- [ ] **Step 5: 提交 Hover 优化**

```bash
git add css/style.css tests/dashboard-theme.test.ts
git commit -m "perf: shorten project focus hover repaint"
```

### Task 3: 完整验证

**Files:**
- Verify only

- [ ] **Step 1: 运行完整静态验证**

Run: `npm run build && npm run test && npm run lint`

Expected: build 成功、全部测试通过、lint 零错误。

- [ ] **Step 2: 运行真实浏览器回归**

检查桌面 1280×720 和移动端视口的页面身份、非空 DOM、错误覆盖层、控制台、主题按钮和项目焦点 Hover。

- [ ] **Step 3: 运行性能轨迹**

分别录制原生速度与 4 倍 CPU 压力下的主题切换和四行 Hover，报告 RasterTask、Paint、最大帧间隔与操作耗时。主题切换 Raster/Paint 必须较当前基线显著下降。

- [ ] **Step 4: 比较视觉**

对深色、浅色、Hover 普通态和终态比较布局矩形、计算样式与区域截图。允许动画时序差异，不允许终态样式差异。

- [ ] **Step 5: 自查禁止模式**

确认未加入 View Transition、containment、整行合成层、共享 SVG filter、视觉替换、UI 说明或无关重构。
