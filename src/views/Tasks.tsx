import { useEffect, useRef } from 'react'
import { renderTasks } from '../../js/views/tasks.js'

export function Tasks() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (ref.current) renderTasks(ref.current)
  }, [])

  return <div ref={ref} style={{ display: 'flex', flexDirection: 'column', height: '100%' }} />
}
