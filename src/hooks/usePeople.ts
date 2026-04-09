import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/database'
import * as personService from '../services/personService'
import type { PersonInput } from '../types/person'

export function usePeople() {
  const people = useLiveQuery(() => db.people.orderBy('createdAt').reverse().toArray())
  const activePeople = useLiveQuery(() => db.people.filter(p => p.isActive).toArray())

  return {
    people: people ?? [],
    activePeople: activePeople ?? [],
    addPerson: (input: PersonInput) => personService.addPerson(input),
    updatePerson: (id: string, updates: Partial<PersonInput>) => personService.updatePerson(id, updates),
    togglePersonActive: (id: string) => personService.togglePersonActive(id),
    deletePerson: (id: string) => personService.deletePerson(id),
  }
}

export function usePerson(id: string | undefined) {
  const person = useLiveQuery(async () => {
    if (!id) return null
    return (await db.people.get(id)) ?? null
  }, [id])
  return person
}
