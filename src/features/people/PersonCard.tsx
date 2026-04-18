import type { PersonCardModel } from '../../legacy/selectors'
import { PersonGenderAvatar } from '../../components/ui/PersonGenderAvatar'

export function PersonCard({
  model,
  onDelete,
  onEdit,
  onToggle,
}: {
  model: PersonCardModel
  onDelete: () => void
  onEdit: () => void
  onToggle: () => void
}) {
  return (
    <div className={`person-card ${model.isInactive ? 'inactive' : ''}`} onClick={onEdit}>
      <div className="person-card-top">
        <PersonGenderAvatar className="person-card-avatar" gender={model.genderLabel} inactive={model.isInactive} />
        <div className="person-card-main">
          <div className="person-card-name">{model.name}</div>
          <div className="person-card-status">
            <span className={`badge badge-${model.statusKey}`}>{model.statusLabel}</span>
            {model.genderLabel ? ` · ${model.genderLabel}` : ''}
          </div>
        </div>
        <div className="person-card-actions">
          <button className="card-btn" type="button" onClick={(event) => { event.stopPropagation(); onEdit() }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
          </button>
          <button className="card-btn" type="button" onClick={(event) => { event.stopPropagation(); onToggle() }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
              {model.isInactive
                ? <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                : (
                  <>
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </>
                )}
            </svg>
          </button>
          <button className="card-btn danger" type="button" onClick={(event) => { event.stopPropagation(); onDelete() }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></svg>
          </button>
        </div>
      </div>
      {model.skills.length > 0 ? (
        <div className="person-card-skills">
          {model.skills.map((skill, index) => <span key={`${skill}-${index}`} className="skill-tag">{skill}</span>)}
        </div>
      ) : null}
      <div className="person-card-meta">
        <span>{model.taskCount} 个进行中任务</span>
        {model.notePreview ? <span>{model.notePreview}</span> : null}
      </div>
    </div>
  )
}
