import { db } from '../db/database'
import type { Task, TaskInput } from '../types/task'
import { generateId } from '../utils/id'
import { now } from '../utils/date'
import { addLog } from './logService'

export async function getAllTasks(): Promise<Task[]> {
  return db.tasks.orderBy('createdAt').reverse().toArray()
}

export async function getTasksByProject(projectId: string): Promise<Task[]> {
  return db.tasks.where('projectId').equals(projectId).toArray()
}

export async function getTask(id: string): Promise<Task | undefined> {
  return db.tasks.get(id)
}

export async function addTask(input: TaskInput): Promise<string> {
  const id = generateId()
  const timestamp = now()
  await db.tasks.add({
    ...input,
    id,
    createdAt: timestamp,
    updatedAt: timestamp,
  })
  await addLog('create', 'task', id, `新建任务: ${input.title}`)
  return id
}

export async function updateTask(id: string, updates: Partial<TaskInput>): Promise<void> {
  await db.tasks.update(id, { ...updates, updatedAt: now() })
  await addLog('update', 'task', id, `更新任务: ${updates.title || id}`)
}

export async function deleteTask(id: string): Promise<void> {
  const task = await db.tasks.get(id)
  if (!task) return
  await db.transaction('rw', [db.tasks, db.assignments, db.logs], async () => {
    await db.assignments.where('taskId').equals(id).delete()
    await db.tasks.delete(id)
    await addLog('delete', 'task', id, `删除任务: ${task.title}`)
  })
}
