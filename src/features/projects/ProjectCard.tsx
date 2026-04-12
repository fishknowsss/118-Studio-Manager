import type React from 'react'
import type { ProjectCardModel } from '../../legacy/selectors'

export function ProjectCard({
  model,
  onContextMenu,
  onDelete,
  onEdit,
}: {
  model: ProjectCardModel
  onContextMenu: (event: React.MouseEvent) => void
  onDelete: () => void
  onEdit: () => void
}) {
  return (
    <div className={`project-card ${model.urgencyKey}`} onClick={onEdit} onContextMenu={onContextMenu}>
      <div className="project-card-top">
        <div className="project-card-main">
          <div className="project-name">{model.name}</div>
          {model.description ? <div className="project-desc">{model.description}</div> : null}
        </div>
        <div className="project-card-side">
          <span className={`badge badge-${model.statusKey}`}>{model.statusLabel}</span>
          <div className="card-actions">
            <button className="card-btn" type="button" onClick={(event) => { event.stopPropagation(); onEdit() }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
            </button>
            <button className="card-btn danger" type="button" onClick={(event) => { event.stopPropagation(); onDelete() }}>
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

      {model.milestones.length > 0 ? (
        <div className="milestones-mini">
          {model.milestones.map((milestone) => (
            <div key={milestone.id} className={`milestone-mini-item ${milestone.completed ? 'done' : ''}`}>
              <div className={`milestone-dot ${milestone.completed ? 'done' : ''}`} />
              {milestone.title} {milestone.dateText ? `· ${milestone.dateText}` : ''}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
