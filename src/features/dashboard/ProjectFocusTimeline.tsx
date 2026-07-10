import type React from 'react'
import { Flag, PackageCheck, Search } from 'lucide-react'
import type { DashboardProjectFocusTimelineModel } from '../../legacy/selectors'
import { formatDate } from '../../legacy/utils'

/** Lucide 语义图标：开工旗 / 审查放大镜 / 交付包裹（尺寸配合实体 badge，避免 filter halo） */
const MARKER_SIZE = 16
const MARKER_STROKE = 2.25

/**
 * Project focus Gantt strip.
 * Markers: Lucide Flag · Search · PackageCheck（保留白色 halo，颜色跟 bar 紧急色 / 主色）
 */
export function ProjectFocusTimeline({
  model,
  onExpandProject,
}: {
  model: DashboardProjectFocusTimelineModel
  onExpandProject: (id: string, x: number, y: number) => void
}) {
  if (model.items.length === 0) {
    return <div className="focus-empty focus-empty--timeline">新建项目后，这里会显示排期</div>
  }

  const ticks = model.axisTicks || []
  const hasToday = model.todayPercent !== null
  const rootStyle = (
    hasToday
      ? { '--pft-today': `${model.todayPercent}%` }
      : undefined
  ) as React.CSSProperties | undefined

  return (
    <div className="project-focus-timeline" style={rootStyle}>
      <div className="pft-axis" aria-hidden="true">
        <div className="pft-axis-meta">
          <span className="pft-axis-range">{model.rangeLabel || `${model.axisStartLabel} – ${model.axisEndLabel}`}</span>
          {model.hiddenCount > 0 ? <span className="pft-hidden-count">另 {model.hiddenCount} 项</span> : null}
        </div>

        <div className="pft-axis-track">
          {ticks.map((tick) => (
            <span
              key={`${tick.date}-${tick.percent}`}
              className={`pft-axis-tick${tick.isMajor ? ' is-major' : ''}${tick.isToday ? ' is-today' : ''}`}
              style={{ '--pft-tick': `${tick.percent}%` } as React.CSSProperties}
            >
              <span className="pft-axis-tick-mark" />
              <span className="pft-axis-tick-label">{tick.isToday ? '今天' : tick.label}</span>
            </span>
          ))}
        </div>

        <div className="pft-axis-aside">交付</div>
      </div>

      <div className="pft-rows-shell">
        {hasToday ? (
          <div className="pft-today-layer" aria-hidden="true">
            <div className="pft-today-layer-gutter" />
            <div className="pft-today-layer-track">
              <span className="pft-today-band" />
              <span className="pft-today-line" />
            </div>
            <div className="pft-today-layer-gutter pft-today-layer-gutter--aside" />
          </div>
        ) : null}

        <div className="pft-rows">
          {model.items.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`pft-row ${item.urgencyKey}`}
              aria-label={`${item.name}，${item.phaseLabel}，进度 ${item.progressPercent}%，${item.actionLabel}，${item.deliveryLabel || formatDate(item.deliveryDate || item.endDate)}`}
              onClick={(event) => {
                const rect = event.currentTarget.getBoundingClientRect()
                onExpandProject(item.id, rect.left + rect.width / 2, rect.top + rect.height / 2)
              }}
            >
              <div className="pft-identity">
                <div className="pft-name" title={item.name}>{item.name}</div>
                <div className="pft-signal">
                  <span className="pft-phase">{item.phaseLabel}</span>
                  <span className="pft-action" data-kind={item.actionKind} title={item.actionLabel}>
                    {item.actionLabel}
                  </span>
                </div>
              </div>

              <div className="pft-track" aria-hidden="true">
                {ticks.map((tick) => (
                  <span
                    key={`grid-${item.id}-${tick.date}`}
                    className={`pft-grid-line${tick.isToday ? ' is-today' : ''}${tick.isMajor ? ' is-major' : ''}`}
                    style={{ '--pft-tick': `${tick.percent}%` } as React.CSSProperties}
                  />
                ))}

                <span
                  className="pft-bar"
                  style={{
                    '--pft-start': `${item.barStartPercent}%`,
                    '--pft-width': `${item.barWidthPercent}%`,
                    '--pft-progress': `${item.progressPercent}%`,
                    '--pft-progress-min': item.progressPercent > 0 ? '10px' : '0px',
                  } as React.CSSProperties}
                  title={`${formatDate(item.startDate)} → ${formatDate(item.endDate)} · ${item.progressText}`}
                >
                  <span className="pft-bar-fill" />
                </span>

                <span
                  className="pft-marker pft-marker--start"
                  style={{ '--pft-point': `${item.startPercent}%` } as React.CSSProperties}
                  title="开始"
                >
                  <span className="pft-marker-badge" aria-hidden="true">
                    <Flag
                      className="pft-marker-glyph"
                      data-pft-marker-icon="start"
                      size={MARKER_SIZE}
                      strokeWidth={MARKER_STROKE}
                      absoluteStrokeWidth
                    />
                  </span>
                </span>

                {item.reviewPercent !== null ? (
                  <span
                    className="pft-marker pft-marker--review"
                    style={{ '--pft-point': `${item.reviewPercent}%` } as React.CSSProperties}
                    title="审查"
                  >
                    <span className="pft-marker-badge" aria-hidden="true">
                      <Search
                        className="pft-marker-glyph"
                        data-pft-marker-icon="review"
                        size={MARKER_SIZE}
                        strokeWidth={MARKER_STROKE}
                        absoluteStrokeWidth
                      />
                    </span>
                  </span>
                ) : null}

                {item.deliveryPercent !== null ? (
                  <span
                    className="pft-marker pft-marker--delivery"
                    style={{ '--pft-point': `${item.deliveryPercent}%` } as React.CSSProperties}
                    title="交付"
                  >
                    <span className="pft-marker-badge" aria-hidden="true">
                      <PackageCheck
                        className="pft-marker-glyph"
                        data-pft-marker-icon="delivery"
                        size={MARKER_SIZE}
                        strokeWidth={MARKER_STROKE}
                        absoluteStrokeWidth
                      />
                    </span>
                  </span>
                ) : null}
              </div>

              <div className="pft-aside" aria-hidden="true">
                <span className="pft-progress">
                  <strong>{item.progressPercent}%</strong>
                  <span>{item.progressText}</span>
                </span>
                <strong
                  className={`pft-delivery${item.daysToDelivery !== null && item.daysToDelivery < 0 ? ' is-overdue' : ''}${item.daysToDelivery === 0 ? ' is-today' : ''}`}
                >
                  {item.deliveryLabel || formatDate(item.deliveryDate || item.endDate)}
                </strong>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
