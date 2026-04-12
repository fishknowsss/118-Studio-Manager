// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { renderTasks } from '../js/views/tasks.js'
import { openPlanner } from '../js/views/calendar.js'
import { openModal } from '../js/components.js'
import { store } from '../js/store.js'

function mountShell(extra = '') {
  document.body.innerHTML = `
    <div id="root"></div>
    <dialog id="app-modal">
      <div id="modal-title"></div>
      <button id="modal-close" type="button">close</button>
      <div id="modal-body"></div>
      <div id="modal-footer"></div>
    </dialog>
    <div id="toast-root"></div>
    <div id="planner-panel">
      <div id="planner-overlay"></div>
      <div id="planner-content"></div>
    </div>
    ${extra}
  `

  const modal = document.getElementById('app-modal')
  modal.showModal = vi.fn()
  modal.close = vi.fn()

  return { modal }
}

beforeEach(() => {
  store.projects = []
  store.tasks = []
  store.people = []
  store.logs = []
  mountShell()
})

describe('review fixes', () => {
  it('defines theme-aware surfaces for dialogs and native controls', () => {
    const stylesheet = readFileSync(join(process.cwd(), 'css/style.css'), 'utf8')

    expect(stylesheet).toMatch(/:root\s*\{[\s\S]*color-scheme:\s*light;/)
    expect(stylesheet).toMatch(/\[data-theme='dark'\]\s*\{[\s\S]*color-scheme:\s*dark;/)
    expect(stylesheet).toMatch(/\.app-modal\s*\{[\s\S]*background:\s*var\(--c-surface\);/)
    expect(stylesheet).toMatch(/\.confirm-modal\s*\{[\s\S]*background:\s*var\(--c-surface\);/)
    expect(stylesheet).toMatch(/\.form-input,\s*\.filter-select,\s*\.filter-input,\s*\.skill-add-input\s*\{[\s\S]*color-scheme:\s*inherit;/)
  })

  it('keeps an inactive assignee selected when editing a task', () => {
    const inactivePerson = { id: 'person-1', name: '停用成员', status: 'inactive' }
    store.people = [inactivePerson]
    store.tasks = [
      {
        id: 'task-1',
        title: '已有负责人',
        status: 'todo',
        priority: 'medium',
        assigneeId: inactivePerson.id,
      },
    ]

    const container = document.createElement('div')
    document.body.appendChild(container)

    renderTasks(container)
    container.querySelector('[data-action="edit"]').click()

    const assigneeSelect = document.querySelector('[name="assigneeId"]')
    expect(assigneeSelect.value).toBe(inactivePerson.id)
    expect([...assigneeSelect.options].some(option => option.value === inactivePerson.id)).toBe(true)
  })

  it('does not accumulate backdrop listeners across modal openings', () => {
    const { modal } = mountShell()

    openModal({ title: '第一次', body: document.createElement('div') })
    openModal({ title: '第二次', body: document.createElement('div') })

    modal.close.mockClear()
    modal.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    expect(modal.close).toHaveBeenCalledTimes(1)
  })

  it('excludes blocked tasks from planner assignment list', () => {
    store.people = [{ id: 'person-1', name: '张三', status: 'active' }]
    store.tasks = [
      { id: 'task-open', title: '正常任务', status: 'todo', scheduledDate: null, assigneeId: null },
      { id: 'task-blocked', title: '受阻任务', status: 'blocked', scheduledDate: null, assigneeId: null },
    ]

    openPlanner('2026-04-12')

    const plannerText = document.getElementById('planner-unassigned-rows').textContent
    expect(plannerText).toContain('正常任务')
    expect(plannerText).not.toContain('受阻任务')
  })

  it('runs lint in the deploy workflow before build', () => {
    const workflow = readFileSync(join(process.cwd(), '.github/workflows/deploy.yml'), 'utf8')

    expect(workflow).toMatch(/npm run lint/)
  })
})
