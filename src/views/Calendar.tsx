import { useState } from 'react'
import { dateToStr, getCalendarDays } from '../legacy/utils'
import { buildProjectEventSummaryMap } from '../legacy/selectors'
import { useLegacyStoreSnapshot } from '../legacy/useLegacyStore'
import { usePlanner } from '../features/planner/PlannerProvider'
import { useTodayKey } from '../legacy/useTodayDate'

const MONTHS = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']

export function Calendar() {
  const store = useLegacyStoreSnapshot()
  const [currentDate, setCurrentDate] = useState(() => new Date())
  const { openPlanner } = usePlanner()
  const todayStr = useTodayKey()

  const days = getCalendarDays(currentDate.getFullYear(), currentDate.getMonth())
  const eventMap = buildProjectEventSummaryMap(store.projects, todayStr)

  const leaveByDate = store.leaveRecords.reduce<Record<string, string[]>>((acc, r) => {
    const name = store.people.find((p) => p.id === r.personId)?.name || '未知'
    ;(acc[r.date] ??= []).push(name)
    return acc
  }, {})

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
            const events = eventMap[dateStr]
            const ddlEvents = events?.ddls || []
            const isToday = dateStr === todayStr
            const leaveNames = leaveByDate[dateStr]
            const eventTotal = ddlEvents.length
            const eventSlots = leaveNames ? 3 : 4
            const moreCount = eventTotal - eventSlots

            return (
              <button
                key={dateStr}
                type="button"
                className={`cal-cell ${isToday ? 'today' : ''} ${otherMonth ? 'other-month' : ''}`}
                onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); openPlanner(dateStr, r.left + r.width / 2, r.top + r.height / 2) }}
              >
                <div className="cal-day-num">{date.getDate()}</div>
                {ddlEvents.slice(0, eventSlots).map((item) => (
                  <div key={`ddl-${item.label}`} className={`cal-event ddl ${item.toneKey}`} title={item.label}>⬡ {item.label}</div>
                ))}
                {moreCount > 0 ? <div className="cal-event more">+{moreCount} 项</div> : null}
                {leaveNames ? (
                  <div
                    className="cal-event cal-leave-chip"
                    title={leaveNames.join('、') + ' 请假'}
                  >
                    假 {leaveNames.length > 1 ? `${leaveNames.length}人` : leaveNames[0]}
                  </div>
                ) : null}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
