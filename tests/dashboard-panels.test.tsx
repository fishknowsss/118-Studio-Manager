// @vitest-environment jsdom

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { ReactNode } from 'react'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it, vi } from 'vitest'
import { ConfirmProvider } from '../src/components/feedback/ConfirmProvider'
import { ToastProvider } from '../src/components/feedback/ToastProvider'
import { PeopleAssignmentPanel } from '../src/features/dashboard/PeopleAssignmentPanel'
import { PersonDetailPanel } from '../src/features/dashboard/PersonDetailPanel'
import { ProjectFocusTimeline } from '../src/features/dashboard/ProjectFocusTimeline'
import { TaskPoolPanel } from '../src/features/dashboard/TaskPoolPanel'
import { buildPersonCardModels } from '../src/legacy/selectors'
import { store, type LegacyLog, type LegacyPerson, type LegacyProject, type LegacyTask, type LeaveRecord } from '../src/legacy/store'
import { today } from '../src/legacy/utils'
import { Projects } from '../src/views/Projects'

function renderNode(node: ReactNode) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)

  act(() => {
    root.render(<ConfirmProvider>{node}</ConfirmProvider>)
  })

  return {
    container,
    root,
    rerender(nextNode: ReactNode) {
      act(() => {
        root.render(<ConfirmProvider>{nextNode}</ConfirmProvider>)
      })
    },
    cleanup() {
      act(() => {
        root.unmount()
      })
      container.remove()
    },
  }
}

function peoplePanelNode(people: LegacyPerson[]) {
  return (
    <PeopleAssignmentPanel
      people={buildPersonCardModels(people, [])}
      draggingPersonId={null}
      dragOverPersonId={null}
      draggingTaskId={null}
      onDragLeavePerson={() => {}}
      onDragOverPerson={() => {}}
      onExpand={() => {}}
      onDropToPerson={() => {}}
      onPersonStateChange={() => {}}
      onPersonDragEnd={() => {}}
      onPersonDragStart={() => {}}
      onPersonClick={() => {}}
      onReorderPeople={() => {}}
    />
  )
}

