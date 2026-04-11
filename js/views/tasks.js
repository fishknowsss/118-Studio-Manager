import { store } from '../store.js';
import { uid, now, today, daysUntil, formatDate, initials, STATUS_LABELS, PRIORITY_LABELS } from '../utils.js';
import { openModal, closeModal, buildForm, toast, confirm } from '../components.js';

export function renderTasks(container) {
  container.className = 'view-tasks fade-in';
  container.innerHTML = `
    <div class="view-header">
      <h1 class="view-title">任务</h1>
      <div class="view-actions">
        <div class="filter-bar">
          <input  class="filter-input"  id="tk-search"          placeholder="搜索任务…">
          <select class="filter-select" id="tk-filter-project">
            <option value="">全部项目</option>
            ${store.projects.map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join('')}
          </select>
          <select class="filter-select" id="tk-filter-status">
            <option value="">全部状态</option>
            <option value="todo">待处理</option>
            <option value="in-progress">进行中</option>
            <option value="done">完成</option>
            <option value="blocked">受阻</option>
          </select>
          <select class="filter-select" id="tk-filter-assignee">
            <option value="">全部人员</option>
            ${store.activePeople().map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join('')}
          </select>
        </div>
        <button class="btn btn-primary" id="btn-new-task">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          新建任务
        </button>
      </div>
    </div>
    <div class="view-body">
      <div class="tasks-list" id="tasks-list"></div>
    </div>`;

  renderList();

  container.querySelector('#btn-new-task').onclick    = () => openTaskModal(null);
  container.querySelector('#tk-search').oninput       = renderList;
  container.querySelector('#tk-filter-project').onchange  = renderList;
  container.querySelector('#tk-filter-status').onchange   = renderList;
  container.querySelector('#tk-filter-assignee').onchange = renderList;
}

function renderList() {
  const list = document.getElementById('tasks-list');
  if (!list) return;

  const search   = (document.getElementById('tk-search')?.value || '').toLowerCase();
  const projId   = document.getElementById('tk-filter-project')?.value   || '';
  const status   = document.getElementById('tk-filter-status')?.value    || '';
  const assignee = document.getElementById('tk-filter-assignee')?.value  || '';

  const todayStr = today();
  const PRIO = { urgent: 0, high: 1, medium: 2, low: 3 };

  let tasks = store.tasks.filter(t =>
    (!search   || t.title.toLowerCase().includes(search)) &&
    (!projId   || t.projectId === projId) &&
    (!status   || t.status === status) &&
    (!assignee || t.assigneeId === assignee)
  ).sort((a, b) => {
    // Sort: non-done first, then by priority, then by endDate
    if (a.status === 'done' && b.status !== 'done') return 1;
    if (b.status === 'done' && a.status !== 'done') return -1;
    const po = (PRIO[a.priority] ?? 3) - (PRIO[b.priority] ?? 3);
    if (po !== 0) return po;
    return (a.endDate || '9999').localeCompare(b.endDate || '9999');
  });

  if (!tasks.length) {
    list.innerHTML = '<div class="no-results">没有匹配的任务</div>';
    return;
  }

  list.innerHTML = '';
  for (const t of tasks) {
    const proj   = store.getProject(t.projectId);
    const person = t.assigneeId ? store.getPerson(t.assigneeId) : null;
    const isDone = t.status === 'done';
    const overdue = t.endDate && t.endDate < todayStr && !isDone;

    const item = document.createElement('div');
    item.className = 'task-item' + (isDone ? ' done-row' : '');
    item.innerHTML = `
      <button class="task-status-btn ${isDone ? 'done' : ''}" data-task-id="${t.id}" title="${isDone ? '标记未完成' : '标记完成'}"></button>
      <div class="task-info">
        <div class="task-title">${esc(t.title)}</div>
        <div class="task-sub">
          ${proj ? `<span>${esc(proj.name)}</span>` : ''}
          ${person ? `<span>${esc(person.name)}</span>` : '<span class="text-muted">未分配</span>'}
          ${t.estimatedHours ? `<span>${t.estimatedHours}h</span>` : ''}
        </div>
      </div>
      <div class="task-right">
        <span class="badge badge-${t.priority}">${PRIORITY_LABELS[t.priority] || ''}</span>
        ${t.endDate ? `<span class="date-chip ${overdue ? 'overdue' : ''}">${overdue ? '逾期 ' : ''}${formatDate(t.endDate)}</span>` : ''}
        <span class="badge badge-${t.status}">${STATUS_LABELS[t.status] || t.status}</span>
        <button class="card-btn" data-action="edit" title="编辑">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="card-btn danger" data-action="delete" title="删除">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
        </button>
      </div>`;

    item.querySelector('.task-status-btn').onclick = async (e) => {
      e.stopPropagation();
      const task = store.getTask(t.id);
      if (!task) return;
      task.status = task.status === 'done' ? 'todo' : 'done';
      task.updatedAt = now();
      await store.saveTask(task);
      await store.addLog(`${task.status === 'done' ? '完成' : '重开'}任务「${task.title}」`);
      renderList();
    };
    item.querySelector('[data-action="edit"]').onclick   = (e) => { e.stopPropagation(); openTaskModal(t); };
    item.querySelector('[data-action="delete"]').onclick = (e) => { e.stopPropagation(); deleteTask(t); };
    item.onclick = () => openTaskModal(t);

    list.appendChild(item);
  }
}

