# 项目焦点工作台实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**目标：** 将项目焦点、项目总览、项目时间轴和项目详情重构为同一套以行动优先的项目工作台体验。

**架构：** 保持 `ProjectDetailPanel` 作为唯一项目工作台，Dashboard 焦点、搜索、项目卡片和项目时间轴均通过统一的打开回调进入它。selectors 负责计算统一的行动、日期和进度模型；views 只管理入口与面板状态；actions 负责持久化和 undo。弹层集中处理焦点进入、焦点限制与焦点回退，确保所有入口一致可访问。

**技术栈：** React 19、TypeScript、Vitest + jsdom、纯 CSS、IndexedDB legacy store。

---

## 文件结构

- `src/legacy/actions.ts`：规范项目主交付日期和兼容 `ddl` 的保存规则。
- `src/legacy/selectors.ts`：生成规范时间范围、焦点行动信号及可选的项目时间轴“今天”位置。
- `src/features/dashboard/ProjectFocusTimeline.tsx`：渲染紧凑、可行动、可键盘操作的焦点行。
- `src/views/Dashboard.tsx`：让焦点标题成为 button，并把项目总览选择转交给同一项目工作台。
- `src/components/ui/ExpandPanel.tsx`：负责 dialog 焦点进入、Tab 限制和关闭后焦点回退。
- `src/features/projects/ProjectCard.tsx`：改为语义化项目摘要，显式提供查看、状态、编辑和删除动作。
- `src/features/projects/ProjectTimeline.tsx`：将项目行改为可选择的 button，并显示“今天”位置。
- `src/features/projects/ProjectOverviewToolbar.tsx`：新增项目关键词与现有筛选/视图开关的独立工具栏。
- `src/views/Projects.tsx`：统一卡片与时间轴的打开详情行为；在独立页面管理项目工作台面板。
- `src/features/dashboard/ProjectDetailPanel.tsx`：重排为摘要行动、排期、风险、任务四个区块，并提供编辑项目入口。
- `src/features/dashboard/DashboardHeader.tsx`：补齐搜索 combobox ARIA 状态。
- `css/style.css`：项目焦点、项目总览、详情工作台、键盘焦点及移动端的视觉实现。
- `tests/dashboard-panels.test.tsx`：焦点时间轴的行动信号、按钮语义与坐标回调。
- `tests/store-selectors.test.ts`：日期规范化、行动信号、时间轴今日位置和排序。
- `tests/current-app-regressions.test.tsx`：面板焦点管理、入口统一、组件边界与项目工作台回归。

## 任务 1：先固定项目日期与焦点行动数据模型

**文件：**
- 修改：`src/legacy/actions.ts:27-95, 266-289`
- 修改：`src/legacy/selectors.ts:118-150, 701-754, 990-1095`
- 测试：`tests/store-selectors.test.ts:147-246, 540-620`

- [ ] **步骤 1：写日期规范化与行动信号的失败测试**

在 `tests/store-selectors.test.ts` 导入 `buildProjectRecord`，并添加以下用例。该用例要求旧 `ddl` 在编辑时迁移为交付日期，清空所有可见日期后不保留陈旧 deadline；反向日期不会产生负宽度；焦点会优先呈现受阻风险。

```ts
it('normalizes project schedule dates and exposes one actionable focus signal', () => {
  const saved = buildProjectRecord(
    { id: 'project-1', name: '旧项目', ddl: '2026-04-18' },
    {
      name: '旧项目',
      status: 'active',
      priority: 'high',
      startDate: '2026-04-22',
      reviewDate: null,
      deliveryDate: '2026-04-18',
      endDate: '2026-04-18',
      ddl: '2026-04-18',
      description: '',
      notes: '',
    },
  )

  expect(saved).toMatchObject({
    startDate: '2026-04-18',
    deliveryDate: '2026-04-18',
    endDate: '2026-04-22',
    ddl: '2026-04-18',
  })

  const timeline = buildDashboardProjectFocusTimeline(
    [saved],
    [{ id: 'task-1', projectId: 'project-1', title: '等待素材', status: 'blocked' }],
    [],
    '2026-04-12',
  )

  expect(timeline.items[0]).toMatchObject({
    actionKind: 'blocked',
    actionLabel: '1 项受阻',
    barWidthPercent: expect.any(Number),
  })
  expect(timeline.items[0].barWidthPercent).toBeGreaterThanOrEqual(4)
})
```

