import React, { useState, useMemo, useSyncExternalStore } from 'react'
import { store, type LegacyProject } from '../legacy/store'
import { 
  urgencyClass, ddlLabel, formatDate, sortByUrgency, 
  STATUS_LABELS, PRIORITY_LABELS, today
} from '../legacy/utils'
import { openModal, closeModal, buildForm, toast, confirm } from '../../js/components.js'

export function Projects() {
  useSyncExternalStore(store.subscribe, () => store.getSnapshot())
  const { projects, tasks } = store

  const [statusFilter, setStatusFilter] = useState('')
  const [prioFilter, setPrioFilter] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'timeline'>('grid')
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; projectId: string } | null>(null)

  const filteredProjects = useMemo(() => {
    let projs = projects.filter((p: any) =>
      (!statusFilter || p.status === statusFilter) &&
      (!prioFilter || p.priority === prioFilter)
    )
    return sortByUrgency(projs) as LegacyProject[]
  }, [projects, statusFilter, prioFilter])

  const handleNewProject = () => openProjectModal(null)
  const handleEditProject = (p: LegacyProject) => openProjectModal(p)
  
  const handleDeleteProject = async (p: LegacyProject) => {
    const ok = await confirm('删除项目', `确认删除「${p.name}」？相关任务也会被删除，此操作不可撤销。`)
    if (!ok) return
    await store.deleteProject(p.id)
    await store.addLog(`删除项目「${p.name}」`)
    toast('已删除', 'error')
  }

  const handleContextMenu = (e: React.MouseEvent, projectId: string) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, projectId })
  }

  const quickUpdateStatus = async (projectId: string, status: string) => {
    const p = store.getProject(projectId)
    if (p) {
      await store.saveProject({ ...p, status, updatedAt: new Date().toISOString() })
      toast(`项目状态已更新为 ${STATUS_LABELS[status]}`, 'success')
    }
    setContextMenu(null)
  }

  return (
    <div className="view-projects fade-in" onClick={() => setContextMenu(null)}>
      <div className="view-header">
        <h1 className="view-title">项目管理</h1>
        <div className="view-actions">
          <div className="filter-bar">
            <div className="btn-group" style={{ display: 'flex', background: 'var(--c-bg)', borderRadius: 'var(--r-md)', padding: '2px', marginRight: '8px' }}>
              <button 
                className={`btn btn-xs ${viewMode === 'grid' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setViewMode('grid')}
                style={{ padding: '4px 8px' }}
              >卡片</button>
              <button 
                className={`btn btn-xs ${viewMode === 'timeline' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setViewMode('timeline')}
                style={{ padding: '4px 8px' }}
              >时间轴</button>
            </div>
            <select className="filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">全部状态</option>
              <option value="active">进行中</option>
              <option value="paused">暂停</option>
              <option value="completed">已完成</option>
              <option value="cancelled">已取消</option>
            </select>
            <select className="filter-select" value={prioFilter} onChange={e => setPrioFilter(e.target.value)}>
              <option value="">全部优先级</option>
              <option value="urgent">紧急</option>
              <option value="high">高</option>
              <option value="medium">中</option>
              <option value="low">低</option>
            </select>
          </div>
          <button className="btn btn-primary" onClick={handleNewProject}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            新建项目
          </button>
        </div>
      </div>

      <div className="view-body">
        {viewMode === 'grid' ? (
          <div className="project-grid">
            {filteredProjects.length === 0 ? (
              <div className="empty-state" style={{ gridColumn: '1/-1' }}>
                <div className="empty-icon">📁</div>
                <div className="empty-text">暂无项目</div>
              </div>
            ) : (
              filteredProjects.map((p: any) => (
                <ProjectCard 
                  key={p.id} 
                  project={p} 
                  tasks={tasks.filter(t => t.projectId === p.id)}
                  onEdit={() => handleEditProject(p)}
                  onDelete={() => handleDeleteProject(p)}
                  onContextMenu={(e: any) => handleContextMenu(e, p.id)}
                />
              ))
            )}
          </div>
        ) : (
          <ProjectTimeline projects={filteredProjects} />
        )}
      </div>

      {contextMenu && (
        <div 
          className="context-menu" 
          style={{ 
            position: 'fixed', top: contextMenu.y, left: contextMenu.x, 
            background: 'var(--c-surface)', border: '1px solid var(--c-border)',
            borderRadius: 'var(--r-md)', boxShadow: 'var(--shadow-lg)', zIndex: 1000,
            padding: '4px', minWidth: '120px'
          }}
        >
          <div className="menu-label" style={{ fontSize: '10px', color: 'var(--c-text-3)', padding: '4px 8px' }}>快速更新状态</div>
          {['active', 'paused', 'completed', 'cancelled'].map(s => (
            <div 
              key={s} 
              className="menu-item" 
              style={{ padding: '6px 12px', cursor: 'pointer', fontSize: '13px', borderRadius: '4px' }}
              onClick={() => quickUpdateStatus(contextMenu.projectId, s)}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--c-bg)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              {STATUS_LABELS[s]}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ProjectCard({ project, tasks, onEdit, onDelete, onContextMenu }: any) {
  const uc = urgencyClass(project.ddl, project.status)
  const doneCount = tasks.filter((t: any) => t.status === 'done').length
  const milestones = (project.milestones || []).filter((m: any) => m.title).slice(0, 3)

  return (
    <div className={`project-card ${uc}`} onClick={onEdit} onContextMenu={onContextMenu}>
      <div className="project-card-top">
        <div className="project-name">{project.name}</div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <span className={`badge badge-${project.status}`}>{STATUS_LABELS[project.status]}</span>
          <div className="card-actions">
            <button className="card-btn" onClick={(e) => { e.stopPropagation(); onEdit(); }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button className="card-btn danger" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
            </button>
          </div>
        </div>
      </div>
      {project.description && <div className="project-desc">{project.description}</div>}
      <div className="project-meta">
        {project.ddl && (
          <span className="project-ddl-label" style={{ color: ddlColor(uc) }}>{ddlLabel(project.ddl, project.status)}</span>
        )}
        <span className={`badge badge-${project.priority}`}>{PRIORITY_LABELS[project.priority]}</span>
        <span className="project-task-count">{doneCount}/{tasks.length} 完成</span>
      </div>
      {milestones.length > 0 && (
        <div className="milestones-mini">
          {milestones.map((m: any, i: number) => (
            <div key={i} className={`milestone-mini-item ${m.completed ? 'done' : ''}`}>
              <div className={`milestone-dot ${m.completed ? 'done' : ''}`}></div>
              {m.title} {m.date ? `· ${formatDate(m.date)}` : ''}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ProjectTimeline({ projects }: { projects: LegacyProject[] }) {
  const start = useMemo(() => {
    const dates = projects.map(p => p.createdAt || today()).sort()
    const first = new Date(dates[0] || today())
    first.setDate(1) // Start of month
    return first
  }, [projects])

  const days = 90 // Show 3 months
  const timelineDays = Array.from({ length: days }, (_, i) => {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    return d
  })

  return (
    <div className="timeline-container" style={{ overflowX: 'auto', background: 'var(--c-surface)', borderRadius: 'var(--r-lg)', border: '1px solid var(--c-border)' }}>
      <div className="timeline-header" style={{ display: 'flex', borderBottom: '1px solid var(--c-border-light)' }}>
        <div style={{ width: '200px', flexShrink: 0, padding: '12px', borderRight: '1px solid var(--c-border-light)', fontWeight: 'bold' }}>项目名称</div>
        <div style={{ display: 'flex', flex: 1 }}>
          {timelineDays.map((d, i) => (
            <div key={i} style={{ width: '30px', flexShrink: 0, textAlign: 'center', fontSize: '10px', padding: '12px 0', borderRight: d.getDate() === 1 ? '1px solid var(--c-border)' : 'none', color: d.getDay() === 0 || d.getDay() === 6 ? 'var(--c-text-3)' : 'inherit' }}>
              {d.getDate() === 1 ? `${d.getMonth() + 1}月` : d.getDate()}
            </div>
          ))}
        </div>
      </div>
      <div className="timeline-body">
        {projects.map((p: any) => {
          const pStart = new Date(p.createdAt || today())
          const pEnd = p.ddl ? new Date(p.ddl) : new Date(pStart.getTime() + 7 * 86400000)
          const offsetDays = Math.max(0, Math.round((pStart.getTime() - start.getTime()) / 86400000))
          const durationDays = Math.max(1, Math.round((pEnd.getTime() - pStart.getTime()) / 86400000))
          
          return (
            <div key={p.id} style={{ display: 'flex', borderBottom: '1px solid var(--c-border-light)' }}>
              <div style={{ width: '200px', flexShrink: 0, padding: '12px', borderRight: '1px solid var(--c-border-light)', fontSize: '13px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {p.name}
              </div>
              <div style={{ display: 'flex', flex: 1, position: 'relative', height: '40px', alignItems: 'center' }}>
                <div 
                  style={{ 
                    position: 'absolute', 
                    left: (offsetDays * 30) + 'px', 
                    width: (durationDays * 30) + 'px', 
                    height: '24px', 
                    background: 'var(--c-primary-light)', 
                    border: '1px solid var(--c-primary)',
                    borderRadius: '12px', 
                    color: 'var(--c-primary)', 
                    fontSize: '10px', 
                    display: 'flex',
                    alignItems: 'center', 
                    padding: '0 8px', 
                    whiteSpace: 'nowrap', 
                    overflow: 'hidden'
                  }}
                >
                  {p.name} (DDL: {formatDate(p.ddl)})
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ddlColor(uc: string) {
  const map: any = { 'urg-overdue': 'var(--c-overdue)', 'urg-today': 'var(--c-today)', 'urg-soon': 'var(--c-soon)', 'urg-near': 'var(--c-near)' };
  return map[uc] || 'var(--c-text-2)';
}

const PROJECT_SCHEMA = {
  fields: [
    { name: 'name',        label: '项目名称', type: 'text',     required: true, span2: false, placeholder: '项目名称…' },
    { name: 'status',      label: '状态',     type: 'select',   options: [['active','进行中'],['paused','暂停'],['completed','已完成'],['cancelled','已取消']] },
    { name: 'priority',    label: '优先级',   type: 'select',   options: [['urgent','紧急'],['high','高'],['medium','中'],['low','低']] },
    { name: 'ddl',         label: '截止日期', type: 'date' },
    { name: 'description', label: '描述',     type: 'textarea', span2: true, placeholder: '项目说明、背景、目标…' },
    { name: 'milestones',  label: '里程碑',   type: 'milestones', span2: true },
  ]
};

function openProjectModal(proj: any) {
  const isNew = !proj;
  const initial = proj || { status: 'active', priority: 'medium', milestones: [] };
  const { formEl, getData, validate } = buildForm(PROJECT_SCHEMA, initial);

  const footer = document.createElement('div');
  footer.style.display = 'flex'; footer.style.gap = '8px';
  footer.innerHTML = `<button class="btn btn-secondary" id="pj-cancel">取消</button>
                      <button class="btn btn-primary"   id="pj-save">${isNew ? '创建项目' : '保存更改'}</button>`;

  openModal({ title: isNew ? '新建项目' : '编辑项目', body: formEl, footer });

  const cancelBtn = document.getElementById('pj-cancel')
  const saveBtn = document.getElementById('pj-save')
  if (cancelBtn) cancelBtn.onclick = closeModal;
  if (saveBtn) saveBtn.onclick = async () => {
    if (!validate()) { toast('请填写项目名称', 'error'); return; }
    const data = getData() as any;
    const saved = {
      id:         proj?.id || crypto.randomUUID(),
      name:       data.name,
      status:     data.status || 'active',
      priority:   data.priority || 'medium',
      ddl:        data.ddl || null,
      description: data.description || '',
      milestones: data.milestones || [],
      createdAt:  proj?.createdAt || new Date().toISOString().slice(0, 10),
      updatedAt:  new Date().toISOString(),
    };
    await store.saveProject(saved);
    await store.addLog(`${isNew ? '创建' : '编辑'}项目「${saved.name}」`);
    closeModal();
    toast(isNew ? '项目已创建' : '已保存', 'success');
  };
}
