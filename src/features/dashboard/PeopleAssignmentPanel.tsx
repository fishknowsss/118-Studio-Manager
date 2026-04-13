import type { DragEvent } from 'react'
import type { PersonCardModel } from '../../legacy/selectors'
import { PersonAssignmentCard } from './PersonAssignmentCard'

export function PeopleAssignmentPanel({
  dragOverPersonId,
  draggingTaskId,
  onDragLeavePerson,
  onDragOverPerson,
  onExpand,
  onDropToPerson,
  onPersonDragEnd,
  onPersonDragStart,
  people,
  slotCount = 15,
}: {
  dragOverPersonId: string | null
  draggingTaskId: string | null
  onDragLeavePerson: () => void
  onDragOverPerson: (event: DragEvent<HTMLDivElement>, personId: string) => void
  onExpand: (x: number, y: number) => void
  onDropToPerson: (event: DragEvent<HTMLDivElement>, personId: string) => void
  onPersonDragEnd: () => void
  onPersonDragStart: (event: DragEvent<HTMLDivElement>, personId: string) => void
  people: PersonCardModel[]
  slotCount?: number
}) {
  const placeholders = Math.max(0, slotCount - people.length)

  return (
    <div className="panel">
      <div className="panel-header panel-header--expandable" onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); onExpand(r.left + r.width / 2, r.top + r.height / 2) }}>
        <span className="panel-title">人员</span>
        <span className="panel-action">展开全部</span>
      </div>
      <div className="panel-body people-panel-body">
        <div className="people-assignment-grid">
          {people.map((person) => (
            <PersonAssignmentCard
              key={person.id}
              isDropTarget={Boolean(draggingTaskId) && dragOverPersonId === person.id}
              model={person}
              onDragEnd={onPersonDragEnd}
              onDragLeave={onDragLeavePerson}
              onDragOver={onDragOverPerson}
              onDragStart={onPersonDragStart}
              onDrop={onDropToPerson}
            />
          ))}
          {Array.from({ length: placeholders }, (_, index) => (
            <div key={`person-slot-${index}`} className="person-assignment-placeholder">
              预留
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
