import { useMemo, useState } from 'react'
import { useConfirm } from '../components/feedback/ConfirmProvider'
import { useToast } from '../components/feedback/ToastProvider'
import { Dialog } from '../components/ui/Dialog'
import { ProjectDialog } from '../features/projects/ProjectDialog'
import { TaskDialog } from '../features/tasks/TaskDialog'
import {
  deleteProjectWithLog,
  deleteTaskWithLog,
  toggleTaskStatus,
} from '../legacy/actions'
import { getFilteredProjects } from '../legacy/selectors'
import {
  type LegacyProject,
  type LegacyTask,
  getTaskAssigneeIds,
} from '../legacy/store'
import { formatDate, formatLocalDateKey, PRIORITY_LABELS, STATUS_LABELS } from '../legacy/utils'
import { useLegacyStoreSnapshot } from '../legacy/useLegacyStore'
import {
  normalizeLinkUrl,
  readRepositoryLinks,
  type RepositoryLink,
  type RepositoryLinkTargetType,
  writeRepositoryLinks,
} from '../features/repository/repositoryLinksState'

type LinkDialogState = {
  targetType: RepositoryLinkTargetType
  targetId: string
  editingLinkId?: string
} | null

const RECOMMENDED_RESOURCES = [
  { title: 'Figma', url: 'https://www.figma.com/' },
  { title: 'Notion', url: 'https://www.notion.so/' },
  { title: '飞书文档', url: 'https://www.feishu.cn/' },
  { title: 'Google Drive', url: 'https://drive.google.com/' },
]

function sortTasksForRepository(tasks: LegacyTask[]) {
  const statusOrder: Record<string, number> = { blocked: 0, 'in-progress': 1, todo: 2, done: 3 }
  const prioOrder: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 }

  return [...tasks].sort((left, right) => {
    const statusGap = (statusOrder[left.status || 'todo'] ?? 2) - (statusOrder[right.status || 'todo'] ?? 2)
    if (statusGap !== 0) return statusGap

    const priorityGap = (prioOrder[left.priority || 'medium'] ?? 2) - (prioOrder[right.priority || 'medium'] ?? 2)
    if (priorityGap !== 0) return priorityGap

    return (left.endDate || '9999-12-31').localeCompare(right.endDate || '9999-12-31')
  })
}

