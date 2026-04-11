import { useEffect, useRef } from 'react'
import { renderCalendar } from '../../js/views/calendar.js'

export function Calendar() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (ref.current) renderCalendar(ref.current)
  }, [])

  return <div ref={ref} style={{ display: 'flex', flexDirection: 'column', height: '100%' }} />
}
