// @vitest-environment jsdom

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { ReactNode } from 'react'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it, vi } from 'vitest'
import { PeopleAssignmentPanel } from '../src/features/dashboard/PeopleAssignmentPanel'
import { TaskPoolPanel } from '../src/features/dashboard/TaskPoolPanel'
import { buildPersonCardModels } from '../src/legacy/selectors'
import type { LegacyPerson, LegacyProject, LegacyTask } from '../src/legacy/store'

function renderNode(node: ReactNode) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)

  act(() => {
    root.render(node)
  })

  return {
    container,
    root,
    cleanup() {
      act(() => {
        root.unmount()
      })
      container.remove()
    },
  }
}

describe('dashboard panels', () => {
  it('keeps the dashboard lower layout balanced between task pool and people panels', () => {
    const styleSource = readFileSync(join(process.cwd(), 'css/style.css'), 'utf8')

    expect(styleSource).toMatch(/\.dash-bottom\s*\{[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s+minmax\(0,\s*1fr\)\s+minmax\(280px,\s*0\.88fr\)/)
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
    expect(firstCardTaskLabel?.textContent).toBe('渲染输出终版确…+1')
    expect(firstCardSkills?.[0]?.textContent).toBe('Cinema 4D')
    expect(secondCard?.textContent).toContain('佳宁')
    expect(secondCard?.textContent).toContain('After Effects')
    expect(maleMark?.textContent).toBe('♂')
    expect(femaleMark?.textContent).toBe('♀')
    expect(firstCard?.querySelector('.person-assignment-avatar')).toBeNull()

    view.cleanup()
  })

  it('shows person shortcut menu and keeps adjacent people reorder working in the dashboard people panel', () => {
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
    const secondCard = cards[1] as HTMLElement | null

    expect(view.container.querySelector('.person-status-mark--present')).not.toBeNull()

    act(() => {
      firstCard?.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 24, clientY: 36 }))
    })

    const buttons = Array.from(view.container.querySelectorAll('.context-menu-item')) as HTMLButtonElement[]
    expect(buttons.map((button) => button.textContent)).toEqual(['设为在岗', '设为请假', '恢复默认'])

    const leaveButton = buttons.find((button) => button.textContent === '设为请假')
    act(() => {
      leaveButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(onPersonStateChange).toHaveBeenCalledWith('person-1', 'leave')

    act(() => {
      secondCard?.dispatchEvent(new Event('dragover', { bubbles: true, cancelable: true }))
      secondCard?.dispatchEvent(new Event('drop', { bubbles: true, cancelable: true }))
    })

    expect(onReorderPeople).toHaveBeenCalledWith(['person-2', 'person-1', 'person-3'])

    view.cleanup()
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
    expect(panelSource).toMatch(/const pagePeopleKey = pagePeople\.map\(\(person\) => person\.id\)\.join\('\|'\)/)
    expect(panelSource).toMatch(/useLayoutEffect/)
    expect(panelSource).toMatch(/\}, \[page,\s*pagePeopleKey\]\)/)
    expect(panelSource).not.toMatch(/\}, \[page,\s*pagePeople\]\)/)
    expect(panelSource).toMatch(/\.animate\(\[/)
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
})
