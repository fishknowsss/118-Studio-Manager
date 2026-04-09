import { Navigate } from 'react-router-dom'
import { useSettings } from '../hooks/useSettings'
import { today } from '../utils/date'

export function CalendarPage() {
  const { setting } = useSettings()
  return <Navigate to={`/planner/${setting?.lastOpenedDate || today()}`} replace />
}
