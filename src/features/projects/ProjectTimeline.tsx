import type React from 'react'
import { buildProjectTimelineModel } from '../../legacy/selectors'
import { formatDate } from '../../legacy/utils'

export function ProjectTimeline({
  onOpenProject,
  timeline,
}: {
  onOpenProject: (projectId: string, x: number, y: number) => void
  timeline: ReturnType<typeof buildProjectTimelineModel>
}) {
  const todayLeft = timeline.todayOffsetDays === null
    ? null
    : `calc(${timeline.todayOffsetDays} * var(--timeline-day-w, 28px) + var(--timeline-day-w, 28px) / 2)`

  return (
    <div className="timeline-shell">
      <div className="timeline-header">
        <div className="timeline-name-cell">项目名称</div>
        <div className="timeline-days">
          {todayLeft !== null ? (
            <span className="timeline-today-line" style={{ left: todayLeft }} aria-hidden="true" />
          ) : null}
          {timeline.days.map((day) => (
            <div
              key={day.key}
              className={`timeline-day ${day.isMonthStart ? 'month-start' : ''} ${day.isWeekend ? 'weekend' : ''}`}
            >
              {day.monthLabel || day.day}
            </div>
          ))}
        </div>
      </div>
      <div className="timeline-body">
        {timeline.rows.map((row) => (
          <button
            key={row.id}
            type="button"
            className="timeline-row"
            aria-label={`查看项目 ${row.name}`}
            onClick={(event) => {
              const rect = event.currentTarget.getBoundingClientRect()
              onOpenProject(row.id, rect.left + rect.width / 2, rect.top + rect.height / 2)
            }}
          >
            <div className="timeline-name-cell">{row.name}</div>
            <div className="timeline-track">
              {todayLeft !== null ? (
                <span className="timeline-today-line" style={{ left: todayLeft }} aria-hidden="true" />
              ) : null}
              <div
                className={`timeline-bar ${row.urgencyKey}`}
                style={{
                  '--timeline-offset': String(row.offsetDays),
                  '--timeline-span': String(row.durationDays),
                } as React.CSSProperties}
              >
                {row.name} ({formatDate(row.endDate)})
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
