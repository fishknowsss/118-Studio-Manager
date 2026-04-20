# Dashboard Person Status Ordering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为首页人员区增加可云同步的手动排序、右键状态切换、在岗自动前置和带移动过渡的在岗/请假状态显示。

**Architecture:** 复用现有 `settings` 同步存储保存首页人员区的排序与在岗记忆；请假继续走 `leaveRecords`。首页人员卡保持整卡拖拽，通过目标类型区分任务分配、日历请假和人员重排；重排动画在人员面板内用 FLIP 方式完成，避免网格重排时生硬跳变。在岗状态用同排 AirPlay 风格 SVG 和 `#29dfd3` 边框强化显示，并在排序时自动前置；请假继续保留灰掉状态。

**Tech Stack:** React 19、TypeScript、Vitest、现有 `ContextMenu` / `syncableSettings` / IndexedDB 封装。

---

### Task 1: 持久化首页人员排序与在岗状态

**Files:**
- Create: `src/features/dashboard/personPanelState.ts`
- Modify: `src/features/persistence/syncableViewState.ts`
- Modify: `src/legacy/selectors.ts`
- Test: `tests/dashboard-person-panel-state.test.ts`
- Test: `tests/store-selectors.test.ts`

- [ ] **Step 1: 写失败测试，锁定 syncable state 与 selector 行为**

```ts
it('persists order and presence as syncable settings records', async () => {
  writeDashboardPersonOrder(['person-2', 'person-1'])
  await flushMicrotasks()

  writeDashboardPersonPresence('person-1', 'present')
  await flushMicrotasks()

  expect(readDashboardPersonPanelState()).toEqual({
    order: ['person-2', 'person-1'],
    presenceByPersonId: { 'person-1': 'present' },
  })
})

it('keeps manual dashboard people order while exposing present markers and leave overrides', () => {
  const models = buildPersonCardModels(people, tasks, new Set(['person-2']), {
    order: ['person-3', 'person-1', 'person-2'],
    presenceByPersonId: { 'person-1': 'present', 'person-2': 'present' },
  })

  expect(models.map((item) => item.id)).toEqual(['person-3', 'person-1', 'person-2'])
  expect(models[1]?.isPresent).toBe(true)
  expect(models[2]?.isOnLeaveToday).toBe(true)
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- tests/dashboard-person-panel-state.test.ts tests/store-selectors.test.ts`

Expected: FAIL，提示 `personPanelState` 不存在或 `buildPersonCardModels` 不支持首页排序/在岗偏好。

- [ ] **Step 3: 写最小实现**

```ts
export type DashboardPersonPanelState = {
  order: string[]
  presenceByPersonId: Record<string, 'present'>
}

const dashboardPersonPanelStore = createSyncableSettingsStore<DashboardPersonPanelState>({
  key: 'dashboard:people-panel',
  emptyValue: { order: [], presenceByPersonId: {} },
  sanitize: sanitizeDashboardPersonPanelState,
})
```

```ts
export function buildPersonCardModels(
  people: LegacyPerson[],
  tasks: LegacyTask[],
  leavePersonIdsToday = new Set<string>(),
  preferences: DashboardPersonPanelPreferences = {},
) {
  // 先按手动顺序排已命中的人，再退回默认排序
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npm test -- tests/dashboard-person-panel-state.test.ts tests/store-selectors.test.ts`

Expected: PASS

- [ ] **Step 5: 提交一个检查点**

```bash
git add tests/dashboard-person-panel-state.test.ts tests/store-selectors.test.ts src/features/dashboard/personPanelState.ts src/features/persistence/syncableViewState.ts src/legacy/selectors.ts
git commit -m "feat: persist dashboard person order and presence"
```

### Task 2: 首页人员卡拖拽排序与右键状态切换

**Files:**
- Modify: `src/views/Dashboard.tsx`
- Modify: `src/features/dashboard/PeopleAssignmentPanel.tsx`
- Modify: `src/features/dashboard/PersonAssignmentCard.tsx`
- Create: `src/features/dashboard/PersonStatusMark.tsx`
- Test: `tests/dashboard-panels.test.tsx`

- [ ] **Step 1: 写失败测试，锁定右键菜单和状态标记**

