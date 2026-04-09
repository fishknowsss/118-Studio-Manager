import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/database'
import * as milestoneService from '../services/milestoneService'
import type { MilestoneInput } from '../types/milestone'

export function useMilestones(projectId?: string) {
  const milestones = useLiveQuery(
    () => projectId
      ? db.milestones.where('projectId').equals(projectId).sortBy('date')
      : db.milestones.orderBy('date').toArray(),
    [projectId]
  )

  return {
    milestones: milestones ?? [],
    addMilestone: (input: MilestoneInput) => milestoneService.addMilestone(input),
    updateMilestone: (id: string, updates: Partial<MilestoneInput>) => milestoneService.updateMilestone(id, updates),
    deleteMilestone: (id: string) => milestoneService.deleteMilestone(id),
  }
}
