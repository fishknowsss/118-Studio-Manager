import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { DragEvent, MouseEvent } from 'react'
import type { PersonCardModel } from '../../legacy/selectors'
import { ContextMenu, type ContextMenuItem } from '../../components/ui/ContextMenu'
import { reorderDashboardPersonIds, type DashboardPersonStatusAction } from './personPanelState'
import { PersonAssignmentCard } from './PersonAssignmentCard'

const PAGE_SIZE = 16

type PersonContextMenuState = {
  person: PersonCardModel
  x: number
  y: number
}

export function PeopleAssignmentPanel({
  draggingPersonId,
  dragOverPersonId,
  draggingTaskId,
  onDragLeavePerson,
  onDragOverPerson,
  onExpand,
  onDropToPerson,
  onPersonStateChange,
  onPersonDragEnd,
  onPersonDragStart,
  onPersonClick,
  onReorderPeople,
  people,
}: {
  draggingPersonId: string | null
  dragOverPersonId: string | null
  draggingTaskId: string | null
  onDragLeavePerson: () => void
  onDragOverPerson: (event: DragEvent<HTMLDivElement>, personId: string) => void
  onExpand: (x: number, y: number) => void
  onDropToPerson: (event: DragEvent<HTMLDivElement>, personId: string) => void
  onPersonStateChange: (personId: string, nextState: DashboardPersonStatusAction) => void
  onPersonDragEnd: () => void
  onPersonDragStart: (event: DragEvent<HTMLDivElement>, personId: string) => void
  onPersonClick: (personId: string, ox: number, oy: number) => void
  onReorderPeople: (nextOrder: string[]) => void
  people: PersonCardModel[]
}) {
  const [page, setPage] = useState(0)
  const [slideDir, setSlideDir] = useState<'down' | 'up' | null>(null)
  const [animKey, setAnimKey] = useState(0)
  const [contextMenu, setContextMenu] = useState<PersonContextMenuState | null>(null)
  const [reorderTargetPersonId, setReorderTargetPersonId] = useState<string | null>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef(new Map<string, HTMLDivElement>())
  const previousRectsRef = useRef(new Map<string, DOMRect>())
  const previousPageRef = useRef(0)
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
  const pagePeopleKey = pagePeople.map((person) => person.id).join('|')
  const placeholders = Math.max(0, PAGE_SIZE - pagePeople.length)

  const gridClass = slideDir
    ? `people-assignment-grid people-grid--slide-${slideDir}`
    : 'people-assignment-grid'

  useLayoutEffect(() => {
    const nextRects = new Map<string, DOMRect>()

    for (const person of pagePeople) {
      const node = cardRefs.current.get(person.id)
      if (!node) continue
      nextRects.set(person.id, node.getBoundingClientRect())
    }

    if (previousPageRef.current === page) {
      for (const person of pagePeople) {
        const node = cardRefs.current.get(person.id)
        const previousRect = previousRectsRef.current.get(person.id)
        const nextRect = nextRects.get(person.id)
        if (!node || !previousRect || !nextRect) continue

        const deltaX = previousRect.left - nextRect.left
        const deltaY = previousRect.top - nextRect.top
        if (deltaX === 0 && deltaY === 0) continue

        node.animate([
          { transform: `translate(${deltaX}px, ${deltaY}px)` },
          { transform: 'translate(0, 0)' },
        ], {
          duration: 220,
          easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
        })
      }
    }

    previousRectsRef.current = nextRects
    previousPageRef.current = page
  }, [page, pagePeopleKey])

  const readTransferData = (event: DragEvent<HTMLDivElement>, type: string) => {
    return event.dataTransfer?.getData(type) || ''
  }

  const handlePersonContextMenu = (event: MouseEvent<HTMLDivElement>, person: PersonCardModel) => {
    event.preventDefault()
    setContextMenu({
      person,
      x: event.clientX,
      y: event.clientY,
    })
  }

  const handleCardDragOver = (event: DragEvent<HTMLDivElement>, personId: string) => {
    const incomingPersonId = draggingPersonId || readTransferData(event, 'application/x-118studio-person-id')
    if (incomingPersonId && !draggingTaskId) {
      event.preventDefault()
      setReorderTargetPersonId(incomingPersonId === personId ? null : personId)
      return
    }

    onDragOverPerson(event, personId)
  }

  const handleCardDrop = (event: DragEvent<HTMLDivElement>, personId: string) => {
    const incomingPersonId = draggingPersonId || readTransferData(event, 'application/x-118studio-person-id')
    if (incomingPersonId && !draggingTaskId) {
      event.preventDefault()
      setReorderTargetPersonId(null)
      if (incomingPersonId !== personId) {
        onReorderPeople(reorderDashboardPersonIds(people.map((item) => item.id), incomingPersonId, personId))
      }
      return
    }

    onDropToPerson(event, personId)
  }

  const handleCardDragLeave = () => {
    setReorderTargetPersonId(null)
    onDragLeavePerson()
  }

  const handleCardDragEnd = () => {
    setReorderTargetPersonId(null)
    onPersonDragEnd()
  }

  const contextItems: ContextMenuItem[] = contextMenu
    ? [
        {
          key: 'present',
          label: '设为在岗',
          onSelect: () => onPersonStateChange(contextMenu.person.id, 'present'),
        },
        {
          key: 'leave',
          label: '设为请假',
          onSelect: () => onPersonStateChange(contextMenu.person.id, 'leave'),
        },
        {
          key: 'default',
          label: '恢复默认',
          onSelect: () => onPersonStateChange(contextMenu.person.id, 'default'),
        },
      ]
    : []

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
                  isReorderTarget={Boolean(draggingPersonId) && reorderTargetPersonId === person.id}
                  cardRef={(node) => {
                    if (node) {
                      cardRefs.current.set(person.id, node)
                    } else {
                      cardRefs.current.delete(person.id)
                    }
                  }}
                  model={person}
                  onDragEnd={handleCardDragEnd}
                  onDragLeave={handleCardDragLeave}
                  onDragOver={handleCardDragOver}
                  onDragStart={onPersonDragStart}
                  onDrop={handleCardDrop}
                  onPersonClick={onPersonClick}
                  onPersonContextMenu={handlePersonContextMenu}
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

      <ContextMenu
        open={Boolean(contextMenu)}
        items={contextItems}
        title={contextMenu?.person.name}
        x={contextMenu?.x ?? 0}
        y={contextMenu?.y ?? 0}
        onClose={() => setContextMenu(null)}
      />
    </div>
  )
}