- [ ] **步骤 2：运行 selector 测试并确认失败**

运行：

```bash
npm run test -- tests/store-selectors.test.ts
```

预期：测试因 `actionKind`、`actionLabel` 或日期规范化规则缺失而失败。

- [ ] **步骤 3：实现唯一主日期、反向范围规范化和行动信号**

在 `src/legacy/actions.ts` 中增加一个只在本文件使用的规范化函数，并由 `buildProjectRecord()` 与 `updateProjectSchedule()` 共用。`deliveryDate` 是唯一主日期；`ddl` 仅保存为主日期或结束日期的兼容镜像，不能回退到旧 project 值。

```ts
function normalizeProjectSchedule(input: Pick<ProjectFormInput,
  'deliveryDate' | 'endDate' | 'reviewDate' | 'startDate'
>) {
  const deliveryDate = input.deliveryDate || null
  const endDate = input.endDate || null
  const startDate = input.startDate || null

  if (startDate && endDate && startDate > endDate) {
    return {
      startDate: endDate,
      reviewDate: input.reviewDate || null,
      deliveryDate,
      endDate: startDate,
      ddl: deliveryDate || startDate,
    }
  }

  return {
    startDate,
    reviewDate: input.reviewDate || null,
    deliveryDate,
    endDate,
    ddl: deliveryDate || endDate,
  }
}
```

在 `src/legacy/selectors.ts` 中：

1. 为 `DashboardProjectFocusTimelineItem` 新增 `actionKind: 'blocked' | 'checkpoint' | 'task' | 'unscheduled'` 与 `actionLabel: string`。
2. 增加 `buildProjectFocusAction(project, openTasks, todayStr)`：先返回 `N 项受阻`，再返回未完成任务中最早日期的标题，然后返回未来审查/交付节点，最后返回 `待补排期`。
3. 在 `getProjectEndDate()` 中对已规范化范围再次防御：若 `endDate < startDate`，返回 `startDate`。
4. 让 `buildProjectTimelineModel()` 返回 `todayOffsetDays: number | null`，以 `referenceDate` 相对于 `startDate` 计算并限制在 `[0, rangeDays - 1]`。

- [ ] **步骤 4：再次运行 selector 测试**

运行：

```bash
npm run test -- tests/store-selectors.test.ts
```

预期：全部通过；既有本地日期、deadline tone、焦点四行和项目排序断言不变。

- [ ] **步骤 5：检查本任务改动**

运行：

```bash
git diff --check -- src/legacy/actions.ts src/legacy/selectors.ts tests/store-selectors.test.ts
git diff -- src/legacy/actions.ts src/legacy/selectors.ts tests/store-selectors.test.ts
```

不要提交这些文件：它们含有用户已有的未提交工作。保留 diff 供后续任务和最终审核。

## 任务 2：让 ExpandPanel 成为可回退焦点的真实工作台弹层

**文件：**
- 修改：`src/components/ui/ExpandPanel.tsx:1-122`
- 测试：`tests/current-app-regressions.test.tsx:124-218`

- [ ] **步骤 1：写焦点进入、Tab 限制和焦点回退的失败测试**

在 `tests/current-app-regressions.test.tsx` 添加一个使用两个 dialog button 的用例：

```tsx
it('moves focus into an expanded panel, cycles Tab, and restores its trigger', () => {
  const trigger = document.createElement('button')
  trigger.textContent = '打开项目'
  document.body.appendChild(trigger)
  trigger.focus()
  const onClose = vi.fn()
  const { container, root } = renderExpandedPanel(
    <ExpandPanel title="项目详情" originX={20} originY={20} onClose={onClose}>
      <button type="button">第一个动作</button>
      <button type="button">最后一个动作</button>
    </ExpandPanel>,
  )

  expect(document.activeElement).toBe(container.querySelector('.modal-close'))
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }))
  expect(document.activeElement).toBe(container.querySelector('button:nth-of-type(2)'))

  ;(container.querySelector('.modal-close') as HTMLButtonElement).click()
  vi.advanceTimersByTime(260)
  expect(onClose).toHaveBeenCalledTimes(1)
  expect(document.activeElement).toBe(trigger)
  root.unmount()
  trigger.remove()
})
```

