import type { LegacyProject } from '../../legacy/store'
import { getDashboardFocusData } from '../../legacy/selectors'
import { ddlLabel, daysUntil } from '../../legacy/utils'

export function FocusPrimaryCard({
  focusData,
  project,
  toneKey,
  onExpandProject,
}: {
  focusData: ReturnType<typeof getDashboardFocusData>
  onExpandProject: (x: number, y: number) => void
  project: LegacyProject
  toneKey: string
}) {
  const statusKey = project.status || 'active'
  const daysLeft = (statusKey === 'active' || statusKey === 'paused') ? (daysUntil(project.ddl || null) ?? null) : null

  return (
    <div
      className={`focus-highlight ${toneKey}`}
      onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); onExpandProject(r.left + r.width / 2, r.top + r.height / 2) }}
    >
      <div className="focus-highlight-ddl">{ddlLabel(project.ddl || null, statusKey)}</div>
      <div className="focus-highlight-body">
        <div className="focus-highlight-left">
          <div className="focus-highlight-name">{project.name}</div>
          {focusData ? (
            <div className="focus-highlight-summary">
              {focusData.remainingCount} 个未完成任务 · {focusData.assigneeCount > 0 ? `${focusData.assigneeCount} 人参与` : '暂无人员分配'}
            </div>
          ) : null}
        </div>
        {focusData && focusData.topTasks.length > 0 ? (
          <div className={`focus-highlight-tasks${focusData.topTasks.length > 4 ? ' focus-highlight-tasks--two-cols' : ''}`}>
            {focusData.topTasks.map((title, i) => (
              <div key={i} className="focus-highlight-task-item">{title}</div>
            ))}
            {focusData.remainingCount > 8 ? (
              <div className="focus-highlight-task-more">+{focusData.remainingCount - 8}</div>
            ) : null}
          </div>
        ) : null}
      </div>
      {daysLeft !== null ? (
        <div className="focus-highlight-days">
          <span className="focus-highlight-days-num">{Math.abs(daysLeft)}</span>
          <span className="focus-highlight-days-unit">{daysLeft < 0 ? '天逾期' : daysLeft === 0 ? '今日截止' : '天'}</span>
        </div>
      ) : null}
    </div>
  )
}
