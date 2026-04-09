import type { MilestoneType } from '../types/milestone'

export const MILESTONE_TYPE_LABELS: Record<MilestoneType, string> = {
  kickoff: '启动',
  draft: '初稿',
  review: '评审',
  test: '测试',
  delivery: '交付',
  other: '其他',
}

export const MILESTONE_TYPE_COLORS: Record<MilestoneType, string> = {
  kickoff: 'text-primary bg-primary/10',
  draft: 'text-accent-sage bg-accent-sage/10',
  review: 'text-warning bg-warning/10',
  test: 'text-accent-teal bg-accent-teal/10',
  delivery: 'text-success bg-success/10',
  other: 'text-text-secondary bg-gray-100',
}
