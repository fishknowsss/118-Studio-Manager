import type React from 'react'
import type {
  ProjectWorkspaceGroupKey,
  ProjectWorkspaceItemModel,
} from '../../legacy/selectors'

const PROJECT_WORKSPACE_GROUPS: Array<{
  key: ProjectWorkspaceGroupKey
  label: string
}> = [
  { key: 'attention', label: '需要关注' },
  { key: 'progressing', label: '正在推进' },
  { key: 'planning', label: '等待安排' },
  { key: 'finished', label: '已结束' },
]

function ProjectWorkspaceRow({
  item,
  onDelete,
  onEdit,
  onOpen,
  onStatusMenu,
}: {
  item: ProjectWorkspaceItemModel
  onDelete: (projectId: string) => void
  onEdit: (projectId: string) => void
  onOpen: (projectId: string, x: number, y: number) => void
  onStatusMenu: (event: React.MouseEvent<HTMLButtonElement>, projectId: string) => void
}) {
  const openFromElement = (element: HTMLElement) => {
    const rect = element.getBoundingClientRect()
    onOpen(item.id, rect.left + rect.width / 2, rect.top + rect.height / 2)
  }
  const scheduleLabel = item.ddlText === '—' ? '未排交付' : item.ddlText

  return (
    <article className={`project-workspace-row ${item.urgencyKey}`}>
      <div className="project-workspace-row-main">
        <div className="project-workspace-name-line">
          <strong className="project-workspace-name">{item.name}</strong>
          <button
            type="button"
            className={`badge badge-${item.statusKey} project-workspace-status`}
            aria-label={`更改项目状态 ${item.statusLabel}`}
            onClick={(event) => onStatusMenu(event, item.id)}
          >
            {item.statusLabel}
          </button>
          <span className={`badge badge-${item.priorityKey}`}>{item.priorityLabel}</span>
        </div>
        <div className="project-workspace-next">
          <span>下一步</span>
          <strong>{item.nextActionLabel}</strong>
        </div>
        {item.blockedTaskCount > 0 || item.overdueTaskCount > 0 ? (
          <div className="project-workspace-signals" aria-label="项目风险">
            {item.blockedTaskCount > 0 ? <span>受阻 {item.blockedTaskCount}</span> : null}
            {item.overdueTaskCount > 0 ? <span>逾期 {item.overdueTaskCount}</span> : null}
          </div>
        ) : null}
      </div>

      <div className="project-workspace-progress">
        <div>
          <span>进度</span>
          <strong>{item.taskCount > 0 ? `${item.doneCount}/${item.taskCount}` : '0 个任务'}</strong>
        </div>
        <span
          className="project-workspace-progress-track"
          role="progressbar"
          aria-label={`${item.name}项目进度`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={item.progressPercent}
        >
          <span style={{ width: `${item.progressPercent}%` }} />
        </span>
      </div>

      <div className={`project-workspace-schedule ${item.urgencyKey}`}>
        <span>交付</span>
        <strong>{scheduleLabel}</strong>
      </div>

      <div className="project-workspace-row-actions">
        <button className="btn btn-ghost btn-xs" type="button" onClick={(event) => openFromElement(event.currentTarget)}>
          打开
        </button>
        <button className="btn btn-ghost btn-xs" type="button" onClick={() => onEdit(item.id)}>
          编辑
        </button>
        <button className="btn btn-ghost btn-xs project-workspace-delete" type="button" onClick={() => onDelete(item.id)}>
          删除
        </button>
      </div>
    </article>
  )
}

export function ProjectWorkspace({
  items,
  onDelete,
  onEdit,
  onOpen,
  onStatusMenu,
}: {
  items: ProjectWorkspaceItemModel[]
  onDelete: (projectId: string) => void
  onEdit: (projectId: string) => void
  onOpen: (projectId: string, x: number, y: number) => void
  onStatusMenu: (event: React.MouseEvent<HTMLButtonElement>, projectId: string) => void
}) {
  const counts = Object.fromEntries(
    PROJECT_WORKSPACE_GROUPS.map((group) => [
      group.key,
      items.filter((item) => item.groupKey === group.key).length,
    ]),
  ) as Record<ProjectWorkspaceGroupKey, number>

  return (
    <div className="project-workspace">
      <section className="project-workspace-summary" aria-label="项目概览">
        <div className="project-workspace-summary-total">
          <strong>{items.length}</strong>
          <span>个项目</span>
        </div>
        <div data-tone={counts.attention > 0 ? 'risk' : 'neutral'}>
          <strong>{counts.attention}</strong>
          <span>需关注</span>
        </div>
        <div>
          <strong>{counts.progressing}</strong>
          <span>推进中</span>
        </div>
        <div>
          <strong>{counts.planning}</strong>
          <span>待安排</span>
        </div>
      </section>

      {PROJECT_WORKSPACE_GROUPS.map((group) => {
        const groupItems = items.filter((item) => item.groupKey === group.key)
        if (groupItems.length === 0) return null

        return (
          <section className="project-workspace-group" key={group.key} aria-labelledby={`project-workspace-${group.key}`}>
            <header className="project-workspace-group-header">
              <h2 id={`project-workspace-${group.key}`}>{group.label}</h2>
              <span>{groupItems.length}</span>
            </header>
            <div className="project-workspace-list">
              {groupItems.map((item) => (
                <ProjectWorkspaceRow
                  key={item.id}
                  item={item}
                  onDelete={onDelete}
                  onEdit={onEdit}
                  onOpen={onOpen}
                  onStatusMenu={onStatusMenu}
                />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
