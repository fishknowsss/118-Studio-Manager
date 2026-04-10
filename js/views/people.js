import { store } from '../store.js';
import { uid, now, initials } from '../utils.js';
import { openModal, closeModal, buildForm, toast, confirm } from '../components.js';

export function renderPeople(container) {
  container.className = 'view-people fade-in';
  container.innerHTML = `
    <div class="view-header">
      <h1 class="view-title">人员</h1>
      <div class="view-actions">
        <div class="filter-bar">
          <input class="filter-input" id="pm-search" placeholder="搜索姓名…">
          <select class="filter-select" id="pm-filter-status">
            <option value="">全部</option>
            <option value="active">在职</option>
            <option value="inactive">停用</option>
          </select>
        </div>
        <button class="btn btn-primary" id="btn-new-person">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          新增人员
        </button>
      </div>
    </div>
    <div class="view-body">
      <div class="people-grid" id="people-grid"></div>
    </div>`;

  renderGrid();

  container.querySelector('#btn-new-person').onclick = () => openPersonModal(null);
  container.querySelector('#pm-search').oninput      = renderGrid;
  container.querySelector('#pm-filter-status').onchange = renderGrid;
}

function renderGrid() {
  const grid = document.getElementById('people-grid');
  if (!grid) return;

  const search = (document.getElementById('pm-search')?.value || '').toLowerCase();
  const status = document.getElementById('pm-filter-status')?.value || '';

  let people = store.people.filter(p =>
    (!search || p.name.toLowerCase().includes(search)) &&
    (!status || p.status === status)
  ).sort((a, b) => {
    if (a.status !== b.status) return a.status === 'active' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  if (!people.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
      <div class="empty-icon">👥</div>
      <div class="empty-text">暂无人员</div>
      <div class="empty-sub">点击「新增人员」添加团队成员</div>
    </div>`;
    return;
  }

  grid.innerHTML = '';
  for (const p of people) {
    const taskCount = store.tasksForPerson(p.id).length;
    const isInactive = p.status === 'inactive';

    const card = document.createElement('div');
    card.className = `person-card ${isInactive ? 'inactive' : ''}`;
    card.innerHTML = `
      <div class="person-card-top">
        <div class="person-card-avatar ${isInactive ? 'inactive' : ''}">${initials(p.name)}</div>
        <div style="flex:1;min-width:0">
          <div class="person-card-name">${esc(p.name)}</div>
          <div class="person-card-status">
            ${isInactive ? '<span class="badge badge-cancelled">已停用</span>' : '<span class="badge badge-active">在职</span>'}
            · ${p.gender === 'male' ? '男' : p.gender === 'female' ? '女' : ''}
          </div>
        </div>
        <div class="person-card-actions">
          <button class="card-btn" data-action="edit" title="编辑">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="card-btn" data-action="toggle" title="${isInactive ? '启用' : '停用'}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
              ${isInactive
                ? '<path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>'
                : '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>'}
            </svg>
          </button>
          <button class="card-btn danger" data-action="delete" title="删除">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
          </button>
        </div>
      </div>
      ${(p.skills||[]).length ? `<div class="person-card-skills">${(p.skills||[]).map(s => `<span class="skill-tag">${esc(s)}</span>`).join('')}</div>` : ''}
      <div class="person-card-meta">
        <span>${taskCount} 个进行中任务</span>
        ${p.notes ? `<span title="${esc(p.notes)}">备注: ${esc(p.notes.slice(0,20))}…</span>` : ''}
      </div>`;

    card.querySelector('[data-action="edit"]').onclick   = () => openPersonModal(p);
    card.querySelector('[data-action="toggle"]').onclick = () => togglePerson(p);
    card.querySelector('[data-action="delete"]').onclick = () => deletePerson(p);
    grid.appendChild(card);
  }
}

const PERSON_SCHEMA = {
  fields: [
    { name: 'name',   label: '姓名',   type: 'text',   required: true, placeholder: '姓名…' },
    { name: 'gender', label: '性别',   type: 'select', options: [['','不填'],['male','男'],['female','女'],['other','其他']] },
    { name: 'status', label: '状态',   type: 'select', options: [['active','在职'],['inactive','停用']] },
    { name: 'skills', label: '技能标签', type: 'skills', span2: true },
    { name: 'notes',  label: '备注',   type: 'textarea', span2: true, placeholder: '备注信息…' },
  ]
};

function openPersonModal(person) {
  const isNew = !person;
  const initial = person || { status: 'active', gender: '', skills: [] };
  const { formEl, getData, validate } = buildForm(PERSON_SCHEMA, initial);

  const footer = document.createElement('div');
  footer.style.display = 'flex'; footer.style.gap = '8px';
  footer.innerHTML = `<button class="btn btn-secondary" id="pm-cancel">取消</button>
                      <button class="btn btn-primary"   id="pm-save">${isNew ? '添加人员' : '保存'}</button>`;

  openModal({ title: isNew ? '新增人员' : '编辑人员', body: formEl, footer });

  document.getElementById('pm-cancel').onclick = closeModal;
  document.getElementById('pm-save').onclick = async () => {
    if (!validate()) { toast('请填写姓名', 'error'); return; }
    const data = getData();
    const saved = {
      id:        person?.id || uid(),
      name:      data.name,
      gender:    data.gender || '',
      status:    data.status || 'active',
      skills:    data.skills || [],
      notes:     data.notes || '',
      createdAt: person?.createdAt || now(),
      updatedAt: now(),
    };
    await store.savePerson(saved);
    await store.addLog(`${isNew ? '新增' : '编辑'}人员「${saved.name}」`);
    closeModal();
    toast(isNew ? '人员已添加' : '已保存', 'success');
    renderGrid();
  };
}

async function togglePerson(p) {
  const updated = { ...p, status: p.status === 'active' ? 'inactive' : 'active', updatedAt: now() };
  await store.savePerson(updated);
  await store.addLog(`${updated.status === 'active' ? '启用' : '停用'}人员「${p.name}」`);
  toast(updated.status === 'active' ? '已启用' : '已停用');
  renderGrid();
}

async function deletePerson(p) {
  const ok = await confirm('删除人员', `确认删除「${p.name}」？其名下任务将变为未分配。此操作不可撤销。`);
  if (!ok) return;
  await store.deletePerson(p.id);
  await store.addLog(`删除人员「${p.name}」`);
  toast('已删除', 'error');
  renderGrid();
}

function esc(s) { return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
