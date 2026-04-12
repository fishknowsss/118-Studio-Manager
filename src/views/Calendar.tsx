import { useState } from 'react'
import { dateToStr, getCalendarDays, today } from '../legacy/utils'
import { buildProjectEventSummaryMap } from '../legacy/selectors'
import { useLegacyStoreSnapshot } from '../legacy/useLegacyStore'
import { usePlanner } from '../features/planner/PlannerProvider'

const MONTHS = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']

export function Calendar() {
  const store = useLegacyStoreSnapshot()
  const [currentDate, setCurrentDate] = useState(() => new Date())
  const { openPlanner } = usePlanner()

  const days = getCalendarDays(currentDate.getFullYear(), currentDate.getMonth())
  const eventMap = buildProjectEventSummaryMap(store.projects)

  return (
    <div className="view-calendar fade-in">
      <div className="view-header">
        <h1 className="view-title">日历</h1>
        <div className="cal-nav">
          <button
            className="cal-nav-btn"
            type="button"
            onClick={() => setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <span className="cal-month-label">{currentDate.getFullYear()} · {MONTHS[currentDate.getMonth()]}</span>
          <button
            className="cal-nav-btn"
            type="button"
            onClick={() => setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
          <button className="btn btn-secondary btn-sm" type="button" onClick={() => setCurrentDate(new Date())}>
            今天
          </button>
        </div>
      </div>

      <div className="cal-body">
        <div className="cal-dow-row">
          {['日', '一', '二', '三', '四', '五', '六'].map((day) => (
            <div key={day} className="cal-dow-cell">{day}</div>
          ))}
        </div>
        <div className="cal-grid">
          {days.map(({ date, otherMonth }) => {
            const dateStr = dateToStr(date)
            const events = eventMap[dateStr] || { ddls: [], milestones: [] }
            const isToday = dateStr === today()
            const moreCount = events.ddls.length + events.milestones.length - 4

            return (
              <button
                key={dateStr}
                type="button"
                className={`cal-cell ${isToday ? 'today' : ''} ${otherMonth ? 'other-month' : ''}`}
                onClick={() => openPlanner(dateStr)}
              >
                <div className="cal-day-num">{date.getDate()}</div>
                {events.ddls.slice(0, 2).map((item) => (
                  <div key={`ddl-${item}`} className="cal-event ddl" title={item}>⬡ {item}</div>
                ))}
                {events.milestones.slice(0, 2).map((item) => (
                  <div key={`ms-${item}`} className="cal-event milestone" title={item}>◆ {item}</div>
                ))}
                {moreCount > 0 ? <div className="cal-event more">+{moreCount} 项</div> : null}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