在此文件中复用现有 `createRoot` + `act` 方式定义 `renderExpandedPanel()`，使其返回 `{ container, root }`。

- [ ] **步骤 2：运行该测试并确认失败**

运行：

```bash
npm run test -- tests/current-app-regressions.test.tsx
```

预期：焦点仍停留在触发 button，测试失败。

- [ ] **步骤 3：实现焦点管理**

在 `ExpandPanel.tsx` 中增加 dialog ref、打开前焦点 ref 和焦点元素查询函数。挂载时将焦点移到关闭按钮；在捕获阶段处理 Tab / Shift+Tab；`finishClose()` 调用 `onClose()` 后通过 `requestAnimationFrame` 恢复原触发元素。

```ts
function getFocusableElements(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>(
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
  )).filter((element) => !element.hidden)
}
```

为 dialog 添加 `ref={dialogRef}`、为关闭按钮添加 `ref={closeButtonRef}`。键盘处理只在 `event.key === 'Tab'` 时拦截首尾循环，保留既有 Escape 行为和 260ms 关闭兜底。

- [ ] **步骤 4：运行回归测试**

运行：

```bash
npm run test -- tests/current-app-regressions.test.tsx
```

预期：新增焦点用例与现有 backdrop、动画 fallback 用例全部通过。

- [ ] **步骤 5：检查改动**

运行：

```bash
git diff --check -- src/components/ui/ExpandPanel.tsx tests/current-app-regressions.test.tsx
```

## 任务 3：重构 Dashboard 焦点为紧凑的行动型入口

**文件：**
- 修改：`src/features/dashboard/ProjectFocusTimeline.tsx:5-105`
- 修改：`src/views/Dashboard.tsx:42-91, 245-289, 334-359`
- 修改：`src/features/dashboard/DashboardHeader.tsx:23-149`
- 修改：`css/style.css:1291-1558, 9086-9125`
- 测试：`tests/dashboard-panels.test.tsx:73-178`
- 测试：`tests/current-app-regressions.test.tsx:891-920`

- [ ] **步骤 1：写焦点行动标签和语义按钮的失败测试**

扩展 `ProjectFocusTimeline` 渲染用例，要求首行同时保留进度和一个行动标签：

```tsx
expect(rows[0]?.textContent).toContain('1 项受阻')
expect(rows[0]?.querySelector('.pft-action')?.getAttribute('data-kind')).toBe('blocked')
expect(rows[0]?.tagName).toBe('BUTTON')
```

添加 Dashboard 源码守护：

```ts
expect(dashboardSource).toMatch(/<button[\s\S]*className="focus-section-header"/)
expect(dashboardSource).toMatch(/onOpenProject=/)
```

- [ ] **步骤 2：运行 dashboard 测试并确认失败**

运行：

```bash
npm run test -- tests/dashboard-panels.test.tsx tests/current-app-regressions.test.tsx
```

预期：`pft-action`、语义化标题 button 或项目总览选择回调缺失。

- [ ] **步骤 3：实现焦点入口与可访问搜索**

在 `ProjectFocusTimeline.tsx` 的 meta 行渲染：

```tsx
<span className="pft-action" data-kind={item.actionKind}>
  {item.actionLabel}
</span>
```

在 `Dashboard.tsx`：

1. 将 `focus-section-header` 改为 `type="button"`。
2. 将点击位置读取抽为 `openProjectsFromElement(element)`。
3. 将 `Projects` 传入 `onOpenProject={(projectId, ox, oy) => setExpandedPanel({ type: 'project', projectId, ox, oy })}`，让从总览选择项目替换为同一个 `ProjectDetailPanel`。

在 `DashboardHeader.tsx` 为 input 添加：

```tsx
role="combobox"
aria-autocomplete="list"
aria-controls="dashboard-search-results"
aria-expanded={showDropdown}
aria-activedescendant={showDropdown && searchResults[activeIndex]
  ? `dashboard-search-option-${activeIndex}`
  : undefined}
```

