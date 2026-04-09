import { useParams, useNavigate } from 'react-router-dom'
import { usePerson } from '../hooks/usePeople'
import { useAssignments } from '../hooks/useAssignments'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/database'
import { PageHeader } from '../components/PageHeader'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { Badge } from '../components/Badge'
import { TaskStatusBadge } from '../components/StatusBadge'
import { EmptyState } from '../components/EmptyState'
import { formatDate } from '../utils/date'
import { ASSIGNMENT_STATUS_LABELS } from '../constants'

export function PersonDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const person = usePerson(id)
  const { assignments } = useAssignments()

  const personAssignments = assignments.filter(a => a.personId === id)
  const relatedTasks = useLiveQuery(async () => {
    const taskIds = [...new Set(personAssignments.map(a => a.taskId))]
    if (taskIds.length === 0) return []
    return db.tasks.where('id').anyOf(taskIds).toArray()
  }, [personAssignments.length]) ?? []

  if (person === undefined) {
    return <div className="text-text-secondary">加载中...</div>
  }

  if (person === null) {
    return (
      <EmptyState
        title="人员不存在"
        description="这位成员可能已被删除，或者链接已经失效。"
        actionLabel="返回人员列表"
        onAction={() => navigate('/people')}
      />
    )
  }

  return (
    <>
      <PageHeader
        title={person.name}
        subtitle={person.role || '未设置角色'}
        actions={<Button variant="secondary" onClick={() => navigate('/people')}>返回列表</Button>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-5 lg:col-span-1">
          <h3 className="text-sm font-medium text-text-primary mb-3">基本信息</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-text-secondary">状态</span>
              <Badge className={person.isActive ? 'text-accent-teal bg-accent-teal/10' : 'text-text-muted bg-gray-100'}>
                {person.isActive ? '在职' : '停用'}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">创建时间</span>
              <span>{formatDate(person.createdAt)}</span>
            </div>
          </div>
          {person.skills.length > 0 && (
            <div className="mt-4">
              <h4 className="text-xs font-medium text-text-secondary mb-2">技能</h4>
              <div className="flex flex-wrap gap-1">
                {person.skills.map((skill, i) => (
                  <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">{skill}</span>
                ))}
              </div>
            </div>
          )}
          {person.note && (
            <div className="mt-4">
              <h4 className="text-xs font-medium text-text-secondary mb-1">备注</h4>
              <p className="text-sm text-text-primary">{person.note}</p>
            </div>
          )}
        </Card>

        <div className="lg:col-span-2">
          <h3 className="text-sm font-medium text-text-primary mb-3">分配记录 ({personAssignments.length})</h3>
          {personAssignments.length === 0 ? (
            <EmptyState title="暂无分配记录" description="通过日计划页面为此人员分配任务" />
          ) : (
            <div className="space-y-2">
              {personAssignments.map(a => {
                const task = relatedTasks.find(t => t.id === a.taskId)
                return (
                  <Card key={a.id} className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{task?.title ?? '未知任务'}</p>
                        <p className="text-xs text-text-secondary">{formatDate(a.date)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {task && <TaskStatusBadge status={task.status} />}
                        <Badge>{ASSIGNMENT_STATUS_LABELS[a.assignmentStatus]}</Badge>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
