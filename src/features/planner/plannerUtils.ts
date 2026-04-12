type PlannerTask = {
  id: string
  status?: string | null
  scheduledDate?: string | null
}

export function getAssignableTasks<T extends PlannerTask>(tasks: T[]) {
  return tasks.filter((task) => {
    const status = task.status || 'todo'
    return status !== 'done' && status !== 'blocked' && !task.scheduledDate
  })
}
