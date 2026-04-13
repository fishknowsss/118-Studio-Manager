import type React from 'react'
import { buildProjectTimelineModel } from '../../legacy/selectors'
import { formatDate } from '../../legacy/utils'

export function ProjectTimeline({
  timeline,
}: {
  timeline: ReturnType<typeof buildProjectTimelineModel>
}) {
  return (
    <div className="timeline-shell">
      <div className="timeline-header">
        <div className="timeline-name-cell">项目名称</div>
        <div className="timeline-days">
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
          <div key={row.id} className="timeline-row">
            <div className="timeline-name-cell">{row.name}</div>
            <div className="timeline-track">
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
          </div>
        ))}
      </div>
    </div>
  )
}
