# Dashboard Today Split Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把今日页下半区改成任务池与人员左右分区，并把人员改为 3x5 小卡片区且支持双向拖拽分配。

**Architecture:** 保持 `Dashboard` 负责状态和拖拽语义，任务池与人员区继续拆成独立组件。人员区新增卡片子组件，复用 selector 生成展示数据，样式层完成三栏外框和 3x5 卡片槽位布局。

**Tech Stack:** React 19、TypeScript、Vitest、现有全局 CSS

---

### Task 1: Add Regression Tests For Dashboard Panels

**Files:**
- Create: `tests/dashboard-panels.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
it('renders people assignment as a 3x5 card grid with reserved slots', () => {
  // render PeopleAssignmentPanel with 2 people
  // expect 2 real cards + 13 placeholders
})

it('keeps task rows and people cards wired for two-way assignment drag targets', () => {
  // render both panels with drag target state
  // expect highlighted drop target and drop handler calls
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/dashboard-panels.test.tsx`
Expected: FAIL because the current dashboard panels do not expose the new card grid and two-way drop behavior.

- [ ] **Step 3: Write minimal implementation**

```tsx
// Update dashboard panel components and drag state
// to satisfy the new render and drop expectations.
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/dashboard-panels.test.tsx`
Expected: PASS

### Task 2: Rebuild Dashboard Bottom Layout

**Files:**
- Modify: `src/views/Dashboard.tsx`
- Modify: `css/style.css`

- [ ] **Step 1: Wire drag state for task->person and person->task**

```tsx
const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null)
const [draggingPersonId, setDraggingPersonId] = useState<string | null>(null)
const [dropOverPersonId, setDropOverPersonId] = useState<string | null>(null)
const [dropOverTaskId, setDropOverTaskId] = useState<string | null>(null)
```

- [ ] **Step 2: Reshape the lower dashboard layout into task panel, people panel, and calendar**

Run: `npm test -- tests/dashboard-panels.test.tsx`
Expected: PASS with layout props and drag handlers flowing into both panels.

### Task 3: Convert People Panel To Reserved Card Grid

**Files:**
- Modify: `src/features/dashboard/PeopleAssignmentPanel.tsx`
- Create: `src/features/dashboard/PersonAssignmentCard.tsx`
- Modify: `css/style.css`

- [ ] **Step 1: Render real person cards from selector-backed models**

```tsx
<PersonAssignmentCard model={person} draggable />
```

- [ ] **Step 2: Render placeholders until the grid reaches 15 slots**

```tsx
Array.from({ length: Math.max(0, 15 - people.length) })
```

- [ ] **Step 3: Keep drop target styling state-driven**

Run: `npm test -- tests/dashboard-panels.test.tsx`
Expected: PASS

### Task 4: Make Task Rows Accept Person Drops

**Files:**
- Modify: `src/features/dashboard/TaskPoolPanel.tsx`
- Modify: `css/style.css`

- [ ] **Step 1: Keep task rows draggable as before**

```tsx
<div className="task-row" draggable onDragStart={...} />
```

- [ ] **Step 2: Add task-row drop target handling for dragged people**

```tsx
onDragOver={(event) => onDragOverTask(event, task.id)}
onDrop={(event) => onDropToTask(event, task.id)}
```

- [ ] **Step 3: Verify drag highlight class is applied by state**

Run: `npm test -- tests/dashboard-panels.test.tsx`
Expected: PASS
