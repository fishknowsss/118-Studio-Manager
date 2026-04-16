import type { DashboardFocusCard } from '../../legacy/selectors'

export function FocusSecondaryCards({
  cards,
  onExpandProject,
  showSingleProjectEmpty,
}: {
  cards: DashboardFocusCard[]
  onExpandProject: (id: string, x: number, y: number) => void
  showSingleProjectEmpty: boolean
}) {
  return (
    <div className={`focus-secondary-list${cards.length >= 5 ? ' focus-secondary-list--three-cols' : cards.length > 2 ? ' focus-secondary-list--two-rows' : ''}`}>
      {cards.map((card) => (
        <div
          key={card.id}
          className={`focus-card ${card.urgencyKey}`}
          onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); onExpandProject(card.id, r.left + r.width / 2, r.top + r.height / 2) }}
        >
          <div className="focus-card-ddl">{card.ddlLabel}</div>
          <div className="focus-card-name">{card.name}</div>
          <div className="focus-card-meta">
            {card.openTaskCount} 个未完成任务 · {card.assigneeCount > 0 ? `${card.assigneeCount} 人参与` : '暂无人员分配'}
          </div>
          {card.daysLeft !== null ? (
            <div className="focus-card-days">
              <span className="focus-card-days-num">{Math.abs(card.daysLeft)}</span>
              <span className="focus-card-days-unit">{card.daysLeft < 0 ? '天逾期' : card.daysLeft === 0 ? '今日截止' : '天'}</span>
            </div>
          ) : null}
        </div>
      ))}
      {showSingleProjectEmpty ? <div className="focus-empty">当前仅 1 个活跃项目</div> : null}
    </div>
  )
}
