import type { DashboardMiniCalendarModel } from '../../legacy/selectors'

export function DashboardMiniCalendar({
  model,
  onNextMonth,
  onOpenDate,
  onPrevMonth,
}: {
  model: DashboardMiniCalendarModel
  onNextMonth: () => void
  onOpenDate: (dateKey: string) => void
  onPrevMonth: () => void
}) {
  return (
    <div className="dash-right">
      <div className="mini-cal-header">
        <span className="mini-cal-title">{model.title}</span>
        <div className="mini-cal-nav">
          <button className="mini-cal-btn" title="上月" onClick={onPrevMonth}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <button className="mini-cal-btn" title="下月" onClick={onNextMonth}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
          </button>
        </div>
      </div>
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
            <div key={day.dateKey} className={classes} onClick={() => onOpenDate(day.dateKey)}>
              {day.dayOfMonth}
            </div>
          )
        })}
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
