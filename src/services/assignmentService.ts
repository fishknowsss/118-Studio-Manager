import { db } from '../db/database'
import type { Assignment, AssignmentInput } from '../types/assignment'
import { generateId } from '../utils/id'
import { now } from '../utils/date'
import { addLog } from './logService'

export async function getAssignmentsByDate(date: string): Promise<Assignment[]> {
  return db.assignments.where('date').equals(date).toArray()
}

export async function getAssignmentsByPerson(personId: string): Promise<Assignment[]> {
  return db.assignments.where('personId').equals(personId).toArray()
}

export async function getAssignmentsByTask(taskId: string): Promise<Assignment[]> {
  return db.assignments.where('taskId').equals(taskId).toArray()
}

export async function addAssignment(input: AssignmentInput): Promise<string> {
  const duplicatedTaskAssignment = await db.assignments
    .where('[date+taskId]')
    .equals([input.date, input.taskId])
    .first()

  if (duplicatedTaskAssignment) {
    throw new Error('这个任务当天已经分配给其他成员了')
  }

  const duplicatedPersonAssignment = await db.assignments
    .where('[date+personId+taskId]')
    .equals([input.date, input.personId, input.taskId])
    .first()

  if (duplicatedPersonAssignment) {
    throw new Error('请勿重复创建相同的任务分配')
  }

  const id = generateId()
  const timestamp = now()
  await db.assignments.add({
    ...input,
    id,
    createdAt: timestamp,
    updatedAt: timestamp,
  })
  await addLog('assign', 'assignment', id, `分配任务`)
  return id
}

export async function assignTaskToPersonOnDate(input: {
  date: string
  taskId: string
  projectId: string
  personId: string
  note?: string
}): Promise<string> {
  const existingAssignment = await db.assignments
    .where('[date+taskId]')
    .equals([input.date, input.taskId])
    .first()

  if (existingAssignment) {
    await db.assignments.update(existingAssignment.id, {
      personId: input.personId,
      projectId: input.projectId,
      assignmentStatus: 'assigned',
      note: input.note ?? existingAssignment.note,
      updatedAt: now(),
    })
    await addLog('update', 'assignment', existingAssignment.id, '重新分配任务')
    return existingAssignment.id
  }

  return addAssignment({
    date: input.date,
    taskId: input.taskId,
    projectId: input.projectId,
    personId: input.personId,
    assignmentStatus: 'assigned',
    note: input.note ?? '',
  })
}

export async function updateAssignment(id: string, updates: Partial<AssignmentInput>): Promise<void> {
  await db.assignments.update(id, { ...updates, updatedAt: now() })
  await addLog('update', 'assignment', id, `更新分配`)
}

export async function deleteAssignment(id: string): Promise<void> {
  await db.assignments.delete(id)
  await addLog('unassign', 'assignment', id, `取消分配`)
}
