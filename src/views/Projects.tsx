import { useMemo, useState } from 'react'
import { useConfirm } from '../components/feedback/ConfirmProvider'
import { useToast } from '../components/feedback/ToastProvider'
import { ContextMenu, type ContextMenuItem } from '../components/ui/ContextMenu'
import { ExpandPanel } from '../components/ui/ExpandPanel'
import { ProjectDetailPanel } from '../features/dashboard/ProjectDetailPanel'
import { ProjectCard } from '../features/projects/ProjectCard'
import { ProjectDialog } from '../features/projects/ProjectDialog'
import { ProjectOverviewToolbar } from '../features/projects/ProjectOverviewToolbar'
import { ProjectTimeline } from '../features/projects/ProjectTimeline'
import { deleteProjectWithLog, updateProjectStatus } from '../legacy/actions'
import { buildProjectCardModels, buildProjectTimelineModel, getFilteredProjects } from '../legacy/selectors'
import {
  PROJECT_STATUSES,
  type LegacyProject,
  type ProjectStatus,
} from '../legacy/store'
import { STATUS_LABELS } from '../legacy/utils'
import { useLegacyStoreSnapshot } from '../legacy/useLegacyStore'
import { useTodayKey } from '../legacy/useTodayDate'

export function Projects({
  onOpenProject,
}: {
  onOpenProject?: (projectId: string, ox: number, oy: number) => void
} = {}) {
  const store = useLegacyStoreSnapshot()
  const { projects, tasks } = store

  const [statusFilter, setStatusFilter] = useState('')
  const [prioFilter, setPrioFilter] = useState('')
  const [projectSearch, setProjectSearch] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'timeline'>('grid')
  const [contextMenu, setContextMenu] = useState<{ projectId: string; x: number; y: number } | null>(null)
  const [editingProject, setEditingProject] = useState<LegacyProject | null | undefined>(undefined)
  const [openedProject, setOpenedProject] = useState<{ projectId: string; ox: number; oy: number } | null>(null)
  const { confirm } = useConfirm()
  const { toast } = useToast()
  const todayStr = useTodayKey()

  const statusFilteredProjects = useMemo(
    () => getFilteredProjects(projects, statusFilter, prioFilter, todayStr) as LegacyProject[],
    [projects, prioFilter, statusFilter, todayStr],
  )

  const filteredProjects = useMemo(() => {
    const query = projectSearch.trim().toLowerCase()
    if (!query) return statusFilteredProjects
    return statusFilteredProjects.filter((project) => {
      const name = (project.name || '').toLowerCase()
      const description = (project.description || '').toLowerCase()
      return name.includes(query) || description.includes(query)
    })
  }, [projectSearch, statusFilteredProjects])

  const projectCards = useMemo(
    () => buildProjectCardModels(filteredProjects, tasks, todayStr),
    [filteredProjects, tasks, todayStr],
  )
  const timeline = useMemo(
    () => buildProjectTimelineModel(filteredProjects, 90, undefined, todayStr),
    [filteredProjects, todayStr],
  )

  const hasAnyProjects = projects.length > 0
  const hasActiveFilters = Boolean(statusFilter || prioFilter || projectSearch.trim())

  const contextItems = useMemo<ContextMenuItem[]>(() => {
    if (!contextMenu) return []

    return PROJECT_STATUSES.map((status) => ({
      key: status,
      label: STATUS_LABELS[status],
      onSelect: () => {
        void updateProjectStatus(contextMenu.projectId, status as ProjectStatus).then((updated) => {
          if (updated) {
            toast(`项目状态已更新为 ${STATUS_LABELS[status]}`, 'success')
          }
        })
      },
    }))
  }, [contextMenu, toast])

  const handleDeleteProject = async (project: LegacyProject) => {
    const ok = await confirm('删除项目', `确认删除「${project.name}」？相关任务也会被删除，此操作不可撤销。`)
    if (!ok) return
    await deleteProjectWithLog(project)
    toast('已删除', 'error')
  }

  const handleOpenProject = (projectId: string, ox: number, oy: number) => {
    if (onOpenProject) {
      onOpenProject(projectId, ox, oy)
      return
    }
    setOpenedProject({ projectId, ox, oy })
  }

  const clearFilters = () => {
    setStatusFilter('')
    setPrioFilter('')
    setProjectSearch('')
  }

  return (
    <div className="view-projects fade-in">
      <div className="view-header">
        <h1 className="view-title">项目管理</h1>
        <div className="view-actions">
          <ProjectOverviewToolbar
            search={projectSearch}
            status={statusFilter}
            priority={prioFilter}
            viewMode={viewMode}
            onSearchChange={setProjectSearch}
            onStatusChange={setStatusFilter}
            onPriorityChange={setPrioFilter}
            onViewModeChange={setViewMode}
          />
          <button className="btn btn-primary" type="button" onClick={() => setEditingProject(null)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            新建项目
          </button>
        </div>
      </div>

      <div className="view-body">
        {viewMode === 'grid' ? (
          <div className="project-grid">
            {filteredProjects.length === 0 ? (
              <div className="empty-state empty-state-full">
                <div className="empty-icon">📁</div>
                <div className="empty-text">
                  {!hasAnyProjects
                    ? '先新建一个项目'
                    : hasActiveFilters
                      ? '没有符合筛选条件的项目'
                      : '先新建一个项目'}
                </div>
                {!hasAnyProjects ? (
                  <button className="btn btn-primary" type="button" onClick={() => setEditingProject(null)}>
                    新建项目
                  </button>
                ) : hasActiveFilters ? (
                  <button className="btn btn-secondary" type="button" onClick={clearFilters}>
                    清除筛选
                  </button>
                ) : null}
              </div>
            ) : (
              projectCards.map((project) => (
                <ProjectCard
                  key={project.id}
                  model={project}
                  onOpen={handleOpenProject}
                  onEdit={() => setEditingProject(projects.find((item) => item.id === project.id) || null)}
                  onDelete={() => {
                    const target = projects.find((item) => item.id === project.id)
                    if (target) void handleDeleteProject(target)
                  }}
                  onContextMenu={(event) => {
                    event.preventDefault()
                    setContextMenu({ projectId: project.id, x: event.clientX, y: event.clientY })
                  }}
                />
              ))
            )}
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="empty-state empty-state-full">
            <div className="empty-icon">📁</div>
            <div className="empty-text">
              {!hasAnyProjects
                ? '先新建一个项目'
                : hasActiveFilters
                  ? '没有符合筛选条件的项目'
                  : '先新建一个项目'}
            </div>
            {!hasAnyProjects ? (
              <button className="btn btn-primary" type="button" onClick={() => setEditingProject(null)}>
                新建项目
              </button>
            ) : hasActiveFilters ? (
              <button className="btn btn-secondary" type="button" onClick={clearFilters}>
                清除筛选
              </button>
            ) : null}
          </div>
        ) : (
          <ProjectTimeline timeline={timeline} onOpenProject={handleOpenProject} />
        )}
      </div>

      <ContextMenu
        open={Boolean(contextMenu)}
        x={contextMenu?.x || 0}
        y={contextMenu?.y || 0}
        title="快速更新状态"
        items={contextItems}
        onClose={() => setContextMenu(null)}
      />

      {editingProject !== undefined ? (
        <ProjectDialog project={editingProject} onClose={() => setEditingProject(undefined)} />
      ) : null}

      {!onOpenProject && openedProject ? (
        <ExpandPanel
          title={projects.find((project) => project.id === openedProject.projectId)?.name || '项目详情'}
          originX={openedProject.ox}
          originY={openedProject.oy}
          onClose={() => setOpenedProject(null)}
        >
          <ProjectDetailPanel projectId={openedProject.projectId} />
        </ExpandPanel>
      ) : null}
    </div>
  )
}
