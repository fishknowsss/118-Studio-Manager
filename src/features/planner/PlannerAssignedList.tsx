import type { DragEvent } from 'react'
import type { LegacyPerson, LegacyTask } from '../../legacy/store'
import { PlannerDropZone } from './PlannerDropZone'

export function PlannerAssignedList({
  dateStr,
  dragOverPersonId,
  onDropToPerson,
  onLeavePerson,
  onOverPerson,
  onUnassignTask,
  people,
  tasks,
}: {
  dateStr: string
  dragOverPersonId: string | null
  onDropToPerson: (event: DragEvent<HTMLDivElement>, personId: string, dateStr: string) => void
  onLeavePerson: () => void
  onOverPerson: (event: DragEvent<HTMLDivElement>, personId: string) => void
  onUnassignTask: (taskId: string) => void
  people: LegacyPerson[]
  tasks: LegacyTask[]
}) {
  if (!people.length) {
    return <div className="text-muted text-sm">先新增成员</div>
  }

  return (
    <>
      {people.map((person) => {
        const assigned = tasks.filter((task) => task.assigneeId === person.id && task.scheduledDate === dateStr)

        return (
          <PlannerDropZone
            key={person.id}
            gender={person.gender}
            name={person.name || '未命名成员'}
            count={assigned.length}
            isDragOver={dragOverPersonId === person.id}
            onDragOver={(event) => onOverPerson(event, person.id)}
            onDragLeave={onLeavePerson}
            onDrop={(event) => onDropToPerson(event, person.id, dateStr)}
          >
            {assigned.map((task) => (
              <div key={task.id} className="planner-assigned-task">
                <div className="task-check done" />
                <span className="planner-assigned-title">{task.title}</span>
                <button
                  className="planner-unassign-btn"
                  type="button"
                  onClick={() => onUnassignTask(task.id)}
                >
                  取消分配
                </button>
              </div>
            ))}
          </PlannerDropZone>
        )
      })}
    </>
  )
}
