export function ProjectOverviewToolbar({
  onPriorityChange,
  onSearchChange,
  onStatusChange,
  priority,
  search,
  status,
}: {
  onPriorityChange: (value: string) => void
  onSearchChange: (value: string) => void
  onStatusChange: (value: string) => void
  priority: string
  search: string
  status: string
}) {
  return (
    <div className="project-overview-toolbar">
      <label className="sr-only" htmlFor="project-overview-search">搜索项目</label>
      <input
        id="project-overview-search"
        className="filter-input"
        value={search}
        placeholder="搜索项目名称或描述"
        onChange={(event) => onSearchChange(event.target.value)}
      />
      <select
        className="filter-select"
        aria-label="项目状态"
        value={status}
        onChange={(event) => onStatusChange(event.target.value)}
      >
        <option value="">全部状态</option>
        <option value="active">进行中</option>
        <option value="paused">暂停</option>
        <option value="completed">已完成</option>
        <option value="cancelled">已取消</option>
      </select>
      <select
        className="filter-select"
        aria-label="项目优先级"
        value={priority}
        onChange={(event) => onPriorityChange(event.target.value)}
      >
        <option value="">全部优先级</option>
        <option value="urgent">紧急</option>
        <option value="high">高</option>
        <option value="medium">中</option>
        <option value="low">低</option>
      </select>
    </div>
  )
}
