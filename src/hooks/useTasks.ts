import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/database'
import * as taskService from '../services/taskService'
import type { TaskInput } from '../types/task'

export function useTasks(projectId?: string) {
  const tasks = useLiveQuery(
    () => projectId
      ? db.tasks.where('projectId').equals(projectId).toArray()
      : db.tasks.orderBy('createdAt').reverse().toArray(),
    [projectId]
  )

  return {
    tasks: tasks ?? [],
    addTask: (input: TaskInput) => taskService.addTask(input),
    updateTask: (id: string, updates: Partial<TaskInput>) => taskService.updateTask(id, updates),
    deleteTask: (id: string) => taskService.deleteTask(id),
  }
}
