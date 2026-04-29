import { useRef, type DragEvent, type MouseEvent, type Ref } from 'react'
import { getSquidVariant, hasSquidPersonName, SquidMark } from '../../components/easter/SquidMark'
import type { PersonCardModel } from '../../legacy/selectors'
import { getPersonGenderSymbol, getPersonGenderTone } from '../../legacy/utils'
import { PersonStatusMark } from './PersonStatusMark'

function getSkillTagClassName(skill: string) {
  const charCount = Array.from(skill.trim()).length
  return charCount >= 7 ? 'skill-tag skill-tag-compact' : 'skill-tag'
}

export function PersonAssignmentCard({
  isDropTarget,
  isReorderTarget,
  cardRef,
  model,
  onDragEnd,
  onDragLeave,
  onDragOver,
  onDragStart,
  onDrop,
  onPersonClick,
  onPersonContextMenu,
}: {
  isDropTarget: boolean
  isReorderTarget: boolean
  cardRef?: Ref<HTMLDivElement>
  model: PersonCardModel
  onDragEnd: () => void
  onDragLeave: () => void
  onDragOver: (event: DragEvent<HTMLDivElement>, personId: string) => void
  onDragStart: (event: DragEvent<HTMLDivElement>, personId: string) => void
  onDrop: (event: DragEvent<HTMLDivElement>, personId: string) => void
  onPersonClick: (personId: string, ox: number, oy: number) => void
  onPersonContextMenu: (event: MouseEvent<HTMLDivElement>, person: PersonCardModel) => void
}) {
  const suppressClickUntilRef = useRef(0)
  const visibleSkills = model.skills.slice(0, 2)
  const hiddenSkillCount = Math.max(0, model.skills.length - visibleSkills.length)
  const isTaskLabelEmpty = model.topInProgressTaskLabel === '暂无进行中'
  const hiddenTaskCount = Math.max(0, model.taskCount - 1)
  const taskLabel = isTaskLabelEmpty
    ? model.topInProgressTaskLabel
    : `${model.topInProgressTaskLabel}${hiddenTaskCount > 0 ? `+${hiddenTaskCount}` : ''}`
  const genderTone = getPersonGenderTone(model.genderLabel)
  const genderSymbol = getPersonGenderSymbol(model.genderLabel)
  const statusKind = model.isOnLeaveToday ? 'leave' : model.isPresent ? 'present' : null
  const isPresent = statusKind === 'present'
  const showSquidMark = hasSquidPersonName(model.name)

  return (
    <div
      ref={cardRef}
      className={`person-assignment-card ${isDropTarget ? 'drop-target' : ''} ${isReorderTarget ? 'reorder-target' : ''} ${isPresent ? 'is-present' : ''} ${model.isOnLeaveToday ? 'on-leave' : ''}`}
      draggable
      data-person-id={model.id}
      onDragEnd={onDragEnd}
      onDragLeave={onDragLeave}
      onDragOver={(event) => onDragOver(event, model.id)}
      onDragStart={(event) => onDragStart(event, model.id)}
      onMouseDown={(event) => {
        if (event.button === 2 || event.ctrlKey) {
          suppressClickUntilRef.current = Date.now() + 500
          event.preventDefault()
        }
      }}
      onDrop={(event) => onDrop(event, model.id)}
      onContextMenu={(event) => {
        suppressClickUntilRef.current = Date.now() + 500
        onPersonContextMenu(event, model)
      }}
      onClick={(event) => {
        if (event.ctrlKey || Date.now() < suppressClickUntilRef.current) {
          event.preventDefault()
          return
        }

        const r = event.currentTarget.getBoundingClientRect()
        onPersonClick(model.id, r.left + r.width / 2, r.top + r.height / 2)
      }}
    >
      {showSquidMark ? <SquidMark className="squid-mark--person-assignment" variant={getSquidVariant(model.id)} /> : null}
      <div className="person-assignment-main">
        <div className="person-assignment-name-row">
          <div className="person-assignment-name">{model.name}</div>
          {statusKind ? <PersonStatusMark kind={statusKind} /> : null}
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
