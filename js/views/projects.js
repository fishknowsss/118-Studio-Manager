import { store } from '../store.js';
import { uid, now, urgencyClass, ddlLabel, formatDate, sortByUrgency, STATUS_LABELS, PRIORITY_LABELS } from '../utils.js';
import { openModal, closeModal, buildForm, toast, confirm } from '../components.js';

export function renderProjects(container) {
  container.className = 'view-projects fade-in';
  container.innerHTML = `
    <div class="view-header">
      <h1 class="view-title">项目</h1>
      <div class="view-actions">
        <div class="filter-bar">
          <select class="filter-select" id="pj-filter-status">
            <option value="">全部状态</option>
            <option value="active">进行中</option>
            <option value="paused">暂停</option>
            <option value="completed">已完成</option>
            <option value="cancelled">已取消</option>
          </select>
          <select class="filter-select" id="pj-filter-priority">
            <option value="">全部优先级</option>
            <option value="urgent">紧急</option>
            <option value="high">高</option>
            <option value="medium">中</option>
            <option value="low">低</option>
          </select>
        </div>
        <button class="btn btn-primary" id="btn-new-project">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          新建项目
        </button>
      </div>
    </div>
    <div class="view-body">
      <div class="project-grid" id="project-grid"></div>
    </div>`;

  renderGrid();

  container.querySelector('#btn-new-project').onclick = () => openProjectModal(null);
  container.querySelector('#pj-filter-status').onchange   = renderGrid;
  container.querySelector('#pj-filter-priority').onchange = renderGrid;
}

function renderGrid() {
  const grid = document.getElementById('project-grid');
  if (!grid) return;

  const status   = document.getElementById('pj-filter-status')?.value   || '';
  const priority = document.getElementById('pj-filter-priority')?.value || '';

  let projs = store.projects.filter(p =>
    (!status   || p.status   === status) &&
    (!priority || p.priority === priority)
  );
  projs = sortByUrgency(projs);

  if (!projs.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
      <div class="empty-icon">📁</div>
      <div class="empty-text">暂无项目</div>
      <div class="empty-sub">点击「新建项目」开始</div>
    </div>`;
    return;
  }

  grid.innerHTML = '';
  for (const proj of projs) {
    const uc  = urgencyClass(proj.ddl, proj.status);
    const dl  = ddlLabel(proj.ddl, proj.status);
    const tasks = store.tasksForProject(proj.id);
    const done  = tasks.filter(t => t.status === 'done').length;
    const mss   = (proj.milestones || []).filter(m => m.title);

    const card = document.createElement('div');
    card.className = `project-card ${uc}`;
    card.innerHTML = `
      <div class="project-card-top">
        <div class="project-name">${esc(proj.name)}</div>
        <div style="display:flex;gap:6px;align-items:center">
          <span class="badge badge-${proj.status}">${STATUS_LABELS[proj.status] || proj.status}</span>
          <div class="card-actions">
            <button class="card-btn" data-action="edit" title="编辑">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="card-btn danger" data-action="delete" title="删除">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
            </button>
          </div>
        </div>
      </div>
      ${proj.description ? `<div class="project-desc">${esc(proj.description)}</div>` : ''}
      <div class="project-meta">
        ${proj.ddl ? `<span class="project-ddl-label ${uc.replace('urg-','ddl-')}" style="color:${ddlColor(uc)}">${dl}</span>` : ''}
        <span class="badge badge-${proj.priority}">${PRIORITY_LABELS[proj.priority] || ''}</span>
        <span class="project-task-count">${done}/${tasks.length} 完成</span>
      </div>
      ${mss.length ? `<div class="milestones-mini">${mss.slice(0,3).map(m => `
        <div class="milestone-mini-item ${m.completed ? 'done' : ''}">
          <div class="milestone-dot ${m.completed ? 'done' : ''}"></div>
          ${esc(m.title)} ${m.date ? `· ${formatDate(m.date)}` : ''}
        </div>`).join('')}</div>` : ''}`;

    card.querySelector('[data-action="edit"]').onclick   = (e) => { e.stopPropagation(); openProjectModal(proj); };
    card.querySelector('[data-action="delete"]').onclick = (e) => { e.stopPropagation(); deleteProject(proj); };
    grid.appendChild(card);
  }
}

function ddlColor(uc) {
  const map = { 'urg-overdue': 'var(--c-overdue)', 'urg-today': 'var(--c-today)', 'urg-soon': 'var(--c-soon)', 'urg-near': 'var(--c-near)' };
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

function openProjectModal(proj) {
  const isNew = !proj;
  const initial = proj || { status: 'active', priority: 'medium', milestones: [] };
  const { formEl, getData, validate } = buildForm(PROJECT_SCHEMA, initial);

  const footer = document.createElement('div');
  footer.style.display = 'flex'; footer.style.gap = '8px';
  footer.innerHTML = `<button class="btn btn-secondary" id="pj-cancel">取消</button>
                      <button class="btn btn-primary"   id="pj-save">${isNew ? '创建项目' : '保存更改'}</button>`;

  openModal({ title: isNew ? '新建项目' : '编辑项目', body: formEl, footer });

  document.getElementById('pj-cancel').onclick = closeModal;
  document.getElementById('pj-save').onclick   = async () => {
    if (!validate()) { toast('请填写项目名称', 'error'); return; }
    const data = getData();
    const saved = {
      id:         proj?.id || uid(),
      name:       data.name,
      status:     data.status || 'active',
      priority:   data.priority || 'medium',
      ddl:        data.ddl || null,
      description: data.description || '',
      milestones: data.milestones || [],
      createdAt:  proj?.createdAt || now(),
      updatedAt:  now(),
    };
    await store.saveProject(saved);
    await store.addLog(`${isNew ? '创建' : '编辑'}项目「${saved.name}」`);
    closeModal();
    toast(isNew ? '项目已创建' : '已保存', 'success');
    renderGrid();
  };
}

async function deleteProject(proj) {
  const ok = await confirm('删除项目', `确认删除「${proj.name}」？相关任务也会被删除，此操作不可撤销。`);
  if (!ok) return;
  await store.deleteProject(proj.id);
  await store.addLog(`删除项目「${proj.name}」`);
  toast('已删除', 'error');
  renderGrid();
}

function esc(s) { return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
