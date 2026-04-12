import { useMemo, useState } from 'react'
import { useConfirm } from '../components/feedback/ConfirmProvider'
import { useToast } from '../components/feedback/ToastProvider'
import { ContextMenu, type ContextMenuItem } from '../components/ui/ContextMenu'
import { ProjectCard } from '../features/projects/ProjectCard'
import { ProjectDialog } from '../features/projects/ProjectDialog'
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

export function Projects() {
  const store = useLegacyStoreSnapshot()
  const { projects, tasks } = store

  const [statusFilter, setStatusFilter] = useState('')
  const [prioFilter, setPrioFilter] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'timeline'>('grid')
  const [contextMenu, setContextMenu] = useState<{ projectId: string; x: number; y: number } | null>(null)
  const [editingProject, setEditingProject] = useState<LegacyProject | null | undefined>(undefined)
  const { confirm } = useConfirm()
  const { toast } = useToast()
  const filteredProjects = useMemo(() => getFilteredProjects(projects, statusFilter, prioFilter) as LegacyProject[], [projects, prioFilter, statusFilter])
  const projectCards = useMemo(() => buildProjectCardModels(filteredProjects, tasks), [filteredProjects, tasks])
  const timeline = useMemo(() => buildProjectTimelineModel(filteredProjects), [filteredProjects])

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

  return (
    <div className="view-projects fade-in">
      <div className="view-header">
        <h1 className="view-title">项目管理</h1>
        <div className="view-actions">
          <div className="filter-bar">
            <div className="view-mode-toggle">
              <button
                className={`btn btn-xs ${viewMode === 'grid' ? 'btn-primary' : 'btn-ghost'}`}
                type="button"
                onClick={() => setViewMode('grid')}
              >
                卡片
              </button>
              <button
                className={`btn btn-xs ${viewMode === 'timeline' ? 'btn-primary' : 'btn-ghost'}`}
                type="button"
                onClick={() => setViewMode('timeline')}
              >
                时间轴
              </button>
            </div>
            <select className="filter-select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="">全部状态</option>
              <option value="active">进行中</option>
              <option value="paused">暂停</option>
              <option value="completed">已完成</option>
              <option value="cancelled">已取消</option>
            </select>
            <select className="filter-select" value={prioFilter} onChange={(event) => setPrioFilter(event.target.value)}>
              <option value="">全部优先级</option>
              <option value="urgent">紧急</option>
              <option value="high">高</option>
              <option value="medium">中</option>
              <option value="low">低</option>
            </select>
          </div>
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
                <div className="empty-text">先新建一个项目</div>
              </div>
            ) : (
              projectCards.map((project) => (
                <ProjectCard
                  key={project.id}
                  model={project}
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
        ) : (
          <ProjectTimeline timeline={timeline} />
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
    </div>
  )
}
