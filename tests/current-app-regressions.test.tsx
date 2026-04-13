// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { Dialog } from '../src/components/ui/Dialog'
import { formatLocalDateKey, normalizeImportedBackup } from '../src/legacy/utils'
import { getAssignableTasks } from '../src/features/planner/plannerUtils'
import { ContextMenu } from '../src/components/ui/ContextMenu'

describe('current app regressions', () => {
  it('formats local calendar dates without UTC rollback', () => {
    const localMidnight = new Date('2026-04-12T00:30:00+08:00')

    expect(formatLocalDateKey(localMidnight)).toBe('2026-04-12')
  })

  it('normalizes imported backups while preserving logs and settings metadata', () => {
    const normalized = normalizeImportedBackup({
      projects: [{ id: 'project-1' }],
      tasks: [{ id: 'task-1' }],
      people: [{ id: 'person-1' }],
      logs: [{ id: 'log-1', text: '导出', ts: '2026-04-12T10:00:00+08:00' }],
      settings: [{ key: 'theme', value: 'dark' }],
      schemaVersion: 2,
      exportedAt: '2026-04-12T10:00:00+08:00',
    })

    expect(normalized.schemaVersion).toBe(2)
    expect(normalized.logs).toHaveLength(1)
    expect(normalized.settings).toEqual([{ key: 'theme', value: 'dark' }])
  })

  it('closes the React dialog exactly once on backdrop click', () => {
    const onClose = vi.fn()
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)

    act(() => {
      root.render(
        <Dialog open title="测试弹窗" onClose={onClose}>
          <div>内容</div>
        </Dialog>,
      )
    })

    const backdrop = container.querySelector('.dialog-backdrop')
    expect(backdrop).not.toBeNull()

    act(() => {
      backdrop?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(onClose).toHaveBeenCalledTimes(1)

    act(() => {
      root.unmount()
    })
    container.remove()
  })

  it('executes context menu actions and closes after clicking an item', () => {
    const onSelect = vi.fn()
    const onClose = vi.fn()
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)

    act(() => {
      root.render(
        <ContextMenu
          open
          x={32}
          y={48}
          title="快速更新"
          items={[
            { key: 'todo', label: '待处理', onSelect },
          ]}
          onClose={onClose}
        />,
      )
    })

    const item = container.querySelector('.context-menu-item')
    expect(item).not.toBeNull()

    act(() => {
      item?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)

    act(() => {
      root.unmount()
    })
    container.remove()
  })

  it('keeps planner assignment list limited to unscheduled actionable tasks', () => {
    const tasks = [
      { id: 'task-open', title: '正常任务', status: 'todo', scheduledDate: null },
      { id: 'task-doing', title: '进行中任务', status: 'in-progress', scheduledDate: null },
      { id: 'task-blocked', title: '受阻任务', status: 'blocked', scheduledDate: null },
      { id: 'task-done', title: '完成任务', status: 'done', scheduledDate: null },
      { id: 'task-scheduled', title: '已排期任务', status: 'todo', scheduledDate: '2026-04-12' },
    ]

    expect(getAssignableTasks(tasks).map((task) => task.id)).toEqual([
      'task-open',
      'task-doing',
    ])
  })

  it('keeps the current React entry free from legacy bootstrap imports', () => {
    const appSource = readFileSync(join(process.cwd(), 'src/App.tsx'), 'utf8')

    expect(appSource).not.toMatch(/\.\.\/js\/app\.js/)
  })

  it('keeps current React views free from legacy DOM component imports', () => {
    const currentViews = [
      'src/views/Calendar.tsx',
      'src/views/Dashboard.tsx',
      'src/views/Projects.tsx',
      'src/views/Tasks.tsx',
      'src/views/People.tsx',
      'src/views/Settings.tsx',
    ]

    for (const path of currentViews) {
      const source = readFileSync(join(process.cwd(), path), 'utf8')
      expect(source).not.toMatch(/\.\.\/\.\.\/js\/components\.js/)
      expect(source).not.toMatch(/\.\.\/\.\.\/js\/views\/calendar\.js/)
    }
  })

  it('moves page dialogs and shared menus into dedicated component files', () => {
    const expectedFiles = [
      'src/features/projects/ProjectDialog.tsx',
      'src/features/projects/ProjectCard.tsx',
      'src/features/projects/ProjectTimeline.tsx',
      'src/features/tasks/TaskDialog.tsx',
      'src/features/tasks/TaskItem.tsx',
      'src/features/people/PersonDialog.tsx',
      'src/features/people/PersonCard.tsx',
      'src/components/ui/ContextMenu.tsx',
      'src/legacy/actions.ts',
      'src/features/dashboard/TaskPoolPanel.tsx',
      'src/features/dashboard/PeopleAssignmentPanel.tsx',
      'src/features/dashboard/FocusPrimaryCard.tsx',
      'src/features/dashboard/FocusSecondaryCards.tsx',
      'src/features/dashboard/DashboardHeader.tsx',
      'src/features/dashboard/DashboardMiniCalendar.tsx',
      'src/features/planner/PlannerAssignedList.tsx',
      'src/features/planner/PlannerBacklogList.tsx',
      'src/features/planner/PlannerDropZone.tsx',
    ]

    for (const path of expectedFiles) {
      expect(existsSync(join(process.cwd(), path))).toBe(true)
    }

    const projectsSource = readFileSync(join(process.cwd(), 'src/views/Projects.tsx'), 'utf8')
    const tasksSource = readFileSync(join(process.cwd(), 'src/views/Tasks.tsx'), 'utf8')
    const peopleSource = readFileSync(join(process.cwd(), 'src/views/People.tsx'), 'utf8')

    expect(projectsSource).toMatch(/features\/projects\/ProjectDialog/)
    expect(projectsSource).toMatch(/features\/projects\/ProjectCard/)
    expect(projectsSource).toMatch(/features\/projects\/ProjectTimeline/)
    expect(tasksSource).toMatch(/features\/tasks\/TaskDialog/)
    expect(tasksSource).toMatch(/features\/tasks\/TaskItem/)
    expect(peopleSource).toMatch(/features\/people\/PersonDialog/)
    expect(peopleSource).toMatch(/features\/people\/PersonCard/)
    expect(projectsSource).toMatch(/components\/ui\/ContextMenu/)
    expect(tasksSource).toMatch(/components\/ui\/ContextMenu/)

    expect(projectsSource).not.toMatch(/function ProjectDialog/)
    expect(projectsSource).not.toMatch(/function ProjectCard/)
    expect(projectsSource).not.toMatch(/function ProjectTimeline/)
    expect(tasksSource).not.toMatch(/function TaskDialog/)
    expect(tasksSource).not.toMatch(/function TaskItem/)
    expect(peopleSource).not.toMatch(/function PersonDialog/)
    expect(peopleSource).not.toMatch(/function PersonCard/)
  })

  it('removes the legacy js view layer from the active codebase', () => {
    expect(existsSync(join(process.cwd(), 'js/views/tasks.js'))).toBe(false)
    expect(existsSync(join(process.cwd(), 'js/components.js'))).toBe(false)
  })

  it('keeps planner drag feedback state-driven instead of mutating DOM styles in handlers', () => {
    const plannerSource = readFileSync(join(process.cwd(), 'src/features/planner/PlannerProvider.tsx'), 'utf8')
    const assignedListSource = readFileSync(join(process.cwd(), 'src/features/planner/PlannerAssignedList.tsx'), 'utf8')
    const backlogListSource = readFileSync(join(process.cwd(), 'src/features/planner/PlannerBacklogList.tsx'), 'utf8')

    expect(plannerSource).not.toMatch(/currentTarget\.style/)
    expect(assignedListSource).toMatch(/PlannerDropZone/)
    expect(assignedListSource).not.toMatch(/currentTarget\.style/)
    expect(backlogListSource).not.toMatch(/currentTarget\.style/)
    expect(backlogListSource).toMatch(/draggable/)
  })

  it('uses one shared selector for calendar and planner event aggregation', () => {
    const dashboardSource = readFileSync(join(process.cwd(), 'src/views/Dashboard.tsx'), 'utf8')
    const calendarSource = readFileSync(join(process.cwd(), 'src/views/Calendar.tsx'), 'utf8')
    const plannerSource = readFileSync(join(process.cwd(), 'src/features/planner/PlannerProvider.tsx'), 'utf8')

    expect(dashboardSource).toMatch(/buildProjectEventSummaryMap/)
    expect(calendarSource).toMatch(/buildProjectEventSummaryMap/)
    expect(plannerSource).toMatch(/buildProjectEventSummaryMap/)
    expect(plannerSource).toMatch(/getProjectEventsForDate/)
  })

  it('keeps dashboard assignment drag feedback state-driven and split into dedicated panels', () => {
    const dashboardSource = readFileSync(join(process.cwd(), 'src/views/Dashboard.tsx'), 'utf8')

    expect(dashboardSource).not.toMatch(/classList\.add/)
    expect(dashboardSource).not.toMatch(/classList\.remove/)
    expect(dashboardSource).toMatch(/TaskPoolPanel/)
    expect(dashboardSource).toMatch(/PeopleAssignmentPanel/)
  })

  it('keeps dashboard secondary focus cards driven by a selector instead of inline task math', () => {
    const dashboardSource = readFileSync(join(process.cwd(), 'src/views/Dashboard.tsx'), 'utf8')

    expect(dashboardSource).toMatch(/buildDashboardFocusCards/)
    expect(dashboardSource).not.toMatch(/const projectTasks =/)
    expect(dashboardSource).not.toMatch(/const nextMilestone =/)
  })

  it('keeps dashboard focus area split into dedicated components', () => {
    const dashboardSource = readFileSync(join(process.cwd(), 'src/views/Dashboard.tsx'), 'utf8')

    expect(dashboardSource).toMatch(/FocusPrimaryCard/)
    expect(dashboardSource).toMatch(/FocusSecondaryCards/)
    expect(dashboardSource).toMatch(/DashboardHeader/)
    expect(dashboardSource).toMatch(/DashboardMiniCalendar/)
    expect(dashboardSource).not.toMatch(/focus-highlight-head/)
    expect(dashboardSource).not.toMatch(/focus-card-milestone/)
    expect(dashboardSource).not.toMatch(/dash-date-block/)
    expect(dashboardSource).not.toMatch(/mini-cal-header/)
  })

  it('uses node24-compatible GitHub Pages actions in deploy workflow', () => {
    const workflowSource = readFileSync(join(process.cwd(), '.github/workflows/deploy.yml'), 'utf8')
    const localPagesArtifactSource = readFileSync(join(process.cwd(), '.github/actions/upload-pages-artifact/action.yml'), 'utf8')

    expect(workflowSource).toMatch(/actions\/configure-pages@v6/)
    expect(workflowSource).toMatch(/actions\/deploy-pages@v5/)
    expect(workflowSource).toMatch(/uses:\s+\.\/\.github\/actions\/upload-pages-artifact/)
    expect(workflowSource).toMatch(/node-version:\s*24/)
    expect(workflowSource).not.toMatch(/actions\/upload-pages-artifact@v4/)
    expect(localPagesArtifactSource).toMatch(/actions\/upload-artifact@v6/)
  })

  it('redirects the GitHub Pages root entry to vc', () => {
    const workflowSource = readFileSync(join(process.cwd(), '.github/workflows/deploy.yml'), 'utf8')

    expect(workflowSource).toMatch(/url=\/118-Studio-Manager\/vc\//)
    expect(workflowSource).toMatch(/Redirecting to <a href="\/118-Studio-Manager\/vc\/">/)
    expect(workflowSource).not.toMatch(/url=\/118-Studio-Manager\/v1\//)
  })

  it('keeps dashboard skill tags clipped inside compact person cards', () => {
    const styleSource = readFileSync(join(process.cwd(), 'css/style.css'), 'utf8')

    expect(styleSource).toMatch(/\.skill-tag\s*\{/)
    expect(styleSource).toMatch(/max-width:\s*100%/)
    expect(styleSource).toMatch(/text-overflow:\s*ellipsis/)
    expect(styleSource).toMatch(/overflow:\s*hidden/)
  })
})
