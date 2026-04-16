import { useState, type DragEvent, type MouseEvent } from 'react'
import type { DashboardMiniCalendarModel } from '../../legacy/selectors'

export function DashboardMiniCalendar({
  draggingPersonId,
  model,
  onDropPersonToDate,
  onExpand,
  onNextMonth,
  onOpenDate,
  onPrevMonth,
}: {
  draggingPersonId: string | null
  model: DashboardMiniCalendarModel
  onDropPersonToDate: (personId: string, dateKey: string) => void
  onExpand: (x: number, y: number) => void
  onNextMonth: () => void
  onOpenDate: (dateKey: string, ox: number, oy: number) => void
  onPrevMonth: () => void
}) {
  const [dragOverDate, setDragOverDate] = useState<string | null>(null)

  const handleDragOver = (e: DragEvent<HTMLDivElement>, dateKey: string) => {
    if (!draggingPersonId && !e.dataTransfer.types.includes('application/x-118studio-person-id')) return
    e.preventDefault()
    setDragOverDate(dateKey)
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    // only clear if truly leaving the cell (not entering a child)
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverDate(null)
    }
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>, dateKey: string) => {
    e.preventDefault()
    setDragOverDate(null)
    const personId = draggingPersonId || e.dataTransfer.getData('application/x-118studio-person-id')
    if (!personId) return
    onDropPersonToDate(personId, dateKey)
  }

  const currentMonthKey = model.days.find((d) => !d.isOtherMonth)?.dateKey.slice(0, 7) ?? ''

  const handleDayClick = (day: (typeof model.days)[number], e: MouseEvent<HTMLDivElement>) => {
    if (day.isOtherMonth && currentMonthKey) {
      const clickedMonthKey = day.dateKey.slice(0, 7)
      if (clickedMonthKey < currentMonthKey) onPrevMonth()
      else onNextMonth()
      return
    }
    const r = e.currentTarget.getBoundingClientRect()
    onOpenDate(day.dateKey, r.left + r.width / 2, r.top + r.height / 2)
  }

  return (
    <div className="dash-right">
      <div
        className="panel-header panel-header--expandable"
        onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); onExpand(r.left + r.width / 2, r.top + r.height / 2) }}
      >
        <span className="panel-title">{model.title}</span>
        <span className="panel-action">展开全部</span>
      </div>
      <div className="mini-cal-grid-wrap">
      <div className="mini-cal-grid">
        {model.weekdays.map((day) => (
          <div key={day} className="mini-cal-dow">{day}</div>
        ))}
        {model.days.map((day) => {
          const classes = [
            'mini-cal-day',
            day.isToday ? 'today' : '',
            day.isOtherMonth ? 'other-month' : '',
            day.hasEvents ? 'has-events' : '',
            day.markerKind === 'ddl' ? 'has-ddl' : '',
            day.markerTone || '',
            draggingPersonId && dragOverDate === day.dateKey ? 'leave-drop-target' : '',
          ].filter(Boolean).join(' ')

          return (
            <div
              key={day.dateKey}
              className={classes}
              onClick={(e) => handleDayClick(day, e)}
              onDragOver={(e) => handleDragOver(e, day.dateKey)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, day.dateKey)}
            >
              {day.dayOfMonth}
              {day.hasLeave && <span className="mini-cal-leave-badge">假</span>}
            </div>
          )
        })}
      </div>
      </div>
      <div className="mini-cal-footer">
        <div className="cal-legend">
          <div className="cal-legend-item">
            <div className="cal-legend-scale">
              <div className="cal-legend-dot focus-overdue"></div>
              <div className="cal-legend-dot focus-critical"></div>
              <div className="cal-legend-dot focus-strong"></div>
              <div className="cal-legend-dot focus-medium"></div>
              <div className="cal-legend-dot focus-calm"></div>
              <div className="cal-legend-dot focus-neutral"></div>
            </div>
            截止越近越暖
          </div>
        </div>
        <div className="mini-cal-nav" aria-label="切换月份">
          <button className="mini-cal-btn" title="上月" type="button" onClick={onPrevMonth}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <button className="mini-cal-btn" title="下月" type="button" onClick={onNextMonth}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
          </button>
        </div>
      </div>
    </div>
  )
}