function buildAssigneeOptions(task) {
  const activePeople = store.activePeople()
  const currentAssignee = task?.assigneeId ? store.getPerson(task.assigneeId) : null
  const people = currentAssignee && !activePeople.some(person => person.id === currentAssignee.id)
    ? [...activePeople, currentAssignee]
    : activePeople

  return [
    ['', '（未分配）'],
    ...people.map(person => [
      person.id,
      person.id === currentAssignee?.id && person.status !== 'active'
        ? `${person.name}（已停用）`
        : person.name,
    ]),
  ]
}

function buildTaskSchema(task) {
  return {
    fields: [
      { name: 'title',          label: '任务标题',   type: 'text',   required: true, span2: false, placeholder: '任务名称…' },
      { name: 'projectId',      label: '所属项目',   type: 'select', options: [['', '（无）'], ...store.projects.map(p => [p.id, p.name])] },
      { name: 'status',         label: '状态',       type: 'select', options: [['todo','待处理'],['in-progress','进行中'],['done','完成'],['blocked','受阻']] },
      { name: 'priority',       label: '优先级',     type: 'select', options: [['urgent','紧急'],['high','高'],['medium','中'],['low','低']] },
      { name: 'assigneeId',     label: '负责人',     type: 'select', options: buildAssigneeOptions(task) },
      { name: 'scheduledDate',  label: '安排日期',   type: 'date' },
      { name: 'startDate',      label: '开始日期',   type: 'date' },
      { name: 'endDate',        label: '截止日期',   type: 'date' },
      { name: 'estimatedHours', label: '预计工时(h)', type: 'number', placeholder: '0' },
      { name: 'description',    label: '描述',       type: 'textarea', span2: true, placeholder: '任务说明…' },
    ]
  };
}

function openTaskModal(task) {
  const isNew = !task;
  const initial = task || { status: 'todo', priority: 'medium' };
  const schema = buildTaskSchema(task);
  const { formEl, getData, validate } = buildForm(schema, initial);

  const footer = document.createElement('div');
  footer.style.display = 'flex'; footer.style.gap = '8px';
  footer.innerHTML = `<button class="btn btn-secondary" id="tk-cancel">取消</button>
                      <button class="btn btn-primary"   id="tk-save">${isNew ? '创建任务' : '保存'}</button>`;

  openModal({ title: isNew ? '新建任务' : '编辑任务', body: formEl, footer });

  document.getElementById('tk-cancel').onclick = closeModal;
  document.getElementById('tk-save').onclick = async () => {
    if (!validate()) { toast('请填写任务标题', 'error'); return; }
    const data = getData();
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
    renderList();
  };
}

async function deleteTask(task) {
  const ok = await confirm('删除任务', `确认删除「${task.title}」？此操作不可撤销。`);
  if (!ok) return;
  await store.deleteTask(task.id);
  await store.addLog(`删除任务「${task.title}」`);
  toast('已删除', 'error');
  renderList();
}

function esc(s) { return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
