import { today } from '../utils/date'
import type { Setting } from '../types/setting'

export const DEFAULT_VIEW_OPTIONS = [
  { value: 'dashboard', label: '首页' },
  { value: 'planner', label: '日计划' },
  { value: 'projects', label: '项目' },
  { value: 'tasks', label: '任务' },
  { value: 'people', label: '人员' },
  { value: 'calendar', label: '日历' },
] as const

export function getDefaultViewPath(setting?: Pick<Setting, 'defaultView' | 'lastOpenedDate'> | null): string {
  switch (setting?.defaultView) {
    case 'projects':
      return '/projects'
    case 'tasks':
      return '/tasks'
    case 'people':
      return '/people'
    case 'calendar':
      return '/calendar'
    case 'planner':
      return `/planner/${setting.lastOpenedDate || today()}`
    case 'dashboard':
    default:
      return '/dashboard'
  }
}
