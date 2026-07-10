# 项目焦点阶段标识优化实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将首页项目焦点时间轴的开始、审查、交付标识改成语义清晰的 Lucide 线型图标（开工旗、审查眼、交付包裹）。

**Architecture:** 保留现有时间轴模型与布局，只替换 `ProjectFocusTimeline` 的标识渲染和对应 CSS。图标使用 Lucide（项目已有标准图标库），不改变数据与点击行为；样式沿用 20px + 描边 halo。

**Tech Stack:** React 19、TypeScript、纯 CSS、Vitest、lucide-react

---

### Task 1: 固化阶段标识语义

**Files:**
- Modify: `tests/dashboard-panels.test.tsx`
- Test: `tests/dashboard-panels.test.tsx`

- [ ] **Step 1: Write the failing test**

将阶段标识断言改为：开始标识包含 `data-pft-marker-icon="start"` 且文案为“开始”；审查标识包含 `data-pft-marker-icon="review"` 且文案为“审查”；交付标识包含 `data-pft-marker-icon="delivery"` 且文案为“交付”。

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/dashboard-panels.test.tsx`

Expected: FAIL，旧实现仍显示“开 / 审 / 交”，且没有新的图标标识属性。

### Task 2: 替换图标与视觉样式

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `src/features/dashboard/ProjectFocusTimeline.tsx`
- Modify: `css/style.css`
- Test: `tests/dashboard-panels.test.tsx`

- [x] **Step 1: Use the project icon dependency**

项目已使用 `lucide-react`，无需再装 Phosphor。

- [x] **Step 2: Implement the markers**

从 `lucide-react` 导入语义图标：`Flag`（开始）、`Eye`（审查）、`PackageCheck`（交付）；三处图标均设为装饰性，并保留 `title`。CSS 统一 20px 尺寸、描边 halo 与深色模式表现。

- [ ] **Step 3: Run the focused test**

Run: `npm run test -- tests/dashboard-panels.test.tsx`

Expected: PASS。

### Task 3: 完整验证与本地页面刷新

**Files:**
- Verify: `src/features/dashboard/ProjectFocusTimeline.tsx`
- Verify: `css/style.css`

- [ ] **Step 1: Run required checks**

Run: `npm run build && npm run test`

Expected: 两条命令均退出码 0。

- [ ] **Step 2: Verify the existing local page**

在 `http://127.0.0.1:5173/` 刷新首页，核对浅色与深色模式中的三种图标、完整字样、时间轴对齐、控制台错误以及项目行点击交互。
