import { useEffect, useRef } from 'react'
import { renderSettings } from '../../js/views/settings.js'

export function Settings() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (ref.current) renderSettings(ref.current)
  }, [])

  return <div ref={ref} style={{ display: 'flex', flexDirection: 'column', height: '100%' }} />
}
