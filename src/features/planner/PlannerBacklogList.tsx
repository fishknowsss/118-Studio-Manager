import type { LegacyPerson, LegacyProject, LegacyTask } from '../../legacy/store'

export function PlannerBacklogList({
  activePeople,
  dateStr,
  onAssignTask,
  tasks,
}: {
  activePeople: LegacyPerson[]
  dateStr: string
  onAssignTask: (taskId: string, personId: string, dateStr: string) => void
  tasks: Array<LegacyTask & { project?: LegacyProject | null }>
}) {
  if (!tasks.length) {
    return <div className="text-muted text-sm">当前没有待安排任务</div>
  }

  return (
    <>
      {tasks.map((task) => (
        <div
          key={task.id}
          className="planner-task-row"
          draggable
          onDragStart={(event) => {
            event.dataTransfer.setData('text/task-id', task.id)
          }}
        >
          <div className="task-check" />
          <span className="planner-task-title">{task.title}</span>
          {task.project ? <span className="planner-task-project">{task.project.name}</span> : null}
          <div className="planner-task-assign">
            <select
              className="filter-select"
              defaultValue=""
              onChange={(event) => {
                const personId = event.target.value
                if (!personId) return
                onAssignTask(task.id, personId, dateStr)
                event.target.value = ''
              }}
            >
              <option value="">分配给</option>
              {activePeople.map((person) => (
                <option key={person.id} value={person.id}>{person.name}</option>
              ))}
            </select>
          </div>
        </div>
      ))}
    </>
  )
}