为 listbox 设置 `id="dashboard-search-results"`，为每项设置 `id`、`role="option"` 和 `aria-selected`。

在 CSS 中保留 `--pft-row-h: 34px`、四行 grid 与 170px 容器；新增 `.pft-action` 的单行截断和 tone；为 `.focus-section-header`、`.pft-row` 与搜索项增加 `:focus-visible`。窄屏不得隐藏全部时间语义：保留“今天”或交付标识，隐藏的仅是冗余横轴刻度。

- [ ] **步骤 4：运行 Dashboard 测试**

运行：

```bash
npm run test -- tests/dashboard-panels.test.tsx tests/dashboard-theme.test.ts tests/current-app-regressions.test.tsx
```

预期：焦点区高度、四行约束、深色模式、selector 驱动和组件边界测试均通过。

- [ ] **步骤 5：检查窄屏视觉**

运行：

```bash
npm run dev
```

使用浏览器在 1440×900、1024×700、390×844 与深色主题检查：

1. 焦点标题和每一行的 Tab 焦点可见；
2. 四行不裁切且 desktop 仍为 170px；
3. 受阻、下一步和无排期标签不挤压项目名称；
4. 行点击与“展开全部”均进入正确面板。

结束后停止本任务启动的开发服务器。

## 任务 4：将项目卡片与项目时间轴统一为工作台入口

**文件：**
- 新建：`src/features/projects/ProjectOverviewToolbar.tsx`
- 修改：`src/features/projects/ProjectCard.tsx:1-42`
- 修改：`src/features/projects/ProjectTimeline.tsx:1-45`
- 修改：`src/views/Projects.tsx:1-147`
- 修改：`css/style.css` 中 `.view-projects`、`.project-card`、`.timeline-shell` 规则
- 测试：`tests/current-app-regressions.test.tsx`

- [ ] **步骤 1：写项目入口一致性的失败测试**

新增回归守护，要求三项明确 API 存在：

