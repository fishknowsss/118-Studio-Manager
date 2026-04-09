import { db } from '../db/database'
import type { Milestone, MilestoneInput } from '../types/milestone'
import { generateId } from '../utils/id'
import { now } from '../utils/date'
import { addLog } from './logService'

export async function getMilestonesByProject(projectId: string): Promise<Milestone[]> {
  return db.milestones.where('projectId').equals(projectId).sortBy('date')
}

export async function getAllMilestones(): Promise<Milestone[]> {
  return db.milestones.orderBy('date').toArray()
}

export async function addMilestone(input: MilestoneInput): Promise<string> {
  const id = generateId()
  const timestamp = now()
  await db.milestones.add({
    ...input,
    id,
    createdAt: timestamp,
    updatedAt: timestamp,
  })
  await addLog('create', 'milestone', id, `新建里程碑: ${input.title}`)
  return id
}

export async function updateMilestone(id: string, updates: Partial<MilestoneInput>): Promise<void> {
  await db.milestones.update(id, { ...updates, updatedAt: now() })
  await addLog('update', 'milestone', id, `更新里程碑: ${updates.title || id}`)
}

export async function deleteMilestone(id: string): Promise<void> {
  const milestone = await db.milestones.get(id)
  if (!milestone) return
  await db.milestones.delete(id)
  await addLog('delete', 'milestone', id, `删除里程碑: ${milestone.title}`)
}
