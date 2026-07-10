import type React from 'react'
import type { ProjectCardModel } from '../../legacy/selectors'

export function ProjectCard({
  model,
  onContextMenu,
  onDelete,
  onEdit,
  onOpen,
}: {
  model: ProjectCardModel
  onContextMenu: (event: React.MouseEvent) => void
  onDelete: () => void
  onEdit: () => void
  onOpen: (projectId: string, x: number, y: number) => void
}) {
  const openFromElement = (element: HTMLElement) => {
    const rect = element.getBoundingClientRect()
    onOpen(model.id, rect.left + rect.width / 2, rect.top + rect.height / 2)
  }

  return (
    <article className={`project-card ${model.urgencyKey}`}>
      <div className="project-card-top">
        <div className="project-card-main">
          <button
            type="button"
            className="project-name project-name-button"
            aria-label={`查看项目 ${model.name}`}
            onClick={(event) => openFromElement(event.currentTarget)}
          >
            {model.name}
          </button>
          {model.description ? <div className="project-desc">{model.description}</div> : null}
        </div>
        <div className="project-card-side">
          <button
            type="button"
            className={`badge badge-${model.statusKey} project-status-button`}
            aria-label={`更改项目状态 ${model.statusLabel}`}
            onClick={(event) => {
              event.stopPropagation()
              onContextMenu(event)
            }}
          >
            {model.statusLabel}
          </button>
          <div className="card-actions project-card-actions">
            <button
              className="card-btn"
              type="button"
              aria-label={`编辑项目 ${model.name}`}
              onClick={(event) => {
                event.stopPropagation()
                onEdit()
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
            </button>
            <button
              className="card-btn danger"
              type="button"
              aria-label={`删除项目 ${model.name}`}
              onClick={(event) => {
                event.stopPropagation()
                onDelete()
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>
            </button>
          </div>
        </div>
      </div>

      <div className="project-meta">
        <span className={`project-ddl-label ${model.urgencyKey}`}>{model.ddlText}</span>
        <span className={`badge badge-${model.priorityKey}`}>{model.priorityLabel}</span>
        <span className="project-task-count">{model.doneCount}/{model.taskCount} 完成</span>
      </div>
    </article>
  )
}
