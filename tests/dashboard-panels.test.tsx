// @vitest-environment jsdom

import type { ReactNode } from 'react'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it, vi } from 'vitest'
import { PeopleAssignmentPanel } from '../src/features/dashboard/PeopleAssignmentPanel'
import { TaskPoolPanel } from '../src/features/dashboard/TaskPoolPanel'
import { buildPersonCardModels } from '../src/legacy/selectors'
import type { LegacyPerson, LegacyTask } from '../src/legacy/store'

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
  it('renders people assignment as a 3x5 card grid with reserved slots', () => {
    const people: LegacyPerson[] = [
      { id: 'person-1', name: '王浩然', gender: 'male', status: 'active', skills: ['Cinema 4D', '建模'] },
      { id: 'person-2', name: '佳宁', gender: 'female', status: 'active', skills: ['After Effects', '调色'] },
    ]
    const tasks: LegacyTask[] = [
      { id: 'task-1', assigneeId: 'person-1', status: 'todo' },
      { id: 'task-2', assigneeId: 'person-1', status: 'in-progress' },
      { id: 'task-3', assigneeId: 'person-2', status: 'done' },
    ]
    const models = buildPersonCardModels(people, tasks)
    const view = renderNode(
      <PeopleAssignmentPanel
        people={models}
        dragOverPersonId={null}
        draggingTaskId={null}
        onDragLeavePerson={() => {}}
        onDragOverPerson={() => {}}
        onDropToPerson={() => {}}
        onNavigatePeople={() => {}}
        onPersonDragEnd={() => {}}
        onPersonDragStart={() => {}}
      />,
    )

    const cards = view.container.querySelectorAll('.person-assignment-card')
    const placeholders = view.container.querySelectorAll('.person-assignment-placeholder')
    const firstCard = cards[0] as HTMLElement | undefined
    const secondCard = cards[1] as HTMLElement | undefined
    const maleMark = view.container.querySelector('.person-assignment-gender-mark.male') as HTMLElement | null
    const femaleMark = view.container.querySelector('.person-assignment-gender-mark.female') as HTMLElement | null

    expect(view.container.querySelector('.people-assignment-grid')).not.toBeNull()
    expect(cards).toHaveLength(2)
    expect(placeholders).toHaveLength(13)
    expect(firstCard?.textContent).toContain('王浩然')
    expect(firstCard?.textContent).toContain('Cinema 4D')
    expect(firstCard?.textContent).toContain('2 任务')
    expect(secondCard?.textContent).toContain('佳宁')
    expect(secondCard?.textContent).toContain('After Effects')
    expect(maleMark?.textContent).toBe('♂')
    expect(femaleMark?.textContent).toBe('♀')
    expect(firstCard?.querySelector('.person-assignment-avatar')).toBeNull()

    view.cleanup()
  })

  it('keeps task rows and people cards wired for two-way assignment drag targets', () => {
    const tasks: Array<LegacyTask & { person?: LegacyPerson | null; project?: null }> = [
      { id: 'task-1', title: '活动海报 A3 版设计', priority: 'high', status: 'todo', person: null, project: null },
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
        onNavigateTasks={() => {}}
        onTaskDragEnd={onTaskDragEnd}
        onTaskDragStart={onTaskDragStart}
        tasks={tasks}
      />,
    )
    const peopleView = renderNode(
      <PeopleAssignmentPanel
        people={models}
        dragOverPersonId="person-1"
        draggingTaskId="task-1"
        onDragLeavePerson={onPersonDragLeave}
        onDragOverPerson={onPersonDragOver}
        onDropToPerson={onDropToPerson}
        onNavigatePeople={() => {}}
        onPersonDragEnd={onPersonDragEnd}
        onPersonDragStart={onPersonDragStart}
      />,
    )

    const taskRow = taskView.container.querySelector('.task-row') as HTMLElement | null
    const personCard = peopleView.container.querySelector('.person-assignment-card') as HTMLElement | null

    expect(taskRow?.className).toContain('drop-target')
    expect(personCard?.className).toContain('drop-target')

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
})
