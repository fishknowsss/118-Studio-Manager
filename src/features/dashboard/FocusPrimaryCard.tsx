import type { LegacyProject } from '../../legacy/store'
import { getDashboardFocusData } from '../../legacy/selectors'
import { ddlLabel, formatDate } from '../../legacy/utils'
import { URGENCY_TEXT } from './focusLabels'

export function FocusPrimaryCard({
  focusData,
  project,
  onOpenProjects,
}: {
  focusData: ReturnType<typeof getDashboardFocusData>
  onOpenProjects: () => void
  project: LegacyProject
}) {
  return (
    <div
      className={`focus-highlight ${focusData?.uc || ''}`}
      onClick={onOpenProjects}
    >
      <div className="focus-highlight-head">
        <div>
          <div className="focus-highlight-label">最紧急项目</div>
          <div className="focus-highlight-name">{project.name}</div>
          <div className="focus-highlight-ddl">{ddlLabel(project.ddl || null, project.status || 'active')}</div>
        </div>
        <div className="focus-highlight-tier">{URGENCY_TEXT[focusData?.uc || ''] || '未迫近'}</div>
      </div>
      <div className="focus-highlight-brief">{focusData?.brief}</div>
      <div className="focus-highlight-meta">
        <span>今日事项 {focusData?.todayCount}</span>
        <span>逾期任务 {focusData?.overdueCount}</span>
        <span>未完成 {focusData?.remainingCount}</span>
        {focusData?.nextMs ? (
          <span>关键节点 {focusData.nextMs.title} · {formatDate(focusData.nextMs.date || null)}</span>
        ) : (
          <span>关键节点 暂无</span>
        )}
      </div>
    </div>
  )
}
