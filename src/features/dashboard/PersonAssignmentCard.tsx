import type { DragEvent } from 'react'
import type { PersonCardModel } from '../../legacy/selectors'

export function PersonAssignmentCard({
  isDropTarget,
  model,
  onDragEnd,
  onDragLeave,
  onDragOver,
  onDragStart,
  onDrop,
  onPersonClick,
}: {
  isDropTarget: boolean
  model: PersonCardModel
  onDragEnd: () => void
  onDragLeave: () => void
  onDragOver: (event: DragEvent<HTMLDivElement>, personId: string) => void
  onDragStart: (event: DragEvent<HTMLDivElement>, personId: string) => void
  onDrop: (event: DragEvent<HTMLDivElement>, personId: string) => void
  onPersonClick: (personId: string, ox: number, oy: number) => void
}) {
  const extraSkills = Math.max(0, model.skills.length - 1)

  return (
    <div
      className={`person-assignment-card ${isDropTarget ? 'drop-target' : ''}`}
      draggable
      onDragEnd={onDragEnd}
      onDragLeave={onDragLeave}
      onDragOver={(event) => onDragOver(event, model.id)}
      onDragStart={(event) => onDragStart(event, model.id)}
      onDrop={(event) => onDrop(event, model.id)}
      onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); onPersonClick(model.id, r.left + r.width / 2, r.top + r.height / 2) }}
    >
      <div className="person-assignment-main">
        <div className="person-assignment-name">{model.name}</div>
        <div className="person-assignment-count">{model.taskCount} 任务</div>
      </div>

      <div className="person-assignment-skills">
        {model.skills.length > 0
          ? (
            <>
              <span className="skill-tag">{model.skills[0]}</span>
              {extraSkills > 0 ? <span className="skill-tag skill-tag-more">+{extraSkills}</span> : null}
            </>
          )
          : <span className="person-assignment-empty-skill">待补技能</span>}
      </div>
      {model.genderLabel === '男' ? <span className="person-assignment-gender-mark male">♂</span> : null}
      {model.genderLabel === '女' ? <span className="person-assignment-gender-mark female">♀</span> : null}
    </div>
  )
}
