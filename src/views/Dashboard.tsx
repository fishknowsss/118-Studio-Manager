import { useEffect, useRef } from 'react'
import { renderDashboard } from '../../js/views/dashboard.js'

export function Dashboard() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (ref.current) renderDashboard(ref.current)
  }, [])

  return <div ref={ref} style={{ display: 'flex', flexDirection: 'column', height: '100%' }} />
}
