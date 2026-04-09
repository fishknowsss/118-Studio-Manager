import { Navigate } from 'react-router-dom'
import { useSettings } from '../hooks/useSettings'
import { getDefaultViewPath } from '../constants/navigation'

export function HomePage() {
  const { setting } = useSettings()

  if (!setting) {
    return <div className="py-12 text-center text-sm text-text-secondary">正在加载工作台...</div>
  }

  return <Navigate to={getDefaultViewPath(setting)} replace />
}
