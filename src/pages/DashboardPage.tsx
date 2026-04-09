import { useNavigate } from 'react-router-dom'
import { useDashboard } from '../hooks/useDashboard'
import { useLogs } from '../hooks/useLogs'
import { useSettings } from '../hooks/useSettings'
import { PageHeader } from '../components/PageHeader'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { Badge } from '../components/Badge'
import { ProjectStatusBadge } from '../components/StatusBadge'
import { formatDateCN, formatDateTime, today, daysUntil } from '../utils/date'
import { ASSIGNMENT_STATUS_LABELS, MILESTONE_TYPE_LABELS, MILESTONE_TYPE_COLORS } from '../constants'
import dayjs from 'dayjs'

export function DashboardPage() {
  const navigate = useNavigate()
  const stats = useDashboard()
  const logs = useLogs(15)
  const { setting } = useSettings()
  const todayStr = today()
  const shouldRemindBackup = !setting?.lastBackupAt || dayjs().diff(dayjs(setting.lastBackupAt), 'day') >= (setting?.backupReminderDays || 7)

  const statCards = [
    { label: '今日分配', value: stats.todayTasks, color: 'text-primary', bgAccent: 'bg-primary/6', onClick: () => navigate(`/planner/${todayStr}`) },
    { label: '进行中', value: stats.inProgressTasks, color: 'text-primary', bgAccent: 'bg-primary/6', onClick: () => navigate('/tasks') },
    { label: '已逾期', value: stats.overdueTasks, color: 'text-danger', bgAccent: 'bg-danger/6', onClick: () => navigate('/tasks') },
    { label: '已完成', value: stats.completedTasks, color: 'text-accent-teal', bgAccent: 'bg-accent-teal/6', onClick: () => navigate('/tasks') },
  ]

  return (
    <>
      <PageHeader
        title={`${dayjs().format('M月D日 dddd')}`}
        subtitle={`共 ${stats.totalProjects} 个项目, ${stats.totalTasks} 个任务`}
      />

      {shouldRemindBackup && (
        <Card className="p-4 mb-6 border-warning/30 bg-warning/5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-text-primary">建议尽快备份当前数据</p>
              <p className="text-xs text-text-secondary mt-1">
                {setting?.lastBackupAt
                  ? `距离上次备份已超过 ${setting.backupReminderDays} 天`
                  : '当前还没有完整备份记录'}
              </p>
            </div>
            <Button variant="secondary" onClick={() => navigate('/settings')}>前往备份</Button>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map(card => (
          <Card
            key={card.label}
            className="p-5"
            hoverable={!!card.onClick}
            onClick={card.onClick}
          >
            <p className="text-xs font-medium text-text-muted mb-2 tracking-wide uppercase">{card.label}</p>
            <p className={`text-3xl font-semibold ${card.color} tracking-tight`}>{card.value}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-6">
          {stats.overdueProjects.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-danger mb-3 uppercase tracking-wide">逾期项目</h3>
              <div className="space-y-2">
                {stats.overdueProjects.map(p => (
                  <Card key={p.id} hoverable onClick={() => navigate(`/projects/${p.id}`)} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-1.5 h-10 rounded-full" style={{ backgroundColor: p.color }} />
                        <div>
                          <p className="text-sm font-medium">{p.name}</p>
                          <p className="text-xs text-danger mt-0.5">逾期 {Math.abs(daysUntil(p.deadline))} 天</p>
                        </div>
                      </div>
                      <ProjectStatusBadge status={p.status} />
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          <div>
            <h3 className="text-xs font-semibold text-text-secondary mb-3 uppercase tracking-wide">近 7 天截止项目</h3>
            {stats.upcomingDeadlines.length === 0 ? (
              <p className="text-sm text-text-muted py-6">近 7 天没有项目截止</p>
            ) : (
              <div className="space-y-2">
                {stats.upcomingDeadlines.map(p => (
                  <Card key={p.id} hoverable onClick={() => navigate(`/projects/${p.id}`)} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-1.5 h-10 rounded-full" style={{ backgroundColor: p.color }} />
                        <div>
                          <p className="text-sm font-medium">{p.name}</p>
                          <p className="text-xs text-text-secondary mt-0.5">
                            {formatDateCN(p.deadline)} 截止
                            <span className="text-warning ml-1.5">还剩 {daysUntil(p.deadline)} 天</span>
                          </p>
                        </div>
                      </div>
                      <ProjectStatusBadge status={p.status} />
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wide">今日安排</h3>
              <Button size="sm" variant="secondary" onClick={() => navigate(`/planner/${todayStr}`)}>打开日计划</Button>
            </div>
            {stats.todayAssignmentDetails.length === 0 ? (
              <p className="text-sm text-text-muted py-6">今天还没有分配任务</p>
            ) : (
              <div className="space-y-2 mb-6">
                {stats.todayAssignmentDetails.slice(0, 6).map(assignment => (
                  <Card key={assignment.id} className="p-3.5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{assignment.task?.title ?? '未知任务'}</p>
                        <p className="text-xs text-text-secondary mt-0.5 truncate">
                          {assignment.person?.name || '未指派成员'}
                          {assignment.project?.name ? ` · ${assignment.project.name}` : ''}
                        </p>
                      </div>
                      <Badge>{ASSIGNMENT_STATUS_LABELS[assignment.assignmentStatus]}</Badge>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="text-xs font-semibold text-text-secondary mb-3 uppercase tracking-wide">近 7 天里程碑</h3>
            {stats.upcomingMilestones.length === 0 ? (
              <p className="text-sm text-text-muted py-6">近 7 天没有里程碑</p>
            ) : (
              <div className="space-y-2">
                {stats.upcomingMilestones.map(m => (
                  <Card key={m.id} className="p-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Badge className={MILESTONE_TYPE_COLORS[m.type]}>{MILESTONE_TYPE_LABELS[m.type]}</Badge>
                      <div>
                        <p className="text-sm font-medium">{m.title}</p>
                        <p className="text-xs text-text-secondary">{formatDateCN(m.date)}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2">
          <h3 className="text-xs font-semibold text-text-secondary mb-3 uppercase tracking-wide">最近操作</h3>
          <Card className="p-4">
            {logs.length === 0 ? (
              <p className="text-sm text-text-muted py-6 text-center">暂无操作记录</p>
            ) : (
              <div className="space-y-0">
                {logs.map((log, index) => (
                  <div key={log.id} className={`flex items-start gap-3 py-3 ${index !== logs.length - 1 ? 'border-b border-border-light' : ''}`}>
                    <div className="w-1.5 h-1.5 rounded-full bg-primary/50 mt-1.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[13px] text-text-primary leading-snug truncate">{log.message}</p>
                      <p className="text-[11px] text-text-muted mt-0.5">{formatDateTime(log.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </>
  )
}
