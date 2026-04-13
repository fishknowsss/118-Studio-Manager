import type { DashboardMiniCalendarModel } from '../../legacy/selectors'

export function DashboardMiniCalendar({
  model,
  onExpand,
  onNextMonth,
  onOpenDate,
  onPrevMonth,
}: {
  model: DashboardMiniCalendarModel
  onExpand: (x: number, y: number) => void
  onNextMonth: () => void
  onOpenDate: (dateKey: string, ox: number, oy: number) => void
  onPrevMonth: () => void
}) {
  return (
    <div className="dash-right">
      <div className="mini-cal-header">
        <span className="mini-cal-title" style={{ cursor: 'pointer' }} onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); onExpand(r.left + r.width / 2, r.top + r.height / 2) }}>{model.title}</span>
        <div className="mini-cal-nav">
          <button className="mini-cal-expand-btn" title="展开日历" type="button" onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); onExpand(r.left + r.width / 2, r.top + r.height / 2) }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
            </svg>
          </button>
          <button className="mini-cal-btn" title="上月" onClick={onPrevMonth}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <button className="mini-cal-btn" title="下月" onClick={onNextMonth}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
          </button>
        </div>
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
            day.hasUrgent ? 'has-urgent' : '',
          ].filter(Boolean).join(' ')

          return (
            <div key={day.dateKey} className={classes} onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); onOpenDate(day.dateKey, r.left + r.width / 2, r.top + r.height / 2) }}>
              {day.dayOfMonth}
            </div>
          )
        })}
      </div>
      </div>
      <div className="cal-legend">
        <div className="cal-legend-item">
          <div className="cal-legend-dot ddl"></div> DDL
        </div>
        <div className="cal-legend-item">
          <div className="cal-legend-dot milestone"></div> 里程碑
        </div>
      </div>
    </div>
  )
}
