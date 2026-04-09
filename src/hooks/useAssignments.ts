import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/database'
import * as assignmentService from '../services/assignmentService'
import type { AssignmentInput } from '../types/assignment'

export function useAssignments(date?: string) {
  const assignments = useLiveQuery(
    () => date
      ? db.assignments.where('date').equals(date).toArray()
      : db.assignments.orderBy('createdAt').reverse().toArray(),
    [date]
  )

  return {
    assignments: assignments ?? [],
    addAssignment: (input: AssignmentInput) => assignmentService.addAssignment(input),
    updateAssignment: (id: string, updates: Partial<AssignmentInput>) => assignmentService.updateAssignment(id, updates),
    deleteAssignment: (id: string) => assignmentService.deleteAssignment(id),
  }
}
