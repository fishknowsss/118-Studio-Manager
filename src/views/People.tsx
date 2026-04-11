import { useEffect, useRef } from 'react'
import { renderPeople } from '../../js/views/people.js'

export function People() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (ref.current) renderPeople(ref.current)
  }, [])

  return <div ref={ref} style={{ display: 'flex', flexDirection: 'column', height: '100%' }} />
}
