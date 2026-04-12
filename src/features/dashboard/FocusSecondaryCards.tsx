import type { DashboardFocusCard } from '../../legacy/selectors'
import { formatDate } from '../../legacy/utils'
import { URGENCY_TEXT } from './focusLabels'

export function FocusSecondaryCards({
  cards,
  onOpenProjects,
  showSingleProjectEmpty,
}: {
  cards: DashboardFocusCard[]
  onOpenProjects: () => void
  showSingleProjectEmpty: boolean
}) {
  return (
    <div className="focus-secondary-list">
      {cards.map((card) => (
        <div
          key={card.id}
          className={`focus-card ${card.urgencyKey}`}
          onClick={onOpenProjects}
        >
          <div className="focus-card-name">{card.name}</div>
          <div className="focus-card-ddl">{card.ddlLabel}</div>
          <div className="focus-card-meta">
            <span>{URGENCY_TEXT[card.urgencyKey] || '未迫近'}</span>
            <span>{card.openTaskCount} 个任务</span>
          </div>
          {card.nextMilestone ? (
            <div className="focus-card-milestone">◆ {card.nextMilestone.title} · {formatDate(card.nextMilestone.date || null)}</div>
          ) : null}
        </div>
      ))}
      {showSingleProjectEmpty ? <div className="focus-empty">当前仅 1 个活跃项目</div> : null}
    </div>
  )
}