export function Repository() {
  const store = useLegacyStoreSnapshot()
  const { projects, tasks, people } = store
  const { confirm } = useConfirm()
  const { toast } = useToast()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [prioFilter, setPrioFilter] = useState('')
  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>({})
  const [editingProject, setEditingProject] = useState<LegacyProject | null | undefined>(undefined)
  const [editingTask, setEditingTask] = useState<LegacyTask | null | undefined>(undefined)
  const [taskPrefillProjectId, setTaskPrefillProjectId] = useState<string | null>(null)
  const [linkDialog, setLinkDialog] = useState<LinkDialogState>(null)
  const [linkTitle, setLinkTitle] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [linkNote, setLinkNote] = useState('')
  const [links, setLinks] = useState<RepositoryLink[]>(() => readRepositoryLinks())

  const todayStr = useMemo(() => formatLocalDateKey(new Date()), [])

  const taskMapByProjectId = useMemo(() => {
    const map: Record<string, LegacyTask[]> = {}
    for (const task of tasks) {
      if (!task.projectId) continue
      map[task.projectId] ||= []
      map[task.projectId].push(task)
    }

    for (const key of Object.keys(map)) {
      map[key] = sortTasksForRepository(map[key] || [])
    }

    return map
  }, [tasks])

  const filteredProjects = useMemo(() => {
    const sorted = getFilteredProjects(projects, statusFilter, prioFilter, todayStr) as LegacyProject[]
    const normalizedSearch = search.trim().toLowerCase()

    if (!normalizedSearch) return sorted

    return sorted.filter((project) => {
      const projectTasks = taskMapByProjectId[project.id] || []
      const taskMatched = projectTasks.some((task) => (task.title || '').toLowerCase().includes(normalizedSearch))

      return (
        (project.name || '').toLowerCase().includes(normalizedSearch)
        || (project.description || '').toLowerCase().includes(normalizedSearch)
        || taskMatched
      )
    })
  }, [prioFilter, projects, search, statusFilter, taskMapByProjectId, todayStr])

  const peopleNameMap = useMemo(() => {
    const map: Record<string, string> = {}
    for (const person of people) {
      map[person.id] = person.name || '未命名成员'
    }
    return map
  }, [people])

  const saveLinks = (nextLinks: RepositoryLink[]) => {
    setLinks(nextLinks)
    writeRepositoryLinks(nextLinks)
  }

  const openCreateLink = (targetType: RepositoryLinkTargetType, targetId: string) => {
    setLinkDialog({ targetType, targetId })
    setLinkTitle('')
    setLinkUrl('')
    setLinkNote('')
  }

  const openEditLink = (link: RepositoryLink) => {
    setLinkDialog({ targetType: link.targetType, targetId: link.targetId, editingLinkId: link.id })
    setLinkTitle(link.title)
    setLinkUrl(link.url)
    setLinkNote(link.note || '')
  }

  const closeLinkDialog = () => {
    setLinkDialog(null)
    setLinkTitle('')
    setLinkUrl('')
    setLinkNote('')
  }

  const saveLink = () => {
    if (!linkDialog) return

    const nextTitle = linkTitle.trim()
    const nextUrl = normalizeLinkUrl(linkUrl)

    if (!nextTitle) {
      toast('请填写链接标题', 'error')
      return
    }

    if (!nextUrl) {
      toast('请填写链接地址', 'error')
      return
    }

    const now = new Date().toISOString()

    if (linkDialog.editingLinkId) {
      const nextLinks = links.map((link) => (
        link.id === linkDialog.editingLinkId
          ? {
              ...link,
              title: nextTitle,
              url: nextUrl,
              note: linkNote.trim(),
              updatedAt: now,
            }
          : link
      ))
      saveLinks(nextLinks)
      toast('链接已更新', 'success')
      closeLinkDialog()
      return
    }

    const nextLinks = [
      {
        id: crypto.randomUUID(),
        targetType: linkDialog.targetType,
        targetId: linkDialog.targetId,
        title: nextTitle,
        url: nextUrl,
        note: linkNote.trim(),
        createdAt: now,
        updatedAt: now,
      },
      ...links,
    ]

    saveLinks(nextLinks)
    toast('链接已添加', 'success')
    closeLinkDialog()
  }

  const deleteLink = async (link: RepositoryLink) => {
    const ok = await confirm('删除链接', `确认删除「${link.title}」？`)
    if (!ok) return

    saveLinks(links.filter((item) => item.id !== link.id))
    toast('链接已删除', 'success')
  }

  const toggleProjectExpand = (projectId: string) => {
    setExpandedMap((current) => ({
      ...current,
      [projectId]: !(current[projectId] ?? true),
    }))
  }

  const handleDeleteProject = async (project: LegacyProject) => {
    const ok = await confirm('删除项目', `确认删除「${project.name}」？项目下任务会一并删除。`)
    if (!ok) return

    await deleteProjectWithLog(project)
    toast('项目已删除', 'error')
  }

  const handleDeleteTask = async (task: LegacyTask) => {
    const ok = await confirm('删除任务', `确认删除「${task.title}」？`)
    if (!ok) return

    await deleteTaskWithLog(task)
    toast('任务已删除', 'error')
  }

  const getLinksForTarget = (targetType: RepositoryLinkTargetType, targetId: string) => {
    const targetExists = targetType === 'project'
      ? projects.some((p) => p.id === targetId)
      : tasks.some((t) => t.id === targetId)
    if (!targetExists) return []
    return links.filter((link) => link.targetType === targetType && link.targetId === targetId)
  }

  const allExpanded = filteredProjects.every((p) => expandedMap[p.id] !== false)

  const toggleAllExpanded = () => {
    const next: Record<string, boolean> = {}
    for (const p of filteredProjects) {
      next[p.id] = !allExpanded
    }
    setExpandedMap(next)
  }

  return (
    <div className="view-repository fade-in">
      <div className="view-header">
        <h1 className="view-title">仓库</h1>
        <div className="view-actions">
          <div className="filter-bar">
            <input
              className="filter-input"
              placeholder="搜索项目/任务…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <select className="filter-select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="">全部状态</option>
              <option value="active">进行中</option>
              <option value="paused">暂停</option>
              <option value="completed">已完成</option>
              <option value="cancelled">已取消</option>
            </select>
            <select className="filter-select" value={prioFilter} onChange={(event) => setPrioFilter(event.target.value)}>
              <option value="">全部优先级</option>
              <option value="urgent">紧急</option>
              <option value="high">高</option>
              <option value="medium">中</option>
              <option value="low">低</option>
            </select>
          </div>
          {filteredProjects.length > 0 ? (
            <button className="btn btn-secondary" type="button" onClick={toggleAllExpanded}>
              {allExpanded ? '折叠全部' : '展开全部'}
            </button>
          ) : null}
          <button className="btn btn-secondary" type="button" onClick={() => { setTaskPrefillProjectId(null); setEditingTask(null) }}>
            新建任务
          </button>
          <button className="btn btn-primary" type="button" onClick={() => setEditingProject(null)}>
            新建项目
          </button>
        </div>
      </div>

      <div className="view-body">
        <div className="repo-resource-row">
          <span className="repo-resource-label">常用资源</span>
          <div className="repo-resource-links">
            {RECOMMENDED_RESOURCES.map((item) => (
              <a key={item.title} className="repo-resource-link" href={item.url} target="_blank" rel="noreferrer">
                {item.title}
              </a>
            ))}
          </div>
        </div>

        {filteredProjects.length === 0 ? (
          <div className="empty-state">
            <div className="empty-text">当前没有匹配项目，先新建一个吧</div>
          </div>
        ) : (
          <div className="repo-project-list">
            {filteredProjects.map((project) => {
              const projectTasks = taskMapByProjectId[project.id] || []
              const isExpanded = expandedMap[project.id] ?? true
              const projectLinks = getLinksForTarget('project', project.id)

              return (
                <section key={project.id} className="repo-project-card">
                  <div className="repo-project-head">
                    <button
                      type="button"
                      className="repo-expand-btn"
                      onClick={() => toggleProjectExpand(project.id)}
                      aria-label={isExpanded ? '折叠项目任务' : '展开项目任务'}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        {isExpanded ? <polyline points="6 15 12 9 18 15" /> : <polyline points="9 6 15 12 9 18" />}
                      </svg>
                    </button>

                    <div className="repo-project-main">
                      <div className="repo-project-title-row">
                        <h3 className="repo-project-title">{project.name || '未命名项目'}</h3>
                        <span className={`badge badge-${project.status || 'active'}`}>{STATUS_LABELS[project.status || 'active'] || '进行中'}</span>
                        <span className={`badge badge-${project.priority || 'medium'}`}>{PRIORITY_LABELS[project.priority || 'medium'] || '中'}</span>
                      </div>
                      <div className="repo-project-meta">
                        <span>任务 {projectTasks.length}</span>
                        <span>{project.ddl ? `DDL ${formatDate(project.ddl)}` : '未设置 DDL'}</span>
                      </div>
                      {project.description ? <p className="repo-project-desc">{project.description}</p> : null}
                    </div>

                    <div className="repo-project-actions">
                      <button className="btn btn-xs btn-secondary" type="button" onClick={() => { setTaskPrefillProjectId(project.id); setEditingTask(null) }}>
                        新建任务
                      </button>
                      <button className="btn btn-xs btn-secondary" type="button" onClick={() => setEditingProject(project)}>
                        编辑项目
                      </button>
                      <button className="btn btn-xs btn-danger" type="button" onClick={() => void handleDeleteProject(project)}>
                        删除
                      </button>
                    </div>
                  </div>

                  <div className="repo-link-section">
                    <div className="repo-link-head">
                      <span>项目链接</span>
                      <button className="btn btn-xs btn-ghost" type="button" onClick={() => openCreateLink('project', project.id)}>+ 添加</button>
                    </div>
                    {projectLinks.length === 0 ? (
                      <div className="text-muted text-sm">暂无项目链接</div>
                    ) : (
                      <div className="repo-link-list">
                        {projectLinks.map((link) => (
                          <div key={link.id} className="repo-link-item">
                            <a href={link.url} target="_blank" rel="noreferrer" className="repo-link-anchor">{link.title}</a>
                            {link.note ? <span className="repo-link-note">{link.note}</span> : null}
                            <div className="repo-link-actions">
                              <button className="repo-link-action" type="button" onClick={() => openEditLink(link)}>编辑</button>
                              <button className="repo-link-action danger" type="button" onClick={() => void deleteLink(link)}>删除</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {isExpanded ? (
                    <div className="repo-task-list">
                      {projectTasks.length === 0 ? (
                        <div className="text-muted text-sm">暂无从属任务</div>
                      ) : (
                        projectTasks.map((task) => {
                          const assigneeNames = getTaskAssigneeIds(task)
                            .map((personId) => peopleNameMap[personId])
                            .filter(Boolean)
                          const taskLinks = getLinksForTarget('task', task.id)

                          return (
                            <div key={task.id} className="repo-task-card">
                              <div className="repo-task-row">
                                <div className="repo-task-main">
                                  <div className="repo-task-title-row">
                                    <span className="repo-task-title">{task.title || '未命名任务'}</span>
                                    <span className={`badge badge-${task.status || 'todo'}`}>{STATUS_LABELS[task.status || 'todo'] || '待处理'}</span>
                                    <span className={`badge badge-${task.priority || 'medium'}`}>{PRIORITY_LABELS[task.priority || 'medium'] || '中'}</span>
                                  </div>
                                  <div className="repo-task-meta">
                                    <span>{assigneeNames.length ? assigneeNames.join('、') : '未分配'}</span>
                                    <span>{task.endDate ? `截止 ${formatDate(task.endDate)}` : '未设截止'}</span>
                                  </div>
                                </div>
                                <div className="repo-task-actions">
                                  <button className="btn btn-xs btn-secondary" type="button" onClick={() => setEditingTask(task)}>
                                    编辑
                                  </button>
                                  <button className="btn btn-xs btn-secondary" type="button" onClick={() => void toggleTaskStatus(task)}>
                                    {task.status === 'done' ? '重开' : '完成'}
                                  </button>
                                  <button className="btn btn-xs btn-danger" type="button" onClick={() => void handleDeleteTask(task)}>
                                    删除
                                  </button>
                                </div>
                              </div>

                              <div className="repo-link-section repo-link-section-task">
                                <div className="repo-link-head">
                                  <span>任务链接</span>
                                  <button className="btn btn-xs btn-ghost" type="button" onClick={() => openCreateLink('task', task.id)}>+ 添加</button>
                                </div>
                                {taskLinks.length === 0 ? (
                                  <div className="text-muted text-sm">暂无任务链接</div>
                                ) : (
                                  <div className="repo-link-list">
                                    {taskLinks.map((link) => (
                                      <div key={link.id} className="repo-link-item">
                                        <a href={link.url} target="_blank" rel="noreferrer" className="repo-link-anchor">{link.title}</a>
                                        {link.note ? <span className="repo-link-note">{link.note}</span> : null}
                                        <div className="repo-link-actions">
                                          <button className="repo-link-action" type="button" onClick={() => openEditLink(link)}>编辑</button>
                                          <button className="repo-link-action danger" type="button" onClick={() => void deleteLink(link)}>删除</button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>
                  ) : null}
                </section>
              )
            })}
          </div>
        )}
      </div>

      {editingProject !== undefined ? (
        <ProjectDialog project={editingProject} onClose={() => setEditingProject(undefined)} />
      ) : null}

      {editingTask !== undefined ? (
        <TaskDialog
          task={editingTask}
          projects={projects}
          people={people}
          initialProjectId={taskPrefillProjectId}
          onClose={() => {
            setEditingTask(undefined)
            setTaskPrefillProjectId(null)
          }}
        />
      ) : null}

      <Dialog
        open={Boolean(linkDialog)}
        title={linkDialog?.editingLinkId ? '编辑链接' : '添加链接'}
        onClose={closeLinkDialog}
        footer={(
          <>
            <button className="btn btn-secondary" type="button" onClick={closeLinkDialog}>取消</button>
            <button className="btn btn-primary" type="button" onClick={saveLink}>保存</button>
          </>
        )}
      >
        <div className="form-grid">
          <div className="form-field span2">
            <label className="form-label" htmlFor="repo-link-title">标题</label>
            <input id="repo-link-title" className="form-input" value={linkTitle} onChange={(event) => setLinkTitle(event.target.value)} />
          </div>
          <div className="form-field span2">
            <label className="form-label" htmlFor="repo-link-url">地址</label>
            <input id="repo-link-url" className="form-input" placeholder="https://" value={linkUrl} onChange={(event) => setLinkUrl(event.target.value)} />
          </div>
          <div className="form-field span2">
            <label className="form-label" htmlFor="repo-link-note">备注</label>
            <textarea id="repo-link-note" className="form-input" rows={3} value={linkNote} onChange={(event) => setLinkNote(event.target.value)} />
          </div>
        </div>
      </Dialog>
    </div>
  )
}
