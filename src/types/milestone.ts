export type MilestoneType = 'kickoff' | 'draft' | 'review' | 'test' | 'delivery' | 'other'

export interface Milestone {
  id: string
  projectId: string
  title: string
  date: string
  type: MilestoneType
  note: string
  createdAt: string
  updatedAt: string
}

export type MilestoneInput = Omit<Milestone, 'id' | 'createdAt' | 'updatedAt'>
