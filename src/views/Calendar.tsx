import { useEffect, useRef, useState } from 'react'
import { renderCalendar } from '../../js/views/calendar.js'

export function Calendar() {
  const ref  = useRef<HTMLDivElement>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const handler = () => setTick(t => t + 1)
    document.addEventListener('storeUpdated', handler)
    return () => document.removeEventListener('storeUpdated', handler)
  }, [])

  useEffect(() => {
    if (ref.current) renderCalendar(ref.current)
  }, [tick])

  return <div ref={ref} style={{ display: 'flex', flexDirection: 'column', height: '100%' }} />
}
