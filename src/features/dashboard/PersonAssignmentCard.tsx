import type { DragEvent } from 'react'
import type { PersonCardModel } from '../../legacy/selectors'
import { getPersonGenderSymbol, getPersonGenderTone } from '../../legacy/utils'

function getSkillTagClassName(skill: string) {
  const charCount = Array.from(skill.trim()).length
  return charCount >= 7 ? 'skill-tag skill-tag-compact' : 'skill-tag'
}

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
  const visibleSkills = model.skills.slice(0, 2)
  const hiddenSkillCount = Math.max(0, model.skills.length - visibleSkills.length)
  const isTaskLabelEmpty = model.topInProgressTaskLabel === '暂无进行中'
  const hiddenTaskCount = Math.max(0, model.taskCount - 1)
  const taskLabel = isTaskLabelEmpty
    ? model.topInProgressTaskLabel
    : `${model.topInProgressTaskLabel}${hiddenTaskCount > 0 ? `+${hiddenTaskCount}` : ''}`
  const genderTone = getPersonGenderTone(model.genderLabel)
  const genderSymbol = getPersonGenderSymbol(model.genderLabel)

  return (
    <div
      className={`person-assignment-card ${isDropTarget ? 'drop-target' : ''} ${model.isOnLeaveToday ? 'on-leave' : ''}`}
      draggable
      onDragEnd={onDragEnd}
      onDragLeave={onDragLeave}
      onDragOver={(event) => onDragOver(event, model.id)}
      onDragStart={(event) => onDragStart(event, model.id)}
      onDrop={(event) => onDrop(event, model.id)}
      onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); onPersonClick(model.id, r.left + r.width / 2, r.top + r.height / 2) }}
    >
      <div className="person-assignment-main">
        <div className="person-assignment-name">
          {model.name}
          {model.isOnLeaveToday && <span className="person-leave-badge" title="今日请假">假</span>}
        </div>
        <div className={`person-assignment-count ${isTaskLabelEmpty ? 'is-empty' : ''}`}>{taskLabel}</div>
      </div>

      <div className="person-assignment-skills">
        {model.skills.length > 0
          ? (
            <>
              <div className="person-assignment-skill-list">
                {visibleSkills.map((skill, index) => <span key={`${skill}-${index}`} className={getSkillTagClassName(skill)}>{skill}</span>)}
              </div>
              {hiddenSkillCount > 0 ? <span className="person-assignment-skills-overflow">+{hiddenSkillCount}</span> : null}
            </>
          )
          : <span className="person-assignment-empty-skill">待补技能</span>}
      </div>
      {genderTone !== 'neutral' ? <span className={`person-assignment-gender-mark ${genderTone}`}>{genderSymbol}</span> : null}
    </div>
  )
}