```tsx
it('shows person shortcut menu and present mark in the dashboard people panel', () => {
  const view = renderNode(
    <PeopleAssignmentPanel
      people={[{ id: 'person-1', name: '佳宁', isPresent: true, isOnLeaveToday: false, ...baseModel }]}
      draggingPersonId={null}
      draggingTaskId={null}
      onPresenceAction={onPresenceAction}
      onReorderPeople={onReorderPeople}
      onQuickLeave={onQuickLeave}
      {...rest}
    />,
  )

  expect(view.container.querySelector('.person-status-mark--present')).not.toBeNull()
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- tests/dashboard-panels.test.tsx`

Expected: FAIL，提示菜单项、在岗标记或新 props 尚未实现。

- [ ] **Step 3: 写最小实现**

```tsx
const contextItems: ContextMenuItem[] = [
  { key: 'present', label: '设为在岗', onSelect: () => onPresenceAction(person.id, 'present') },
  { key: 'leave', label: '设为请假', onSelect: () => onQuickLeave(person.id) },
  { key: 'default', label: '恢复默认', onSelect: () => onPresenceAction(person.id, 'default') },
]
```

```tsx
const incomingPersonId = draggingPersonId || readTransferData(event, 'application/x-118studio-person-id')
if (incomingPersonId && incomingPersonId !== personId) {
  event.preventDefault()
  onReorderPeople(reorderDashboardPersonIds(people.map((item) => item.id), incomingPersonId, personId))
  return
}
```

```ts
async function applyPersonPanelStatus(personId: string, next: 'present' | 'leave' | 'default') {
  // present: 清今日请假并写 presence
  // leave: 清 presence 并补今日 leave record
  // default: 两边都清
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npm test -- tests/dashboard-panels.test.tsx`

Expected: PASS

- [ ] **Step 5: 提交一个检查点**

```bash
git add tests/dashboard-panels.test.tsx src/views/Dashboard.tsx src/features/dashboard/PeopleAssignmentPanel.tsx src/features/dashboard/PersonAssignmentCard.tsx src/features/dashboard/PersonStatusMark.tsx
git commit -m "feat: add dashboard person reorder and status actions"
```

### Task 3: 重排过渡动画与完整验证

**Files:**
- Modify: `src/features/dashboard/PeopleAssignmentPanel.tsx`
- Modify: `css/style.css`
- Test: `tests/dashboard-panels.test.tsx`

- [ ] **Step 1: 写失败测试，锁定样式/标记存在**

```ts
it('keeps a dedicated status slot and reorder transition hooks in people cards', () => {
  const styleSource = readFileSync(join(process.cwd(), 'css/style.css'), 'utf8')

  expect(styleSource).toMatch(/\.person-assignment-name-row\s*\{/)
  expect(styleSource).toMatch(/\.person-status-mark--present\s*\{/)
  expect(styleSource).toMatch(/transition:\s*transform 220ms/)
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- tests/dashboard-panels.test.tsx`

Expected: FAIL，提示状态位或动画样式尚不存在。

- [ ] **Step 3: 写最小实现**

```ts
useLayoutEffect(() => {
  for (const [id, nextRect] of nextRects) {
    const prevRect = prevRectsRef.current.get(id)
    if (!prevRect) continue
    const dx = prevRect.left - nextRect.left
    const dy = prevRect.top - nextRect.top
    if (!dx && !dy) continue
    element.animate([
      { transform: `translate(${dx}px, ${dy}px)` },
      { transform: 'translate(0, 0)' },
    ], { duration: 220, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' })
  }
}, [pagePeople])
```

```css
.person-assignment-name-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.person-status-mark--present {
  color: #39C5BB;
  animation: person-status-pulse 2.6s ease-in-out infinite;
}
```

- [ ] **Step 4: 跑完整验证**

Run: `npm run build`
Expected: PASS

Run: `npm run test`
Expected: PASS

- [ ] **Step 5: 提交最终结果**

```bash
git add css/style.css src/features/dashboard/PeopleAssignmentPanel.tsx tests/dashboard-panels.test.tsx
git commit -m "feat: animate dashboard person reordering"
```
