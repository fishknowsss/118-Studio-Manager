# Structure Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 拆薄 Dashboard、Projects、Tasks、People 页面，把展示拼装下沉到 selector，并补齐对应测试。

**Architecture:** 页面保留状态、事件和对话框装配，展示组件迁移到 `src/features/*`。展示数据通过 `src/legacy/selectors.ts` 统一生成，测试先锁定 selector 输出和 view 结构，再做最小实现。

**Tech Stack:** React 19、TypeScript、Vitest、ESLint、Vite

---

### Task 1: Lock The Selector Contracts

**Files:**
- Modify: `tests/store-selectors.test.ts`
- Modify: `src/legacy/selectors.ts`

- [ ] **Step 1: Write the failing test**
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Write minimal implementation**
- [ ] **Step 4: Run test to verify it passes**

### Task 2: Lock The Structural Splits

**Files:**
- Modify: `tests/current-app-regressions.test.tsx`
- Create: `src/features/dashboard/DashboardHeader.tsx`
- Create: `src/features/dashboard/DashboardMiniCalendar.tsx`
- Create: `src/features/projects/ProjectCard.tsx`
- Create: `src/features/projects/ProjectTimeline.tsx`
- Create: `src/features/tasks/TaskItem.tsx`
- Create: `src/features/people/PersonCard.tsx`

- [ ] **Step 1: Write the failing regression assertions**
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Create the component files and update imports**
- [ ] **Step 4: Run test to verify it passes**

### Task 3: Refactor Dashboard

**Files:**
- Modify: `src/views/Dashboard.tsx`
- Modify: `src/legacy/selectors.ts`
- Modify: `tests/store-selectors.test.ts`

- [ ] **Step 1: Replace inline dashboard header and calendar rendering with selector-backed components**
- [ ] **Step 2: Keep drag/drop and planner navigation in the page**
- [ ] **Step 3: Re-run focused tests**

### Task 4: Refactor Projects, Tasks, and People

**Files:**
- Modify: `src/views/Projects.tsx`
- Modify: `src/views/Tasks.tsx`
- Modify: `src/views/People.tsx`
- Modify: `src/legacy/selectors.ts`
- Modify: `tests/store-selectors.test.ts`

- [ ] **Step 1: Switch pages to selector-built display models**
- [ ] **Step 2: Move list/timeline item rendering into feature components**
- [ ] **Step 3: Re-run focused tests**

### Task 5: Verify The Whole Slice

**Files:**
- Modify: `src/index.css` (only if required by extracted components)

- [ ] **Step 1: Run `npm test`**
- [ ] **Step 2: Run `npm run lint`**
- [ ] **Step 3: Run `npm run build`**
- [ ] **Step 4: Self-check against AGENTS UI rules**
