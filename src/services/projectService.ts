import { db } from '../db/database'
import type { Project, ProjectInput } from '../types/project'
import { generateId } from '../utils/id'
import { now } from '../utils/date'
import { addLog } from './logService'

export async function getAllProjects(): Promise<Project[]> {
  return db.projects.orderBy('createdAt').reverse().toArray()
}

export async function getProject(id: string): Promise<Project | undefined> {
  return db.projects.get(id)
}

export async function addProject(input: ProjectInput): Promise<string> {
  const id = generateId()
  const timestamp = now()
  await db.projects.add({
    ...input,
    id,
    createdAt: timestamp,
    updatedAt: timestamp,
  })
  await addLog('create', 'project', id, `新建项目: ${input.name}`)
  return id
}

export async function updateProject(id: string, updates: Partial<ProjectInput>): Promise<void> {
  await db.projects.update(id, { ...updates, updatedAt: now() })
  await addLog('update', 'project', id, `更新项目: ${updates.name || id}`)
}

export async function deleteProject(id: string): Promise<void> {
  const project = await db.projects.get(id)
  if (!project) return
  await db.transaction('rw', [db.projects, db.tasks, db.milestones, db.assignments, db.logs], async () => {
    await db.milestones.where('projectId').equals(id).delete()
    const taskIds = await db.tasks.where('projectId').equals(id).primaryKeys()
    for (const taskId of taskIds) {
      await db.assignments.where('taskId').equals(taskId).delete()
    }
    await db.tasks.where('projectId').equals(id).delete()
    await db.assignments.where('projectId').equals(id).delete()
    await db.projects.delete(id)
    await addLog('delete', 'project', id, `删除项目: ${project.name}（含关联任务、里程碑、分配）`)
  })
}
