// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { ToastProvider } from '../src/components/feedback/ToastProvider'
import { Dialog } from '../src/components/ui/Dialog'
import { buildTaskExportRows } from '../src/legacy/selectors'
import { downloadFile, formatLocalDateKey, normalizeImportedBackup, toCSV } from '../src/legacy/utils'
import { getAssignableTasks } from '../src/features/planner/plannerUtils'
import { ContextMenu } from '../src/components/ui/ContextMenu'
import { TaskDialog } from '../src/features/tasks/TaskDialog'

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

  it('prepends a UTF-8 BOM for CSV downloads so Chinese text opens correctly', async () => {
    let capturedBlob: Blob | null = null
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockImplementation((value) => {
      capturedBlob = value as Blob
      return 'blob:test'
    })
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    downloadFile('标题,内容\n中文,测试', 'test.csv', 'text/csv;charset=utf-8')

    expect(capturedBlob).not.toBeNull()
  const bytes = new Uint8Array(await capturedBlob!.arrayBuffer())
  expect(Array.from(bytes.slice(0, 3))).toEqual([0xef, 0xbb, 0xbf])
  expect(new TextDecoder().decode(bytes.slice(3))).toBe('标题,内容\n中文,测试')
    expect(clickSpy).toHaveBeenCalledTimes(1)

    createObjectURL.mockRestore()
    revokeObjectURL.mockRestore()
    clickSpy.mockRestore()
  })

  it('keeps task CSV assignee headers aligned with exported row fields', () => {
    const csv = toCSV(
      buildTaskExportRows(
        [{
          id: 'task-1',
          title: '宣传片剪辑',
          projectId: 'project-1',
          assigneeIds: ['person-1', 'person-2'],
          createdAt: '2026-04-17T10:00:00+08:00',
        }],
        {
          peopleById: {
            'person-1': { id: 'person-1', name: '张三' },
            'person-2': { id: 'person-2', name: '李四' },
          },
          projectsById: {
            'project-1': { id: 'project-1', name: '品牌宣传片' },
          },
        },
      ),
      ['id', 'title', 'project', 'status', 'priority', 'assignees', 'startDate', 'endDate', 'scheduledDate', 'estimatedHours', 'createdAt'],
    )

    expect(csv).toContain('"张三, 李四"')
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

  it('keeps task dialog focused on deadline metadata and prevents modal footer clipping in short viewports', () => {
    const taskDialogSource = readFileSync(join(process.cwd(), 'src/features/tasks/TaskDialog.tsx'), 'utf8')
    const styleSource = readFileSync(join(process.cwd(), 'css/style.css'), 'utf8')

    expect(taskDialogSource).not.toMatch(/安排日期/)
    expect(taskDialogSource).not.toMatch(/开始日期/)
    expect(taskDialogSource).toMatch(/截止日期/)
    expect(taskDialogSource).toMatch(/预计工时\(h\)/)
    expect(taskDialogSource).toMatch(/backdropScrollable=\{false\}/)
    expect(taskDialogSource).toMatch(/bodyScrollable=\{false\}/)
    expect(taskDialogSource).toMatch(/task-assignee-picker/)
    expect(taskDialogSource).toMatch(/if \(width >= 650\) return 6/)

    expect(styleSource).toMatch(/\.dialog-backdrop\s*\{[\s\S]*padding:\s*24px 16px;[\s\S]*overflow-y:\s*auto;/)
    expect(styleSource).toMatch(/\.dialog-backdrop\.no-scroll\s*\{[\s\S]*overflow-y:\s*hidden;/)
    expect(styleSource).toMatch(/\.app-modal\s*\{[\s\S]*max-height:\s*calc\(100dvh - 48px\);/)
    expect(styleSource).toMatch(/\.modal-inner\s*\{[\s\S]*min-height:\s*0;[\s\S]*max-height:\s*calc\(100dvh - 48px\);/)
    expect(styleSource).toMatch(/\.modal-body\s*\{[\s\S]*min-height:\s*0;/)
    expect(styleSource).toMatch(/\.modal-body\.no-scroll\s*\{[\s\S]*overflow:\s*hidden;/)
    expect(styleSource).toMatch(/\.task-assignee-page\s*\{[\s\S]*min-height:\s*114px;/)
    expect(styleSource).toMatch(/\.task-assignee-page\.cols-6\s*\{[\s\S]*repeat\(6, minmax\(0, 1fr\)\);/)
  })

  it('pages assignee chips inside task dialog without reintroducing modal scrolling', () => {
    const people = Array.from({ length: 13 }, (_, index) => ({
      id: `person-${index + 1}`,
      name: `成员${index + 1}`,
      gender: index % 2 === 0 ? 'male' : 'female',
      status: 'active' as const,
      skills: [],
      notes: '',
    }))
    const projects = [{ id: 'project-1', name: '项目 A', status: 'active' as const }]
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)

    act(() => {
      root.render(
        <ToastProvider>
          <TaskDialog
            task={null}
            people={people}
            projects={projects}
            onClose={() => {}}
          />
        </ToastProvider>,
      )
    })

    expect(container.querySelectorAll('.assignee-chip')).toHaveLength(6)
    expect(container.querySelector('.modal-body')?.className).toContain('no-scroll')
    expect(container.textContent).toContain('1 / 3')

    const nextButton = container.querySelector('[aria-label="负责人下一页"]') as HTMLButtonElement | null
    expect(nextButton?.disabled).toBe(false)

    act(() => {
      nextButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    act(() => {
      nextButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(container.querySelectorAll('.assignee-chip')).toHaveLength(1)
    expect(container.textContent).toContain('成员13')
    expect(container.textContent).toContain('3 / 3')
    expect(container.querySelector('.assignee-chip-avatar')?.textContent).toBe('♂')

    act(() => {
      root.unmount()
    })
    container.remove()
  })

  it('uses the shared gender avatar component for all circular person badges', () => {
    const taskDialogSource = readFileSync(join(process.cwd(), 'src/features/tasks/TaskDialog.tsx'), 'utf8')
    const personCardSource = readFileSync(join(process.cwd(), 'src/features/people/PersonCard.tsx'), 'utf8')
    const plannerDropZoneSource = readFileSync(join(process.cwd(), 'src/features/planner/PlannerDropZone.tsx'), 'utf8')
    const personDetailSource = readFileSync(join(process.cwd(), 'src/features/dashboard/PersonDetailPanel.tsx'), 'utf8')
    const styleSource = readFileSync(join(process.cwd(), 'css/style.css'), 'utf8')

    expect(taskDialogSource).toMatch(/PersonGenderAvatar/)
    expect(personCardSource).toMatch(/PersonGenderAvatar/)
    expect(plannerDropZoneSource).toMatch(/PersonGenderAvatar/)
    expect(personDetailSource).toMatch(/PersonGenderAvatar/)

    expect(taskDialogSource).not.toMatch(/initials\(/)
    expect(personDetailSource).not.toMatch(/initials\(/)
    expect(plannerDropZoneSource).not.toMatch(/initials\(/)

    expect(styleSource).toMatch(/\.person-gender-avatar\.male\s*\{[\s\S]*background:\s*rgba\(47, 107, 255, 0\.16\);/)
    expect(styleSource).toMatch(/\.person-gender-avatar\.female\s*\{[\s\S]*background:\s*rgba\(239, 71, 111, 0\.16\);/)
    expect(styleSource).toMatch(/\.assignee-chip\.selected:has\(\.assignee-chip-avatar\.male\)\s*\{[\s\S]*color:\s*#225cff;/)
    expect(styleSource).toMatch(/\.assignee-chip\.selected:has\(\.assignee-chip-avatar\.female\)\s*\{[\s\S]*color:\s*#dd3f69;/)
    expect(styleSource).not.toMatch(/\.pdp-avatar\s*\{[\s\S]*linear-gradient/)
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

  it('avoids synchronously toggling the konami entry flash inside an effect body', () => {
    const appSource = readFileSync(join(process.cwd(), 'src/App.tsx'), 'utf8')

    expect(appSource).not.toMatch(/if \(!easterMode\) \{\s*setEntryFlashVisible\(false\)\s*return\s*\}/)
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
    const miniCalendarSource = readFileSync(join(process.cwd(), 'src/features/dashboard/DashboardMiniCalendar.tsx'), 'utf8')

    expect(dashboardSource).toMatch(/buildProjectEventSummaryMap/)
    expect(calendarSource).toMatch(/buildProjectEventSummaryMap/)
    expect(plannerSource).toMatch(/buildProjectEventSummaryMap/)
    expect(plannerSource).toMatch(/getProjectEventsForDate/)
    expect(calendarSource).toMatch(/toneKey/)
    expect(miniCalendarSource).toMatch(/markerTone/)
    expect(miniCalendarSource).toMatch(/markerKind/)
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
  })

  it('keeps dashboard focus area split into dedicated components', () => {
    const dashboardSource = readFileSync(join(process.cwd(), 'src/views/Dashboard.tsx'), 'utf8')

    expect(dashboardSource).toMatch(/FocusPrimaryCard/)
    expect(dashboardSource).toMatch(/FocusSecondaryCards/)
    expect(dashboardSource).toMatch(/DashboardHeader/)
    expect(dashboardSource).toMatch(/DashboardMiniCalendar/)
    expect(dashboardSource).not.toMatch(/focus-highlight-head/)
    expect(dashboardSource).not.toMatch(/dash-date-block/)
    expect(dashboardSource).not.toMatch(/mini-cal-header/)
  })

  it('treats settings and leave records as first-class backup data across bootstrap and settings UI', () => {
    const bootstrapSource = readFileSync(join(process.cwd(), 'src/legacy/bootstrap.ts'), 'utf8')
    const syncProviderSource = readFileSync(join(process.cwd(), 'src/features/sync/SyncProvider.tsx'), 'utf8')
    const syncSharedSource = readFileSync(join(process.cwd(), 'src/features/sync/syncShared.ts'), 'utf8')
    const settingsSource = readFileSync(join(process.cwd(), 'src/views/Settings.tsx'), 'utf8')

    expect(syncSharedSource).toMatch(/payload\.leaveRecords\.length > 0/)
    expect(syncProviderSource).toMatch(/store\.leaveRecords\.length > 0/)
    expect(bootstrapSource).toMatch(/const localBackup = await db\.exportAll\(\)/)
    expect(bootstrapSource).toMatch(/if \(!hasBackupContent\(localBackup\)\)/)
    expect(settingsSource).toMatch(/currentSummary\.settingsCount/)
    expect(settingsSource).toMatch(/currentSummary\.leaveRecordCount/)
    expect(settingsSource).toMatch(/同步设置/)
    expect(settingsSource).toMatch(/请假记录/)
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

  it('publishes the vc custom domain from the site root', () => {
    const workflowSource = readFileSync(join(process.cwd(), '.github/workflows/deploy.yml'), 'utf8')
    const viteConfigSource = readFileSync(join(process.cwd(), 'vite.config.ts'), 'utf8')

    expect(viteConfigSource).toMatch(/process\.env\.DEPLOY_BASE \|\| '\/'/)
    expect(workflowSource).toMatch(/vc\)[\s\S]*deploy_base="\/"/)
    expect(workflowSource).not.toMatch(/url=\/118-Studio-Manager\/vc\//)
    expect(workflowSource).not.toMatch(/Redirecting to <a href="\/118-Studio-Manager\/vc\/">/)
  })

  it('keeps dashboard skill tags clipped inside compact person cards', () => {
    const styleSource = readFileSync(join(process.cwd(), 'css/style.css'), 'utf8')

    expect(styleSource).toMatch(/\.skill-tag\s*\{/)
    expect(styleSource).toMatch(/max-width:\s*100%/)
    expect(styleSource).toMatch(/text-overflow:\s*ellipsis/)
    expect(styleSource).toMatch(/overflow:\s*hidden/)
  })
})
