import { db } from '../db/database'
import type { Person, PersonInput } from '../types/person'
import { generateId } from '../utils/id'
import { now } from '../utils/date'
import { addLog } from './logService'

export async function getAllPeople(): Promise<Person[]> {
  return db.people.orderBy('createdAt').reverse().toArray()
}

export async function getActivePeople(): Promise<Person[]> {
  return db.people.where('isActive').equals(1).toArray()
}

export async function getPerson(id: string): Promise<Person | undefined> {
  return db.people.get(id)
}

export async function addPerson(input: PersonInput): Promise<string> {
  const id = generateId()
  const timestamp = now()
  await db.people.add({
    ...input,
    id,
    createdAt: timestamp,
    updatedAt: timestamp,
  })
  await addLog('create', 'person', id, `新建人员: ${input.name}`)
  return id
}

export async function updatePerson(id: string, updates: Partial<PersonInput>): Promise<void> {
  await db.people.update(id, { ...updates, updatedAt: now() })
  await addLog('update', 'person', id, `更新人员: ${updates.name || id}`)
}

export async function togglePersonActive(id: string): Promise<void> {
  const person = await db.people.get(id)
  if (!person) return
  const newActive = !person.isActive
  await db.people.update(id, { isActive: newActive, updatedAt: now() })
  await addLog('update', 'person', id, `${newActive ? '启用' : '停用'}人员: ${person.name}`)
}

export async function deletePerson(id: string): Promise<void> {
  const person = await db.people.get(id)
  if (!person) return
  await db.transaction('rw', [db.people, db.assignments, db.logs], async () => {
    await db.assignments.where('personId').equals(id).delete()
    await db.people.delete(id)
    await addLog('delete', 'person', id, `删除人员: ${person.name}`)
  })
}
