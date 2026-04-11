import { useEffect, useRef, useState } from 'react'
import { renderSettings } from '../../js/views/settings.js'

export function Settings() {
  const ref = useRef<HTMLDivElement>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const handler = () => setTick(t => t + 1)
    document.addEventListener('storeUpdated', handler)
    return () => document.removeEventListener('storeUpdated', handler)
  }, [])

  useEffect(() => {
    if (ref.current) renderSettings(ref.current)
  }, [tick])

  return <div ref={ref} style={{ display: 'flex', flexDirection: 'column', height: '100%' }} />
}