describe('dashboard panels', () => {
  it('renders the expanded projects view as an action-oriented workspace without view switching', () => {
    const previousStore = {
      projects: store.projects,
      tasks: store.tasks,
      people: store.people,
      logs: store.logs,
    }
    const onOpenProject = vi.fn()

    store.projects = [
      { id: 'project-risk', name: '受阻项目', status: 'active', priority: 'urgent', deliveryDate: '2026-07-15' },
      { id: 'project-progress', name: '推进项目', status: 'active', priority: 'high', deliveryDate: '2026-07-22' },
      { id: 'project-plan', name: '待安排项目', status: 'active', priority: 'medium' },
    ]
    store.tasks = [
      { id: 'task-risk', projectId: 'project-risk', title: '确认成片规格', status: 'blocked', endDate: '2026-07-14' },
      { id: 'task-progress', projectId: 'project-progress', title: '合成终版', status: 'in-progress', endDate: '2026-07-20' },
      { id: 'task-plan', projectId: 'project-plan', title: '分配剪辑', status: 'todo' },
    ]
    store.people = []
    store.logs = [] as LegacyLog[]

    const view = renderNode(
      <ToastProvider>
        <Projects onOpenProject={onOpenProject} />
      </ToastProvider>,
    )

    expect(view.container.querySelector('.project-workspace')).not.toBeNull()
    expect(view.container.textContent).toContain('需要关注')
    expect(view.container.textContent).toContain('正在推进')
    expect(view.container.textContent).toContain('等待安排')
    expect(view.container.textContent).not.toContain('卡片')
    expect(view.container.textContent).not.toContain('时间轴')

    const openButton = Array.from(view.container.querySelectorAll('button'))
      .find((button) => button.textContent === '打开')
    act(() => {
      openButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(onOpenProject).toHaveBeenCalledWith('project-risk', 0, 0)

    view.cleanup()
    store.projects = previousStore.projects
    store.tasks = previousStore.tasks
    store.people = previousStore.people
    store.logs = previousStore.logs
  })

  it('keeps the dashboard lower layout balanced between task pool and people panels', () => {
    const styleSource = readFileSync(join(process.cwd(), 'css/style.css'), 'utf8')

    expect(styleSource).toMatch(/\.dash-bottom\s*\{[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s+minmax\(0,\s*1fr\)\s+minmax\(280px,\s*0\.88fr\)/)
  })

  it('keeps desktop dashboard sections inside a single viewport frame', () => {
    const styleSource = readFileSync(join(process.cwd(), 'css/style.css'), 'utf8')

    expect(styleSource).toMatch(/\.dash-date-block\s*\{[\s\S]*flex:\s*0 0 auto;/)
    expect(styleSource).toMatch(/\.dash-date-block\s*\{[\s\S]*justify-self:\s*start;/)
    expect(styleSource).toMatch(/\.dash-date-big\s*\{[\s\S]*white-space:\s*nowrap;/)
    expect(styleSource).toMatch(/@media \(min-width:\s*721px\) and \(max-width:\s*1180px\)/)
    expect(styleSource).toMatch(/@media \(min-width:\s*1181px\)/)
    expect(styleSource).toMatch(/@media \(min-width:\s*1181px\)[\s\S]*--dash-focus-fit-h:\s*clamp\(292px,\s*35dvh,\s*304px\);/)
    expect(styleSource).toMatch(/@media \(min-width:\s*1181px\)[\s\S]*grid-template-rows:\s*var\(--dash-header-fit-h\) var\(--dash-focus-fit-h\) minmax\(0,\s*1fr\);/)
    expect(styleSource).toMatch(/--dash-header-fit-h:\s*clamp\(52px,\s*8dvh,\s*76px\);/)
    expect(styleSource).toMatch(/--dash-focus-fit-h:\s*268px;/)
    expect(styleSource).toMatch(/\.today-focus\s*\{[\s\S]*grid-template-rows:\s*auto minmax\(0,\s*1fr\);/)
    expect(styleSource).toMatch(/\.today-focus:has\(\.focus-section-header:hover\)/)
    expect(styleSource).toMatch(/\.focus-section-header\s*\{[\s\S]*min-height:\s*32px;/)
    expect(styleSource).toMatch(/\.dashboard\s*\{[\s\S]*grid-template-rows:\s*var\(--dash-header-fit-h\) var\(--dash-focus-fit-h\) minmax\(0,\s*1fr\);/)
    expect(styleSource).toMatch(/\.dash-bottom\s*\{[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s+minmax\(0,\s*1fr\)\s+minmax\(280px,\s*0\.88fr\)/)
    expect(styleSource).toMatch(/@media \(min-width:\s*721px\) and \(max-width:\s*980px\)/)
    expect(styleSource).toMatch(/@media \(min-width:\s*721px\) and \(max-width:\s*1180px\) and \(max-height:\s*760px\)/)
    expect(styleSource).toMatch(/\.people-panel-body\s*\{[\s\S]*overflow:\s*hidden;/)
    expect(styleSource).toMatch(/\.people-assignment-grid\s*\{[\s\S]*grid-template-rows:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\);/)
    expect(styleSource).toMatch(/\.mini-cal-grid\s*\{[\s\S]*grid-template-rows:\s*auto repeat\(6,\s*minmax\(0,\s*1fr\)\);/)
    expect(styleSource).toMatch(/@media \(min-width:\s*721px\) and \(max-height:\s*820px\)/)
    expect(styleSource).toMatch(/\.mini-cal-day\s*\{[\s\S]*aspect-ratio:\s*auto;/)
  })

  it('keeps the project focus timeline filling four rows without edge clipping', () => {
    const styleSource = readFileSync(join(process.cwd(), 'css/style.css'), 'utf8')

    expect(styleSource).toMatch(/--pft-axis-h:\s*28px;/)
    expect(styleSource).toMatch(/\.project-focus-timeline\s*\{[\s\S]*min-height:\s*0;/)
    expect(styleSource).toMatch(/\.pft-rows\s*\{[\s\S]*grid-template-rows:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\);/)
    expect(styleSource).toMatch(/\.pft-row\s*\{[\s\S]*height:\s*100%;/)
    expect(styleSource).toMatch(/--pft-cols:\s*var\(--pft-identity-w\)\s+minmax\(0,\s*1\.9fr\)\s+var\(--pft-aside-w\);/)
    expect(styleSource).toMatch(/\.pft-identity\s*\{/)
    expect(styleSource).toMatch(/\.pft-name\s*\{[\s\S]*font-size:\s*15px;/)
    expect(styleSource).toMatch(/\.pft-action\s*\{[\s\S]*font-size:\s*12\.5px;/)
    expect(styleSource).toMatch(/\.pft-bar-fill\s*\{/)
    expect(styleSource).toMatch(/\.pft-axis-tick\s*\{/)
    expect(styleSource).toMatch(/\.pft-today-band\s*\{/)
    expect(styleSource).toMatch(/\.pft-rows-shell\s*\{/)
    expect(styleSource).toMatch(/\.pft-today-layer\s*\{[\s\S]*z-index:\s*20;/)
    expect(styleSource).toMatch(/\.pft-bar\s*\{[\s\S]*height:\s*12px;/)
    // No AI left accent rail
    expect(styleSource).not.toMatch(/\.pft-row\s*\{[\s\S]*border-left:\s*3px solid var\(--pft-accent\);/)
    expect(styleSource).toMatch(/\.pft-row\.focus-overdue\s*\{\s*--pft-accent:/)
    expect(styleSource).toMatch(/\.pft-row\.focus-critical\s*\{\s*--pft-accent:/)
    // Distinct start/review/delivery markers
    expect(styleSource).toMatch(/\.pft-marker--start/)
    expect(styleSource).toMatch(/\.pft-marker--review/)
    expect(styleSource).toMatch(/\.pft-marker--delivery/)
    expect(styleSource).not.toMatch(/\.pft-note\s*\{/)
    expect(styleSource).not.toMatch(/\.pft-row:hover[\s\S]{0,80}translateY\(/)
    expect(styleSource).toMatch(/\.focus-cards\s*\{[\s\S]*overflow:\s*hidden;/)
  })

  it('keeps the project focus timeline constrained on mobile widths', () => {
    const styleSource = readFileSync(join(process.cwd(), 'css/style.css'), 'utf8')

    expect(styleSource).toMatch(/@media \(max-width:\s*720px\)[\s\S]*\.project-focus-timeline\s*\{[\s\S]*width:\s*100%;[\s\S]*max-width:\s*100%;[\s\S]*min-width:\s*0;/)
    expect(styleSource).toMatch(/@media \(max-width:\s*720px\)[\s\S]*\.pft-rows\s*\{[\s\S]*width:\s*100%;[\s\S]*max-width:\s*100%;[\s\S]*min-width:\s*0;/)
    expect(styleSource).toMatch(/@media \(max-width:\s*720px\)[\s\S]*\.pft-row\s*\{[\s\S]*width:\s*100%;[\s\S]*max-width:\s*100%;[\s\S]*min-width:\s*0;[\s\S]*height:\s*auto;/)
    expect(styleSource).toMatch(/@media \(max-width:\s*720px\)[\s\S]*\.pft-track\s*\{[\s\S]*width:\s*100%;[\s\S]*max-width:\s*100%;[\s\S]*min-width:\s*0;/)
  })

  it('renders the dashboard project focus as a compact four-row timeline', () => {
    const onExpandProject = vi.fn()
    const view = renderNode(
      <ProjectFocusTimeline
        model={{
          axisEndDate: '2026-04-24',
          axisEndLabel: '4/24',
          axisStartDate: '2026-04-12',
          axisStartLabel: '4/12',
          axisTicks: [
            { date: '2026-04-12', isMajor: true, isToday: true, label: '4/12', percent: 0, weekdayLabel: '日' },
            { date: '2026-04-15', isMajor: false, isToday: false, label: '4/15', percent: 25, weekdayLabel: '三' },
            { date: '2026-04-18', isMajor: true, isToday: false, label: '4/18', percent: 50, weekdayLabel: '六' },
            { date: '2026-04-21', isMajor: false, isToday: false, label: '4/21', percent: 75, weekdayLabel: '二' },
            { date: '2026-04-24', isMajor: true, isToday: false, label: '4/24', percent: 100, weekdayLabel: '五' },
          ],
          hiddenCount: 1,
          rangeDays: 12,
          rangeLabel: '4/12 – 4/24 · 13 天',
          todayPercent: 0,
          items: [
            {
              actionKind: 'blocked',
              actionLabel: '1 项受阻',
              assigneeNames: ['剪辑甲', '后期乙'],
              assigneePreview: '剪辑甲、后期乙',
              barStartPercent: 0,
              barWidthPercent: 50,
              blockedTaskCount: 1,
              daysToDelivery: 6,
              deliveryDate: '2026-04-18',
              deliveryLabel: '6 天后',
              deliveryPercent: 50,
              doneTaskCount: 2,
              durationDays: 6,
              durationLabel: '7 天',
              endDate: '2026-04-18',
              id: 'project-1',
              name: '短剧样片',
              notePreview: '先出 30 秒样片',
              openTaskCount: 3,
              phaseLabel: '审查前',
              progressPercent: 40,
              progressText: '2/5',
              reviewDate: '2026-04-15',
              reviewPercent: 25,
              startDate: '2026-04-12',
              startPercent: 0,
              statusKey: 'active',
              taskCount: 5,
              urgencyKey: 'focus-critical',
            },
            {
              actionKind: 'task',
              actionLabel: '字幕校对',
              assigneeNames: [],
              assigneePreview: '未分配',
              barStartPercent: 12,
              barWidthPercent: 38,
              blockedTaskCount: 0,
              daysToDelivery: 8,
              deliveryDate: '2026-04-20',
              deliveryLabel: '8 天后',
              deliveryPercent: 66,
              doneTaskCount: 0,
              durationDays: 6,
              durationLabel: '7 天',
              endDate: '2026-04-20',
              id: 'project-2',
              name: '包装字幕',
              notePreview: '',
              openTaskCount: 1,
              phaseLabel: '制作中',
              progressPercent: 0,
              progressText: '0/1',
              reviewDate: null,
              reviewPercent: null,
              startDate: '2026-04-14',
              startPercent: 12,
              statusKey: 'active',
              taskCount: 1,
              urgencyKey: 'focus-strong',
            },
          ],
        }}
        onExpandProject={onExpandProject}
      />,
    )

    const rows = view.container.querySelectorAll('.pft-row')
    expect(rows).toHaveLength(2)
    expect(view.container.querySelector('.pft-hidden-count')?.textContent).toBe('另 1 项')
    expect(view.container.querySelectorAll('.pft-axis-tick').length).toBeGreaterThanOrEqual(4)
    expect(view.container.querySelector('.pft-axis-range')?.textContent).toContain('4/12')
    // Today overlay is under rows-shell only (never through axis "今天")
    expect(view.container.querySelector('.pft-rows-shell .pft-today-layer')).not.toBeNull()
    expect(view.container.querySelector('.pft-axis .pft-today-line')).toBeNull()
    expect(view.container.querySelector('.pft-today-band')).not.toBeNull()
    expect(view.container.querySelectorAll('.pft-track .pft-today-band').length).toBe(0)
    expect(rows[0]?.className).toContain('focus-critical')
    expect(rows[0]?.querySelector('.pft-name')?.textContent).toBe('短剧样片')
    expect(rows[0]?.querySelector('.pft-phase')?.textContent).toBe('审查前')
    expect(rows[0]?.textContent).toContain('40%')
    expect(rows[0]?.textContent).toContain('2/5')
    expect(rows[0]?.textContent).toContain('1 项受阻')
    expect(rows[0]?.querySelector('.pft-action')?.getAttribute('data-kind')).toBe('blocked')
    expect(rows[0]?.querySelector('.pft-identity')).not.toBeNull()
    expect(rows[0]?.querySelector('.pft-aside')).not.toBeNull()
    expect(rows[0]?.querySelector('.pft-bar-fill')).not.toBeNull()
    expect(rows[0]?.tagName).toBe('BUTTON')
    expect(rows[0]?.textContent).not.toContain('先出 30 秒样片')
    // 开始 / 审查 / 交付 markers
    expect(rows[0]?.querySelector('.pft-marker--start')).not.toBeNull()
    expect(rows[0]?.querySelector('.pft-marker--review')).not.toBeNull()
    expect(rows[0]?.querySelector('.pft-marker--delivery')).not.toBeNull()
    expect(rows[0]?.querySelector('[data-pft-marker-icon="start"]')).not.toBeNull()
    expect(rows[0]?.querySelector('[data-pft-marker-icon="review"]')).not.toBeNull()
    expect(rows[0]?.querySelector('[data-pft-marker-icon="delivery"]')).not.toBeNull()
    expect(rows[0]?.querySelectorAll('.pft-marker-badge')).toHaveLength(3)
    expect(rows[0]?.querySelector('.pft-marker-label')).toBeNull()
    expect(rows[0]?.querySelector('.pft-marker--start')?.textContent).toBe('')
    expect(rows[0]?.querySelector('.pft-marker--review')?.textContent).toBe('')
    expect(rows[0]?.querySelector('.pft-marker--delivery')?.textContent).toBe('')
    expect(rows[1]?.querySelector('.pft-action')?.getAttribute('data-kind')).toBe('task')
    expect(rows[1]?.querySelector('.pft-bar')?.getAttribute('style')).toContain('--pft-progress-min: 0px')

    act(() => {
      ;(rows[0] as HTMLButtonElement).click()
    })
    expect(onExpandProject).toHaveBeenCalledWith('project-1', expect.any(Number), expect.any(Number))

    view.cleanup()
  })

  it('keeps empty project focus readable', () => {
    const view = renderNode(
      <ProjectFocusTimeline
        model={{
          axisEndDate: '2026-04-24',
          axisEndLabel: '4/24',
          axisStartDate: '2026-04-12',
          axisStartLabel: '4/12',
          axisTicks: [],
          hiddenCount: 0,
          rangeDays: 0,
          rangeLabel: '',
          todayPercent: null,
          items: [],
        }}
        onExpandProject={() => {}}
      />,
    )

    expect(view.container.textContent).toContain('新建项目后，这里会显示排期')
    view.cleanup()
  })

  it('renders people assignment as a 4x4 card grid with reserved slots', () => {
    const people: LegacyPerson[] = [
      { id: 'person-1', name: '王浩然', gender: 'male', status: 'active', skills: ['Cinema 4D', '建模'] },
      { id: 'person-2', name: '佳宁', gender: 'female', status: 'active', skills: ['After Effects', '调色'] },
    ]
    const tasks: LegacyTask[] = [
      { id: 'task-1', title: '需求整理', assigneeId: 'person-1', status: 'todo' },
      { id: 'task-2', title: '渲染输出终版确认结果', assigneeId: 'person-1', status: 'in-progress', priority: 'urgent' },
      { id: 'task-3', assigneeId: 'person-2', status: 'done' },
    ]
    const models = buildPersonCardModels(people, tasks)
    const view = renderNode(
      <PeopleAssignmentPanel
        people={models}
        draggingPersonId={null}
        dragOverPersonId={null}
        draggingTaskId={null}
        onDragLeavePerson={() => {}}
        onDragOverPerson={() => {}}
        onExpand={() => {}}
        onDropToPerson={() => {}}
        onPersonStateChange={() => {}}
        onPersonDragEnd={() => {}}
        onPersonDragStart={() => {}}
        onPersonClick={() => {}}
        onReorderPeople={() => {}}
      />,
    )

    const cards = view.container.querySelectorAll('.person-assignment-card')
    const placeholders = view.container.querySelectorAll('.person-assignment-placeholder')
    const firstCard = cards[0] as HTMLElement | undefined
    const secondCard = cards[1] as HTMLElement | undefined
    const maleMark = view.container.querySelector('.person-assignment-gender-mark.male') as HTMLElement | null
    const femaleMark = view.container.querySelector('.person-assignment-gender-mark.female') as HTMLElement | null
    const firstCardTaskLabel = firstCard?.querySelector('.person-assignment-count') as HTMLElement | null
    const firstCardSkills = firstCard?.querySelectorAll('.person-assignment-skills:not(.person-assignment-skills-measure) .skill-tag')

    expect(view.container.querySelector('.people-assignment-grid')).not.toBeNull()
    expect(cards).toHaveLength(2)
    expect(placeholders).toHaveLength(14)
    expect(firstCard?.textContent).toContain('王浩然')
    expect(firstCardTaskLabel?.textContent).toBe('渲染输出终版确认结果+1')
    expect(firstCardTaskLabel?.querySelector('.person-assignment-task-extra')?.textContent).toBe('+1')
    expect(firstCardSkills?.[0]?.textContent).toBe('Cinema 4D')
    expect(firstCardSkills?.length).toBeGreaterThanOrEqual(1)
    expect(firstCardSkills?.length).toBeLessThanOrEqual(2)
    expect(secondCard?.textContent).toContain('佳宁')
    expect(secondCard?.textContent).toContain('After Effects')
    expect(maleMark?.textContent).toBe('♂')
    expect(femaleMark?.textContent).toBe('♀')
    expect(firstCard?.querySelector('.person-assignment-avatar')).toBeNull()

    view.cleanup()
  })

  it('lets touch users change people pages and clamps a removed page', () => {
    const people = Array.from({ length: 17 }, (_, index): LegacyPerson => ({
      id: `person-${index + 1}`,
      name: `成员${index + 1}`,
      status: 'active',
      skills: [],
    }))
    const view = renderNode(peoplePanelNode(people))
    const secondPageButton = view.container.querySelector<HTMLButtonElement>('[aria-label="第 2 页"]')

    expect(secondPageButton).not.toBeNull()
    act(() => secondPageButton?.click())
    expect(view.container.textContent).toContain('成员17')

    view.rerender(peoplePanelNode(people.slice(0, 1)))
    expect(view.container.textContent).toContain('成员1')
    expect(view.container.querySelector('[aria-label="第 2 页"]')).toBeNull()

    view.cleanup()
  })

  it('shows person shortcut menu and swaps people on reorder drop in the dashboard people panel', () => {
    const onPersonStateChange = vi.fn()
    const onReorderPeople = vi.fn()
    const onPersonClick = vi.fn()
    const view = renderNode(
      <PeopleAssignmentPanel
        people={[
          {
            genderLabel: '女',
            id: 'person-1',
            isInactive: false,
            isOnLeaveToday: false,
            isPresent: true,
            name: '佳宁',
            notePreview: '',
            skills: ['After Effects'],
            statusKey: 'active',
            statusLabel: '在职',
            taskCount: 1,
            topInProgressTaskLabel: '镜头调色',
          },
          {
            genderLabel: '男',
            id: 'person-2',
            isInactive: false,
            isOnLeaveToday: false,
            isPresent: false,
            name: '王浩然',
            notePreview: '',
            skills: ['Cinema 4D'],
            statusKey: 'active',
            statusLabel: '在职',
            taskCount: 2,
            topInProgressTaskLabel: '棚拍执行',
          },
          {
            genderLabel: '男',
            id: 'person-3',
            isInactive: false,
            isOnLeaveToday: true,
            isPresent: false,
            name: '陈乐',
            notePreview: '',
            skills: ['剪辑'],
            statusKey: 'active',
            statusLabel: '在职',
            taskCount: 0,
            topInProgressTaskLabel: '暂无进行中',
          },
        ]}
        draggingPersonId="person-1"
        dragOverPersonId={null}
        draggingTaskId={null}
        onDragLeavePerson={() => {}}
        onDragOverPerson={() => {}}
        onExpand={() => {}}
        onDropToPerson={() => {}}
        onPersonStateChange={onPersonStateChange}
        onPersonDragEnd={() => {}}
        onPersonDragStart={() => {}}
        onPersonClick={onPersonClick}
        onReorderPeople={onReorderPeople}
      />,
    )

    const cards = view.container.querySelectorAll('.person-assignment-card')
    const firstCard = cards[0] as HTMLElement | null
    const thirdCard = cards[2] as HTMLElement | null

    expect(view.container.querySelector('.person-status-mark--present')).not.toBeNull()

    act(() => {
      firstCard?.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 24, clientY: 36 }))
    })

    const buttons = Array.from(document.querySelectorAll('.context-menu-item')) as HTMLButtonElement[]
    expect(buttons.map((button) => button.textContent)).toEqual(['设为在岗', '设为请假', '恢复默认'])

    const leaveButton = buttons.find((button) => button.textContent === '设为请假')
    act(() => {
      leaveButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(onPersonStateChange).toHaveBeenCalledWith('person-1', 'leave')

    act(() => {
      thirdCard?.dispatchEvent(new Event('dragover', { bubbles: true, cancelable: true }))
      thirdCard?.dispatchEvent(new Event('drop', { bubbles: true, cancelable: true }))
    })

    expect(onReorderPeople).toHaveBeenCalledWith(['person-3', 'person-2', 'person-1'])

    view.cleanup()
  })

  it('renders the same person status actions in the left-click detail panel', () => {
    const previousStore = {
      projects: store.projects,
      tasks: store.tasks,
      people: store.people,
      logs: store.logs,
      leaveRecords: store.leaveRecords,
    }
    const onPersonStateChange = vi.fn()

    store.projects = []
    store.tasks = []
    store.people = [
      { id: 'person-1', name: '佳宁', gender: 'female', status: 'active', skills: ['After Effects'] },
    ]
    store.logs = [] as LegacyLog[]
    store.leaveRecords = [] as LeaveRecord[]

    const view = renderNode(
      <ConfirmProvider>
        <ToastProvider>
          <PersonDetailPanel
            personId="person-1"
            personPanelState={{
              order: [],
              presenceByPersonId: {
                'person-1': 'present',
              },
            }}
            onPersonStateChange={onPersonStateChange}
          />
        </ToastProvider>
      </ConfirmProvider>,
    )

    const statusButtons = Array.from(view.container.querySelectorAll('.pdp-presence-button')) as HTMLButtonElement[]
    expect(statusButtons.map((button) => button.textContent)).toEqual(['在岗', '默认', '请假'])
    expect(statusButtons[0]?.getAttribute('aria-pressed')).toBe('true')

    act(() => {
      statusButtons[2]?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(onPersonStateChange).toHaveBeenCalledWith('person-1', 'leave')

    view.cleanup()
    store.projects = previousStore.projects
    store.tasks = previousStore.tasks
    store.people = previousStore.people
    store.logs = previousStore.logs
    store.leaveRecords = previousStore.leaveRecords
  })

  it('marks leave as active in the person detail status controls when there is a leave record today', () => {
    const previousStore = {
      projects: store.projects,
      tasks: store.tasks,
      people: store.people,
      logs: store.logs,
      leaveRecords: store.leaveRecords,
    }

    store.projects = []
    store.tasks = []
    store.people = [
      { id: 'person-1', name: '佳宁', gender: 'female', status: 'active', skills: [] },
    ]
    store.logs = [] as LegacyLog[]
    store.leaveRecords = [{ id: 'leave-1', personId: 'person-1', date: today(), reason: '' }]

    const view = renderNode(
      <ConfirmProvider>
        <ToastProvider>
          <PersonDetailPanel
            personId="person-1"
            personPanelState={{
              order: [],
              presenceByPersonId: {
                'person-1': 'present',
              },
            }}
            onPersonStateChange={() => {}}
          />
        </ToastProvider>
      </ConfirmProvider>,
    )

    const leaveButton = view.container.querySelector('.pdp-presence-button--leave') as HTMLButtonElement | null
    const presentButton = view.container.querySelector('.pdp-presence-button--present') as HTMLButtonElement | null
    expect(leaveButton?.getAttribute('aria-pressed')).toBe('true')
    expect(presentButton?.getAttribute('aria-pressed')).toBe('false')

    view.cleanup()
    store.projects = previousStore.projects
    store.tasks = previousStore.tasks
    store.people = previousStore.people
    store.logs = previousStore.logs
    store.leaveRecords = previousStore.leaveRecords
  })

  it('does not trigger person click when opening a card context menu', () => {
    const onPersonClick = vi.fn()
    const view = renderNode(
      <PeopleAssignmentPanel
        people={[
          {
            genderLabel: '女',
            id: 'person-1',
            isInactive: false,
            isOnLeaveToday: false,
            isPresent: true,
            name: '佳宁',
            notePreview: '',
            skills: ['After Effects'],
            statusKey: 'active',
            statusLabel: '在职',
            taskCount: 1,
            topInProgressTaskLabel: '镜头调色',
          },
        ]}
        draggingPersonId={null}
        dragOverPersonId={null}
        draggingTaskId={null}
        onDragLeavePerson={() => {}}
        onDragOverPerson={() => {}}
        onExpand={() => {}}
        onDropToPerson={() => {}}
        onPersonStateChange={() => {}}
        onPersonDragEnd={() => {}}
        onPersonDragStart={() => {}}
        onPersonClick={onPersonClick}
        onReorderPeople={() => {}}
      />,
    )

    const card = view.container.querySelector('.person-assignment-card') as HTMLElement | null

    act(() => {
      card?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 2 }))
      card?.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 18, clientY: 26, button: 2 }))
      card?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }))
    })

    expect(onPersonClick).not.toHaveBeenCalled()

    view.cleanup()
  })

  it('keeps a dedicated status slot, brighter present styling, leave gray state, hover lift, and reorder transition hooks in people cards', () => {
    const styleSource = readFileSync(join(process.cwd(), 'css/style.css'), 'utf8')
    const cardSource = readFileSync(join(process.cwd(), 'src/features/dashboard/PersonAssignmentCard.tsx'), 'utf8')
    const panelSource = readFileSync(join(process.cwd(), 'src/features/dashboard/PeopleAssignmentPanel.tsx'), 'utf8')
    const cardHoverRule = styleSource.match(/\.person-assignment-card:hover\s*\{[^}]*\}/)?.[0] ?? ''

    expect(styleSource).toMatch(/\.person-assignment-name-row\s*\{/)
    expect(styleSource).toMatch(/\.person-status-mark--present\s*\{[\s\S]*#29dfd3/i)
    expect(styleSource).toMatch(/\.person-assignment-card\.is-present\s*\{[\s\S]*#29dfd3/i)
    expect(styleSource).toMatch(/\.person-assignment-card\.on-leave\s*\{[\s\S]*opacity:\s*\.5[\s\S]*grayscale\(\.85\) brightness\(\.82\)/i)
    expect(cardHoverRule).toMatch(/translateY\(-2px\)/)
    expect(styleSource).toMatch(/@keyframes person-status-pulse/)
    expect(cardSource).toMatch(/event\.button === 2[\s\S]*preventDefault\(\)/)
    expect(panelSource).toMatch(/const pagePeople = useMemo/)
    expect(panelSource).toMatch(/useLayoutEffect/)
    expect(panelSource).toMatch(/\}, \[activePage,\s*pagePeople\]\)/)
    expect(panelSource).not.toMatch(/pagePeopleKey/)
    expect(panelSource).toMatch(/\.animate\(\[/)
  })

  it('keeps the person card task title wide and centers hidden skill count at the bottom', () => {
    const styleSource = readFileSync(join(process.cwd(), 'css/style.css'), 'utf8')
    const cardSource = readFileSync(join(process.cwd(), 'src/features/dashboard/PersonAssignmentCard.tsx'), 'utf8')
    const taskCountRule = styleSource.match(/\.person-assignment-count\s*\{[^}]*\}/)?.[0] ?? ''
    const skillOverflowRule = styleSource.match(/\.person-assignment-skills-overflow\s*\{[^}]*\}/)?.[0] ?? ''

    expect(taskCountRule).not.toMatch(/max-width:\s*calc\(100%\s*-\s*24px\)/)
    // Restored original skills: slice(0,2) + has-skill-overflow + centered bottom +N
    expect(cardSource).toMatch(/model\.skills\.slice\(0,\s*2\)/)
    expect(cardSource).toMatch(/charCount >= 6/)
    expect(cardSource).toMatch(/has-skill-overflow/)
    expect(styleSource).toMatch(/\.person-assignment-skill-list \.skill-tag\s*\{[\s\S]*white-space:\s*normal;[\s\S]*text-overflow:\s*clip;/)
    expect(skillOverflowRule).toMatch(/position:\s*absolute/)
    expect(skillOverflowRule).toMatch(/left:\s*50%/)
    expect(skillOverflowRule).toMatch(/bottom:\s*8px/)
    expect(skillOverflowRule).toMatch(/transform:\s*translateX\(-50%\)/)
  })

  it('keeps task rows and people cards wired for two-way assignment drag targets when task people are missing', () => {
    const tasks: Array<LegacyTask & { people?: LegacyPerson[]; project?: null }> = [
      { id: 'task-1', title: '活动海报 A3 版设计', priority: 'high', status: 'todo', project: null },
    ]
    const people: LegacyPerson[] = [
      { id: 'person-1', name: '王浩然', gender: 'male', status: 'active', skills: ['Cinema 4D'] },
    ]
    const models = buildPersonCardModels(people, [])
    const onTaskDragStart = vi.fn()
    const onTaskDragEnd = vi.fn()
    const onTaskDragOver = vi.fn()
    const onTaskDragLeave = vi.fn()
    const onDropToTask = vi.fn()
    const onPersonDragStart = vi.fn()
    const onPersonDragEnd = vi.fn()
    const onPersonDragOver = vi.fn()
    const onPersonDragLeave = vi.fn()
    const onDropToPerson = vi.fn()

    const taskView = renderNode(
      <TaskPoolPanel
        dragOverTaskId="task-1"
        draggingPersonId="person-1"
        onDragLeaveTask={onTaskDragLeave}
        onDragOverTask={onTaskDragOver}
        onDropToTask={onDropToTask}
        onExpand={() => {}}
        onTaskDragEnd={onTaskDragEnd}
        onTaskDragStart={onTaskDragStart}
        tasks={tasks}
      />,
    )
    const peopleView = renderNode(
      <PeopleAssignmentPanel
        people={models}
        draggingPersonId={null}
        dragOverPersonId="person-1"
        draggingTaskId="task-1"
        onDragLeavePerson={onPersonDragLeave}
        onDragOverPerson={onPersonDragOver}
        onExpand={() => {}}
        onDropToPerson={onDropToPerson}
        onPersonStateChange={() => {}}
        onPersonDragEnd={onPersonDragEnd}
        onPersonDragStart={onPersonDragStart}
        onPersonClick={() => {}}
        onReorderPeople={() => {}}
      />,
    )

    const taskRow = taskView.container.querySelector('.task-row') as HTMLElement | null
    const personCard = peopleView.container.querySelector('.person-assignment-card') as HTMLElement | null

    expect(taskRow?.className).toContain('drop-target')
    expect(personCard?.className).toContain('drop-target')
    expect(taskView.container.textContent).toContain('未分配')

    act(() => {
      taskRow?.dispatchEvent(new Event('dragstart', { bubbles: true, cancelable: true }))
      taskRow?.dispatchEvent(new Event('dragover', { bubbles: true, cancelable: true }))
      taskRow?.dispatchEvent(new Event('dragleave', { bubbles: true, cancelable: true }))
      taskRow?.dispatchEvent(new Event('drop', { bubbles: true, cancelable: true }))
      taskRow?.dispatchEvent(new Event('dragend', { bubbles: true, cancelable: true }))
      personCard?.dispatchEvent(new Event('dragstart', { bubbles: true, cancelable: true }))
      personCard?.dispatchEvent(new Event('dragover', { bubbles: true, cancelable: true }))
      personCard?.dispatchEvent(new Event('dragleave', { bubbles: true, cancelable: true }))
      personCard?.dispatchEvent(new Event('drop', { bubbles: true, cancelable: true }))
      personCard?.dispatchEvent(new Event('dragend', { bubbles: true, cancelable: true }))
    })

    expect(onTaskDragStart).toHaveBeenCalledTimes(1)
    expect(onTaskDragOver).toHaveBeenCalledTimes(1)
    expect(onTaskDragLeave).toHaveBeenCalledTimes(1)
    expect(onDropToTask).toHaveBeenCalledTimes(1)
    expect(onTaskDragEnd).toHaveBeenCalledTimes(1)
    expect(onPersonDragStart).toHaveBeenCalledTimes(1)
    expect(onPersonDragOver).toHaveBeenCalledTimes(1)
    expect(onPersonDragLeave).toHaveBeenCalledTimes(1)
    expect(onDropToPerson).toHaveBeenCalledTimes(1)
    expect(onPersonDragEnd).toHaveBeenCalledTimes(1)

    taskView.cleanup()
    peopleView.cleanup()
  })

  it('renders task row meta with readable assignee names and plain deadline text on the right', () => {
    const people: LegacyPerson[] = [
      { id: 'person-1', name: '王浩然', gender: 'male', status: 'active', skills: ['Cinema 4D'] },
      { id: 'person-2', name: '佳宁', gender: 'female', status: 'active', skills: ['After Effects'] },
      { id: 'person-3', name: '思敏', gender: 'female', status: 'active', skills: ['包装'] },
    ]
    const project: LegacyProject = { id: 'project-1', name: '品牌宣传片第三季' }
    const tasks: Array<LegacyTask & { people?: LegacyPerson[]; project?: LegacyProject | null }> = [
      {
        id: 'task-1',
        title: '客户修改版渲染输出',
        status: 'todo',
        priority: 'high',
        endDate: '2026-04-14',
        people,
        project,
      },
    ]

    const view = renderNode(
      <TaskPoolPanel
        dragOverTaskId={null}
        draggingPersonId={null}
        onDragLeaveTask={() => {}}
        onDragOverTask={() => {}}
        onDropToTask={() => {}}
        onExpand={() => {}}
        onTaskDragEnd={() => {}}
        onTaskDragStart={() => {}}
        tasks={tasks}
      />,
    )

    expect(view.container.textContent).toContain('负责人')
    expect(view.container.textContent).toContain('王浩然')
    expect(view.container.textContent).toContain('佳宁')
    expect(view.container.textContent).toContain('思敏')
    expect(view.container.textContent).toContain('项目')
    expect(view.container.textContent).toContain('品牌宣传片第三季')
    expect(view.container.querySelector('.task-row-deadline')?.textContent).toBe('4/14')
    expect(view.container.querySelector('.task-meta-chip.is-deadline')).toBeNull()
    expect(view.container.querySelector('.task-pool-avatar')).toBeNull()

    view.cleanup()
  })

  it('opens an exclusive task detail card from the clicked row center and closes outside', () => {
    const people: LegacyPerson[] = [
      { id: 'person-1', name: '王浩然', gender: 'male', status: 'active', skills: ['Cinema 4D'] },
    ]
    const project: LegacyProject = { id: 'project-1', name: '品牌宣传片第三季' }
    const tasks: Array<LegacyTask & { people?: LegacyPerson[]; project?: LegacyProject | null }> = [
      {
        id: 'task-1',
        title: '客户修改版渲染输出',
        status: 'in-progress',
        priority: 'urgent',
        startDate: '2026-04-12',
        endDate: '2026-04-14',
        estimatedHours: 4,
        description: '确认客户反馈后输出最终渲染文件。',
        people,
        project,
      },
      {
        id: 'task-2',
        title: '片头动画调整',
        status: 'todo',
        priority: 'high',
        description: '调整前 3 秒入场节奏。',
        people: [],
        project,
      },
    ]

    const view = renderNode(
      <ToastProvider>
        <TaskPoolPanel
          dragOverTaskId={null}
          draggingPersonId={null}
          onDragLeaveTask={() => {}}
          onDragOverTask={() => {}}
          onDropToTask={() => {}}
          onExpand={() => {}}
          onTaskDragEnd={() => {}}
          onTaskDragStart={() => {}}
          tasks={tasks}
        />
      </ToastProvider>,
    )

    expect(view.container.querySelector('.task-detail-float-layer')).toBeNull()

    act(() => {
      view.container.querySelector('.task-row')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    const layer = view.container.querySelector('.task-detail-float-layer') as HTMLElement | null
    const card = view.container.querySelector('.task-detail-card') as HTMLElement | null

    expect(view.container.querySelector('.task-row--active')).not.toBeNull()
    expect(layer).not.toBeNull()
    expect(card).not.toBeNull()
    expect(card?.className).toContain('priority-urgent')
    expect(card?.style.transformOrigin).toBe('0px 0px')
    expect(card?.textContent).toContain('确认客户反馈后输出最终渲染文件。')
    expect(card?.querySelector('.task-detail-card-close')).toBeNull()
    expect(card?.querySelector('.task-detail-card-action[aria-label="编辑任务"]')).not.toBeNull()
    expect(card?.querySelector('.task-detail-card-action[aria-label="删除任务"]')).not.toBeNull()
    expect(card?.querySelector('.task-detail-card-action')?.textContent?.trim()).toBe('')
    expect(view.container.textContent).toContain('进行中')
    expect(view.container.textContent).toContain('紧急')
    expect(view.container.textContent).toContain('王浩然')
    expect(view.container.textContent).toContain('品牌宣传片第三季')
    expect(view.container.textContent).toContain('4 小时')
    expect(view.container.textContent).toContain('4/14')
    expect(card?.textContent).not.toContain('开始')
    expect(card?.textContent).not.toContain('项目品牌宣传片第三季')

    act(() => {
      card?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(view.container.querySelector('.task-detail-float-layer')).toBeNull()

    act(() => {
      view.container.querySelector('.task-row')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    const editButton = view.container.querySelector('.task-detail-card-action[aria-label="编辑任务"]') as HTMLElement | null

    act(() => {
      editButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(view.container.querySelector('.task-detail-float-layer')).toBeNull()
    expect(document.body.querySelector('.task-dialog-from-detail')).not.toBeNull()

    view.cleanup()
  })

  it('keeps an open task detail card synced with the current task row data', () => {
    const renderPanel = (tasks: Array<LegacyTask & { people?: LegacyPerson[]; project?: LegacyProject | null }>) => (
      <TaskPoolPanel
        dragOverTaskId={null}
        draggingPersonId={null}
        onDragLeaveTask={() => {}}
        onDragOverTask={() => {}}
        onDropToTask={() => {}}
        onExpand={() => {}}
        onTaskDragEnd={() => {}}
        onTaskDragStart={() => {}}
        tasks={tasks}
      />
    )
    const view = renderNode(renderPanel([
      {
        id: 'task-1',
        title: '初版渲染',
        status: 'todo',
        priority: 'medium',
        description: '等待开始。',
        project: null,
      },
    ]))

    act(() => {
      view.container.querySelector('.task-row')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(view.container.querySelector('.task-detail-card')?.textContent).toContain('待处理')

    view.rerender(renderPanel([
      {
        id: 'task-1',
        title: '终版渲染',
        status: 'done',
        priority: 'high',
        description: '已经完成。',
        project: null,
      },
    ]))

    const card = view.container.querySelector('.task-detail-card') as HTMLElement | null
    expect(card?.textContent).toContain('终版渲染')
    expect(card?.textContent).toContain('完成')
    expect(card?.textContent).toContain('已经完成。')
    expect(card?.textContent).not.toContain('初版渲染')
    expect(card?.textContent).not.toContain('等待开始。')

    view.cleanup()
  })

  it('closes an open task detail card when the selected task is removed', () => {
    const renderPanel = (tasks: Array<LegacyTask & { people?: LegacyPerson[]; project?: LegacyProject | null }>) => (
      <TaskPoolPanel
        dragOverTaskId={null}
        draggingPersonId={null}
        onDragLeaveTask={() => {}}
        onDragOverTask={() => {}}
        onDropToTask={() => {}}
        onExpand={() => {}}
        onTaskDragEnd={() => {}}
        onTaskDragStart={() => {}}
        tasks={tasks}
      />
    )
    const view = renderNode(renderPanel([
      {
        id: 'task-1',
        title: '需要删除的任务',
        status: 'todo',
        priority: 'medium',
        project: null,
      },
    ]))

    act(() => {
      view.container.querySelector('.task-row')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(view.container.querySelector('.task-detail-card')?.textContent).toContain('需要删除的任务')

    view.rerender(renderPanel([]))

    expect(view.container.querySelector('.task-detail-float-layer')).toBeNull()

    view.cleanup()
  })

  it('keeps task detail card color on the border and uses centered non-bouncy growth', () => {
    const styleSource = readFileSync(join(process.cwd(), 'css/style.css'), 'utf8')
    const componentSource = readFileSync(join(process.cwd(), 'src/features/dashboard/TaskPoolPanel.tsx'), 'utf8')
    const cardRule = styleSource.match(/\.task-detail-card\s*\{[\s\S]*?\n\}/)?.[0] ?? ''
    const darkLayerRule = styleSource.match(/\[data-theme='dark'\]\s+\.task-detail-float-layer\s*\{[\s\S]*?\n\}/)?.[0] ?? ''
    const growKeyframes = styleSource.match(/@keyframes task-detail-card-grow\s*\{[\s\S]*?\n\}/)?.[0] ?? ''

    expect(cardRule).toContain('border:')
    expect(cardRule).not.toContain('inset')
    expect(growKeyframes).toContain('scale(.92)')
    expect(growKeyframes).not.toContain('1.018')
    expect(growKeyframes).not.toContain('65%')
    expect(growKeyframes).not.toContain('scale(.96)')
    expect(componentSource).toContain('rowCenterX - width / 2')
    expect(componentSource).toContain('rowCenterY - estimatedHeight / 2')
    expect(darkLayerRule).toContain('rgba(2, 6, 23')
    expect(darkLayerRule).not.toContain('248, 250, 255')
  })

  it('derives removed task detail visibility without synchronously setting state in an effect', () => {
    const componentSource = readFileSync(join(process.cwd(), 'src/features/dashboard/TaskPoolPanel.tsx'), 'utf8')

    expect(componentSource).not.toMatch(/useEffect\(\(\) => \{\s*if \(!activeDetailTaskId\) return[\s\S]*?setDetailState\(null\)[\s\S]*?\}, \[activeDetailTaskId, tasks\]\)/)
  })
})
