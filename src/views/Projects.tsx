import { useEffect, useRef } from 'react'
import { renderProjects } from '../../js/views/projects.js'

export function Projects() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (ref.current) renderProjects(ref.current)
  }, [])

  return <div ref={ref} style={{ display: 'flex', flexDirection: 'column', height: '100%' }} />
}