```ts
expect(projectsSource).toMatch(/onOpenProject/)
expect(cardSource).toMatch(/aria-label={`查看项目/)
expect(timelineSource).toMatch(/<button[\s\S]*timeline-row/)
expect(projectsSource).toMatch(/ProjectDetailPanel/)
expect(projectsSource).toMatch(/projectSearch/)
```

同时要求 `ProjectCard` 不再使用 root `onClick={onEdit}`：

```ts
expect(cardSource).not.toMatch(/className=\{`project-card[^`]*`\} onClick=\{onEdit\}/)
```

- [ ] **步骤 2：运行回归测试并确认失败**

运行：

```bash
npm run test -- tests/current-app-regressions.test.tsx
```

预期：新 API 与语义结构尚不存在。

- [ ] **步骤 3：实现可组合总览组件**

创建 `ProjectOverviewToolbar.tsx`：

```tsx
export function ProjectOverviewToolbar({
  onSearchChange,
  onPriorityChange,
  onStatusChange,
  onViewModeChange,
  priority,
  search,
  status,
  viewMode,
}: ProjectOverviewToolbarProps) {
  return (
    <div className="project-overview-toolbar">
      <label className="sr-only" htmlFor="project-overview-search">搜索项目</label>
      <input
        id="project-overview-search"
        className="filter-input"
        value={search}
        placeholder="搜索项目名称或描述"
        onChange={(event) => onSearchChange(event.target.value)}
      />
      <select aria-label="项目状态" value={status} onChange={(event) => onStatusChange(event.target.value)}>
        <option value="">全部状态</option>
        <option value="active">进行中</option>
        <option value="paused">暂停</option>
        <option value="completed">已完成</option>
        <option value="cancelled">已取消</option>
      </select>
      <select aria-label="项目优先级" value={priority} onChange={(event) => onPriorityChange(event.target.value)}>
        <option value="">全部优先级</option>
        <option value="urgent">紧急</option>
        <option value="high">高</option>
        <option value="medium">中</option>
        <option value="low">低</option>
      </select>
      <button type="button" aria-pressed={viewMode === 'grid'} onClick={() => onViewModeChange('grid')}>卡片</button>
      <button type="button" aria-pressed={viewMode === 'timeline'} onClick={() => onViewModeChange('timeline')}>时间轴</button>
    </div>
  )
}
```

将 `ProjectCard` 改为 `article`。标题使用“查看项目 {name}” button；状态 button 打开既有 context menu；编辑、删除保留独立 `aria-label`。新增 `onOpen(projectId, x, y)`，通过标题 button rect 计算坐标，所有次级按钮 `stopPropagation()`。

将 `ProjectTimeline` 增加：

```ts
onOpenProject: (projectId: string, x: number, y: number) => void
```

每个 `.timeline-row` 是 button；`timeline.todayOffsetDays` 有值时在头部与轨道渲染 `.timeline-today-line`。当 `onOpenProject` 被调用时读取 button rect 并回传中心坐标。

在 `Projects.tsx`：

1. 增加 `projectSearch`、`openedProject` 状态。
2. 在 `filteredProjects` 前使用 `name` 和 `description` 的 case-insensitive contains 过滤。
3. 接收可选 `onOpenProject`；有该 prop 时将选择交给父级，无该 prop 时渲染本地 `ExpandPanel` 与 `ProjectDetailPanel`。
4. 区分空数据和无筛选命中：前者提供“新建项目”，后者提供“清除筛选”。
5. 右键菜单可保留为补充，但 status button 必须调用相同的 context-menu state。

- [ ] **步骤 4：运行总览相关测试**

运行：

```bash
npm run test -- tests/current-app-regressions.test.tsx tests/store-selectors.test.ts
```

预期：组件边界、排序、项目卡模型和新增工作台入口断言通过。

- [ ] **步骤 5：检查总览样式**

在 `css/style.css` 中：

```css
.project-card:focus-within,
.project-card:hover {
  border-color: color-mix(in srgb, var(--card-accent, var(--c-primary)) 44%, var(--c-border));
  box-shadow: var(--shadow-md);
}

.project-card-actions {
  display: flex;
  gap: 6px;
  opacity: 1;
}

@media (hover: hover) and (min-width: 721px) {
  .project-card-actions { opacity: 0; }
  .project-card:hover .project-card-actions,
  .project-card:focus-within .project-card-actions { opacity: 1; }
}
```

确保卡片操作在触控环境默认可见，时间轴在窄屏采用固定名称列与横向内部滚动，不让页面本身横向溢出。

## 任务 5：将项目详情重构为行动优先工作台

**文件：**
- 修改：`src/features/dashboard/ProjectDetailPanel.tsx:1-445`
- 修改：`css/style.css` 中 `.project-detail-panel` 与 `.pdp-*` 规则
- 测试：`tests/current-app-regressions.test.tsx`

- [ ] **步骤 1：写详情层级与编辑入口的失败测试**

添加源码级回归断言，约束摘要行动先于排期，并保留既有生产工作台能力：

```ts
const summaryIndex = panelSource.indexOf('pdp-action-summary')
const scheduleIndex = panelSource.indexOf('pdp-schedule-panel')
const risksIndex = panelSource.indexOf('pdp-blocker-list')
const tasksIndex = panelSource.indexOf('pdp-section')

expect(summaryIndex).toBeGreaterThan(-1)
expect(summaryIndex).toBeLessThan(scheduleIndex)
expect(scheduleIndex).toBeLessThan(risksIndex)
expect(risksIndex).toBeLessThan(tasksIndex)
expect(panelSource).toMatch(/ProjectDialog/)
expect(panelSource).toMatch(/setEditingProject/)
```

- [ ] **步骤 2：运行详情回归测试并确认失败**

运行：

```bash
npm run test -- tests/current-app-regressions.test.tsx
```

预期：`pdp-action-summary` 与项目编辑状态不存在。

- [ ] **步骤 3：实现工作台四区**

在 `ProjectDetailPanel.tsx` 增加 `editingProject` state，导入并渲染 `ProjectDialog`；项目“编辑”按钮必须打开它。

将当前 `pdp-meta-row` 与进度区重组为 `pdp-action-summary`：

```tsx
<section className="pdp-action-summary" aria-label="项目行动摘要">
  <div className="pdp-action-primary">
    <span className="pdp-eyebrow">下一步</span>
    <strong>{nextOpenTask?.title || nextCheckpoint?.label || '补充项目排期'}</strong>
    <span>{nextOpenTask
      ? `任务 · ${formatDate(nextOpenTask.scheduledDate || nextOpenTask.endDate)}`
      : nextCheckpoint
        ? `${nextCheckpoint.label} · ${formatDate(nextCheckpoint.value)}`
        : '尚未安排日期'}</span>
  </div>
  <div className="pdp-action-signals">
    <span data-tone={blockedTaskCount > 0 ? 'risk' : 'neutral'}>{blockedTaskCount} 受阻</span>
    <span data-tone={overdueTaskCount > 0 ? 'risk' : 'neutral'}>{overdueTaskCount} 逾期</span>
  </div>
</section>
```

排期区保留 `pdp-schedule-panel`、`DatePicker` 和保存行为，交付字段作为第一优先字段；结束日期的 label 改为“项目结束（可选）”。生产节点成为排期区底部的紧凑摘要，备注不再单独创建首屏卡片。风险区只在存在受阻或逾期时渲染；任务区保持既有 `TaskItem` 快捷操作与 `initialProjectId={projectId}`。

- [ ] **步骤 4：运行详情与任务测试**

运行：

```bash
npm run test -- tests/current-app-regressions.test.tsx tests/dashboard-panels.test.tsx
```

预期：项目详情仍可保存排期、创建项目内任务、完成或延期项目；新行动摘要顺序断言通过。

- [ ] **步骤 5：实现视觉层级**

在 CSS 中让 `.pdp-action-summary` 使用主色弱背景、明确的下一步字体层级和最多两条风险信号；`.pdp-progress-grid` 降为紧凑辅助统计；风险区仅在有风险时以 warning/rose tone 显示；窄屏按“行动摘要 → 操作 → 排期 → 风险 → 任务”单列排列。所有 `.pdp-* button` 使用共享 `:focus-visible` 样式。

## 任务 6：回归完善、视觉审查与最终验证

**文件：**
- 修改：`tests/dashboard-panels.test.tsx`
- 修改：`tests/store-selectors.test.ts`
- 修改：`tests/current-app-regressions.test.tsx`
- 修改：`css/style.css`

- [ ] **步骤 1：补充搜索和焦点区的可访问性回归**

在 `tests/current-app-regressions.test.tsx` 添加如下源码守护：

```ts
expect(headerSource).toMatch(/role="combobox"/)
expect(headerSource).toMatch(/aria-expanded=\{showDropdown\}/)
expect(headerSource).toMatch(/aria-activedescendant=/)
expect(focusStyleSource).toMatch(/\.pft-row:focus-visible/)
expect(focusStyleSource).toMatch(/\.focus-section-header:focus-visible/)
```

在 `tests/dashboard-panels.test.tsx` 断言 `.pft-action[data-kind="blocked"]`、`.pft-action[data-kind="task"]` 与无项目空态仍可读。

- [ ] **步骤 2：运行所有针对性测试**

运行：

```bash
npm run test -- tests/store-selectors.test.ts tests/dashboard-panels.test.tsx tests/dashboard-theme.test.ts tests/current-app-regressions.test.tsx
```

预期：所有相关测试通过；没有依赖 hover 的唯一操作入口，也没有日期模型回退。

- [ ] **步骤 3：执行完整质量门禁**

运行：

```bash
npm run build
npm run test
```

预期：TypeScript / Vite 构建成功，Vitest 全部测试通过。

- [ ] **步骤 4：在真实浏览器复审四个关键路径**

启动 `npm run dev` 后，在浅色和深色主题分别检查：

1. Dashboard 焦点标题打开项目总览，焦点行打开项目工作台。
2. Dashboard 搜索选择项目打开同一工作台。
3. 项目总览中卡片与时间轴都打开同一工作台，状态、编辑和删除为独立操作。
4. 弹层打开、Tab 循环、Escape 关闭与焦点回退都正确；390px 宽度没有横向页面溢出。

使用浏览器控制台确认没有 error；停止开发服务器。

- [ ] **步骤 5：完成改动审查**

运行：

```bash
git diff --check
git status --short
git diff --stat
```

逐项对照 `docs/superpowers/specs/2026-07-10-project-focus-workspace-design.md` 的六项验收标准。不要重置或覆盖任何用户已有工作；只报告本次相关文件与验证结果。
