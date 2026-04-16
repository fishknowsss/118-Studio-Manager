import { useState, useRef, useEffect } from 'react'
import type { DragEvent } from 'react'
import type { PersonCardModel } from '../../legacy/selectors'
import { PersonAssignmentCard } from './PersonAssignmentCard'

const PAGE_SIZE = 16

export function PeopleAssignmentPanel({
  dragOverPersonId,
  draggingTaskId,
  onDragLeavePerson,
  onDragOverPerson,
  onExpand,
  onDropToPerson,
  onPersonDragEnd,
  onPersonDragStart,
  onPersonClick,
  people,
}: {
  dragOverPersonId: string | null
  draggingTaskId: string | null
  onDragLeavePerson: () => void
  onDragOverPerson: (event: DragEvent<HTMLDivElement>, personId: string) => void
  onExpand: (x: number, y: number) => void
  onDropToPerson: (event: DragEvent<HTMLDivElement>, personId: string) => void
  onPersonDragEnd: () => void
  onPersonDragStart: (event: DragEvent<HTMLDivElement>, personId: string) => void
  onPersonClick: (personId: string, ox: number, oy: number) => void
  people: PersonCardModel[]
}) {
  const [page, setPage] = useState(0)
  const [slideDir, setSlideDir] = useState<'down' | 'up' | null>(null)
  const [animKey, setAnimKey] = useState(0)
  const contentRef = useRef<HTMLDivElement>(null)
  const wheelAccum = useRef(0)
  const wheelLock = useRef(false)

  const totalPages = Math.max(1, Math.ceil(people.length / PAGE_SIZE))

  // 用原生监听器（passive: false）保证 preventDefault 有效且响应更及时
  useEffect(() => {
    const el = contentRef.current
    if (!el || totalPages <= 1) return
    const onWheel = (e: globalThis.WheelEvent) => {
      e.preventDefault()
      if (wheelLock.current) return
      wheelAccum.current += e.deltaY
      if (Math.abs(wheelAccum.current) < 40) return
      const dir = wheelAccum.current > 0 ? 1 : -1
      wheelAccum.current = 0
      wheelLock.current = true
      setTimeout(() => { wheelLock.current = false }, 300)
      setPage(prev => {
        const next = prev + dir
        if (next < 0 || next >= totalPages) return prev
        setSlideDir(next > prev ? 'down' : 'up')
        setAnimKey(k => k + 1)
        return next
      })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [totalPages])

  const start = page * PAGE_SIZE
  const pagePeople = people.slice(start, start + PAGE_SIZE)
  const placeholders = Math.max(0, PAGE_SIZE - pagePeople.length)

  const gridClass = slideDir
    ? `people-assignment-grid people-grid--slide-${slideDir}`
    : 'people-assignment-grid'

  return (
    <div className="panel">
      <div className="panel-header panel-header--expandable" onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); onExpand(r.left + r.width / 2, r.top + r.height / 2) }}>
        <span className="panel-title">人员</span>
        <span className="panel-action">展开全部</span>
      </div>
      <div className="panel-body people-panel-body">
        <div className="people-panel-content" ref={contentRef}>
          <div className="people-page-viewport">
            <div key={animKey} className={gridClass}>
              {pagePeople.map((person) => (
                <PersonAssignmentCard
                  key={person.id}
                  isDropTarget={Boolean(draggingTaskId) && dragOverPersonId === person.id}
                  model={person}
                  onDragEnd={onPersonDragEnd}
                  onDragLeave={onDragLeavePerson}
                  onDragOver={onDragOverPerson}
                  onDragStart={onPersonDragStart}
                  onDrop={onDropToPerson}
                  onPersonClick={onPersonClick}
                />
              ))}
              {Array.from({ length: placeholders }, (_, index) => (
                <div key={`person-slot-${index}`} className="person-assignment-placeholder">
                  预留
                </div>
              ))}
            </div>
          </div>
          {totalPages > 1 && (
            <div className="people-page-dots">
              {Array.from({ length: totalPages }, (_, i) => (
                <div
                  key={i}
                  className={`people-page-dot${i === page ? ' people-page-dot--active' : ''}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
