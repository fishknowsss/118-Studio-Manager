import { useState, useMemo, useSyncExternalStore } from 'react'
import { store, type LegacyTask } from '../legacy/store'
import { 
  today, formatDate, STATUS_LABELS, PRIORITY_LABELS, now, uid
} from '../legacy/utils'
import { openModal, closeModal, buildForm, toast, confirm } from '../../js/components.js'

export function Tasks() {
  useSyncExternalStore(store.subscribe, () => store.getSnapshot())
  const { tasks, projects, people } = store

  const [search, setSearch] = useState('')
  const [projFilter, setProjFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [assigneeFilter, setAssigneeFilter] = useState('')
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; taskId: string; type: 'status' | 'priority' | 'assignee' } | null>(null)

  const filteredTasks = useMemo(() => {
    const PRIO: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 }

    return tasks.filter(t =>
      (!search || t.title?.toLowerCase().includes(search.toLowerCase())) &&
      (!projFilter || t.projectId === projFilter) &&
      (!statusFilter || t.status === statusFilter) &&
      (!assigneeFilter || t.assigneeId === assigneeFilter)
    ).sort((a, b) => {
      if (a.status === 'done' && b.status !== 'done') return 1
      if (b.status === 'done' && a.status !== 'done') return -1
      const po = (PRIO[a.priority || 'medium']) - (PRIO[b.priority || 'medium'])
      if (po !== 0) return po
      return (a.endDate || '9999').localeCompare(b.endDate || '9999')
    })
  }, [tasks, search, projFilter, statusFilter, assigneeFilter])

  const handleToggleStatus = async (t: LegacyTask) => {
    const newStatus = t.status === 'done' ? 'todo' : 'done'
    await store.saveTask({ ...t, status: newStatus, updatedAt: now() })
    await store.addLog(`${newStatus === 'done' ? '完成' : '重开'}任务「${t.title}」`)
    toast(newStatus === 'done' ? '任务已完成' : '任务已重开', 'success')
  }

  const handleEditTask = (t: LegacyTask) => openTaskModal(t, projects, people)
  const handleNewTask = () => openTaskModal(null, projects, people)

  const handleDeleteTask = async (t: LegacyTask) => {
    const ok = await confirm('删除任务', `确认删除「${t.title}」？此操作不可撤销。`)
    if (!ok) return
    await store.deleteTask(t.id)
    await store.addLog(`删除任务「${t.title}」`)
    toast('已删除', 'error')
  }

  const handleContextMenu = (e: React.MouseEvent, taskId: string, type: 'status' | 'priority' | 'assignee') => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, taskId, type })
  }

  const quickUpdate = async (taskId: string, field: string, value: any) => {
    const t = store.getTask(taskId)
    if (t) {
      const updated = { ...t, [field]: value, updatedAt: now() }
      await store.saveTask(updated)
      toast('已更新', 'success')
    }
    setContextMenu(null)
  }

  return (
    <div className="view-tasks fade-in" onClick={() => setContextMenu(null)}>
      <div className="view-header">
        <h1 className="view-title">任务管理</h1>
        <div className="view-actions">
          <div className="filter-bar">
            <input 
              className="filter-input" 
              placeholder="搜索任务…" 
              value={search} 
              onChange={e => setSearch(e.target.value)}
            />
            <select className="filter-select" value={projFilter} onChange={e => setProjFilter(e.target.value)}>
              <option value="">全部项目</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select className="filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">全部状态</option>
              {Object.entries(STATUS_LABELS).filter(([k]) => ['todo','in-progress','done','blocked'].includes(k)).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <select className="filter-select" value={assigneeFilter} onChange={e => setAssigneeFilter(e.target.value)}>
              <option value="">全部人员</option>
              {people.filter(p => p.status === 'active').map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <button className="btn btn-primary" onClick={handleNewTask}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            新建任务
          </button>
        </div>
      </div>

      <div className="view-body">
        <div className="tasks-list">
          {filteredTasks.length === 0 ? (
            <div className="no-results">没有匹配的任务</div>
          ) : (
            filteredTasks.map(t => (
              <TaskItem 
                key={t.id} 
                task={t} 
                project={projects.find(p => p.id === t.projectId)}
                person={people.find(p => p.id === t.assigneeId)}
                onToggle={() => handleToggleStatus(t)}
                onEdit={() => handleEditTask(t)}
                onDelete={() => handleDeleteTask(t)}
                onContextStatus={(e: any) => handleContextMenu(e, t.id, 'status')}
                onContextPrio={(e: any) => handleContextMenu(e, t.id, 'priority')}
                onContextAssignee={(e: any) => handleContextMenu(e, t.id, 'assignee')}
              />
            ))
          )}
        </div>
      </div>

      {contextMenu && (
        <div 
          className="context-menu" 
          style={{ 
            position: 'fixed', top: contextMenu.y, left: contextMenu.x, 
            background: 'var(--c-surface)', border: '1px solid var(--c-border)',
            borderRadius: 'var(--r-md)', boxShadow: 'var(--shadow-lg)', zIndex: 1000,
            padding: '4px', minWidth: '140px'
          }}
        >
          <div className="menu-label" style={{ fontSize: '10px', color: 'var(--c-text-3)', padding: '4px 8px' }}>快速更新</div>
          {contextMenu.type === 'status' && ['todo', 'in-progress', 'done', 'blocked'].map(s => (
            <div key={s} className="menu-item" style={menuItemStyle} onClick={() => quickUpdate(contextMenu.taskId, 'status', s)} onMouseEnter={menuHover} onMouseLeave={menuLeave}>
              {STATUS_LABELS[s]}
            </div>
          ))}
          {contextMenu.type === 'priority' && ['urgent', 'high', 'medium', 'low'].map(p => (
            <div key={p} className="menu-item" style={menuItemStyle} onClick={() => quickUpdate(contextMenu.taskId, 'priority', p)} onMouseEnter={menuHover} onMouseLeave={menuLeave}>
              {PRIORITY_LABELS[p]}
            </div>
          ))}
          {contextMenu.type === 'assignee' && [
            {id: null, name: '（取消分配）'},
            ...people.filter(p => p.status === 'active')
          ].map(p => (
            <div key={p.id || 'none'} className="menu-item" style={menuItemStyle} onClick={() => quickUpdate(contextMenu.taskId, 'assigneeId', p.id)} onMouseEnter={menuHover} onMouseLeave={menuLeave}>
              {p.name}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function TaskItem({ task, project, person, onToggle, onEdit, onDelete, onContextStatus, onContextPrio, onContextAssignee }: any) {
  const isDone = task.status === 'done'
  const isOverdue = task.endDate && task.endDate < today() && !isDone

  return (
    <div className={`task-item ${isDone ? 'done-row' : ''}`} onClick={onEdit}>
      <button 
        className={`task-status-btn ${isDone ? 'done' : ''}`} 
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
        onContextMenu={onContextStatus}
      />
      <div className="task-info">
        <div className="task-title">{task.title}</div>
        <div className="task-sub">
          {project && <span>{project.name}</span>}
          <span onContextMenu={onContextAssignee} style={{ cursor: 'context-menu' }}>
            {person ? person.name : <span className="text-muted">未分配</span>}
          </span>
          {task.estimatedHours && <span>{task.estimatedHours}h</span>}
        </div>
      </div>
      <div className="task-right">
        <span 
          className={`badge badge-${task.priority}`} 
          onContextMenu={onContextPrio}
          style={{ cursor: 'context-menu' }}
        >
          {PRIORITY_LABELS[task.priority || 'medium']}
        </span>
        {task.endDate && (
          <span className={`date-chip ${isOverdue ? 'overdue' : ''}`}>
            {isOverdue ? '逾期 ' : ''}{formatDate(task.endDate)}
          </span>
        )}
        <span 
          className={`badge badge-${task.status}`} 
          onContextMenu={onContextStatus}
          style={{ cursor: 'context-menu' }}
        >
          {STATUS_LABELS[task.status]}
        </span>
        <button className="card-btn" onClick={(e) => { e.stopPropagation(); onEdit(); }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button className="card-btn danger" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
        </button>
      </div>
    </div>
  )
}

const menuItemStyle: React.CSSProperties = { padding: '6px 12px', cursor: 'pointer', fontSize: '13px', borderRadius: '4px' }
const menuHover = (e: any) => e.currentTarget.style.background = 'var(--c-bg)'
const menuLeave = (e: any) => e.currentTarget.style.background = 'transparent'

function openTaskModal(task: any, projects: any[], people: any[]) {
  const isNew = !task;
  const initial = task || { status: 'todo', priority: 'medium' };
  
  const activePeople = people.filter(p => p.status === 'active')
  const currentAssignee = task?.assigneeId ? people.find(p => p.id === task.assigneeId) : null
  const displayPeople = currentAssignee && currentAssignee.status !== 'active'
    ? [...activePeople, currentAssignee]
    : activePeople

  const schema = {
    fields: [
      { name: 'title',          label: '任务标题',   type: 'text',   required: true, span2: false, placeholder: '任务名称…' },
      { name: 'projectId',      label: '所属项目',   type: 'select', options: [['', '（无）'], ...projects.map(p => [p.id, p.name])] },
      { name: 'status',         label: '状态',       type: 'select', options: [['todo','待处理'],['in-progress','进行中'],['done','完成'],['blocked','受阻']] },
      { name: 'priority',       label: '优先级',     type: 'select', options: [['urgent','紧急'],['high','高'],['medium','中'],['low','低']] },
      { name: 'assigneeId',     label: '负责人',     type: 'select', options: [['', '（未分配）'], ...displayPeople.map(p => [p.id, p.id === currentAssignee?.id && p.status !== 'active' ? `${p.name}（已停用）` : p.name])] },
      { name: 'scheduledDate',  label: '安排日期',   type: 'date' },
      { name: 'startDate',      label: '开始日期',   type: 'date' },
      { name: 'endDate',        label: '截止日期',   type: 'date' },
      { name: 'estimatedHours', label: '预计工时(h)', type: 'number', placeholder: '0' },
      { name: 'description',    label: '描述',       type: 'textarea', span2: true, placeholder: '任务说明…' },
    ]
  };

  const { formEl, getData, validate } = buildForm(schema, initial);
  const footer = document.createElement('div');
  footer.style.display = 'flex'; footer.style.gap = '8px';
  footer.innerHTML = `<button class="btn btn-secondary" id="tk-cancel">取消</button>
                      <button class="btn btn-primary"   id="tk-save">${isNew ? '创建任务' : '保存'}</button>`;

  openModal({ title: isNew ? '新建任务' : '编辑任务', body: formEl, footer });

  const cancelBtn = document.getElementById('tk-cancel')
  const saveBtn = document.getElementById('tk-save')
  if (cancelBtn) cancelBtn.onclick = closeModal;
  if (saveBtn) saveBtn.onclick = async () => {
    if (!validate()) { toast('请填写任务标题', 'error'); return; }
    const data = getData() as any;
    const saved = {
      id:             task?.id || uid(),
      title:          data.title,
      projectId:      data.projectId || null,
      status:         data.status || 'todo',
      priority:       data.priority || 'medium',
      assigneeId:     data.assigneeId || null,
      scheduledDate:  data.scheduledDate || null,
      startDate:      data.startDate || null,
      endDate:        data.endDate || null,
      estimatedHours: data.estimatedHours,
      description:    data.description || '',
      createdAt:      task?.createdAt || now(),
      updatedAt:      now(),
    };
    await store.saveTask(saved);
    await store.addLog(`${isNew ? '创建' : '编辑'}任务「${saved.title}」`);
    closeModal();
    toast(isNew ? '任务已创建' : '已保存', 'success');
  };
}
