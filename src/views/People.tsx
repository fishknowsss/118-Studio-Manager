import { useState, useMemo, useSyncExternalStore } from 'react'
import { store, type LegacyPerson } from '../legacy/store'
import {
  initials, now, uid
} from '../legacy/utils'
import { openModal, closeModal, buildForm, toast, confirm } from '../../js/components.js'

type PersonFormData = {
  name: string | null
  gender: string | null
  status: string | null
  skills: string[]
  notes: string | null
}

export function People() {
  useSyncExternalStore(store.subscribe, () => store.getSnapshot())
  const { people, tasks } = store

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const filteredPeople = useMemo(() => {
    return people.filter(p =>
      (!search || (p.name || '').toLowerCase().includes(search.toLowerCase())) &&
      (!statusFilter || p.status === statusFilter)
    ).sort((a, b) => {
      if (a.status !== b.status) return a.status === 'active' ? -1 : 1
      return (a.name || '').localeCompare(b.name || '')
    })
  }, [people, search, statusFilter])

  const handleNewPerson = () => openPersonModal(null)
  const handleEditPerson = (p: LegacyPerson) => openPersonModal(p)

  const handleToggleStatus = async (p: LegacyPerson) => {
    const updated = { ...p, status: p.status === 'active' ? 'inactive' : 'active', updatedAt: now() }
    await store.savePerson(updated)
    await store.addLog(`${updated.status === 'active' ? '启用' : '停用'}人员「${p.name}」`)
    toast(updated.status === 'active' ? '已启用' : '已停用', 'success')
  }

  const handleDeletePerson = async (p: LegacyPerson) => {
    const ok = await confirm('删除人员', `确认删除「${p.name}」？其名下任务将变为未分配。此操作不可撤销。`)
    if (!ok) return
    await store.deletePerson(p.id)
    await store.addLog(`删除人员「${p.name}」`)
    toast('已删除', 'error')
  }

  return (
    <div className="view-people fade-in">
      <div className="view-header">
        <h1 className="view-title">团队管理</h1>
        <div className="view-actions">
          <div className="filter-bar">
            <input 
              className="filter-input" 
              placeholder="搜索姓名…" 
              value={search} 
              onChange={e => setSearch(e.target.value)}
            />
            <select className="filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">全部状态</option>
              <option value="active">在职</option>
              <option value="inactive">停用</option>
            </select>
          </div>
          <button className="btn btn-primary" onClick={handleNewPerson}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            新增人员
          </button>
        </div>
      </div>

      <div className="view-body">
        <div className="people-grid">
          {filteredPeople.length === 0 ? (
            <div className="empty-state" style={{ gridColumn: '1/-1' }}>
              <div className="empty-icon">👥</div>
              <div className="empty-text">暂无人员</div>
            </div>
          ) : (
            filteredPeople.map((p) => (
              <PersonCard 
                key={p.id} 
                person={p} 
                taskCount={tasks.filter(t => t.assigneeId === p.id && t.status !== 'done').length}
                onEdit={() => handleEditPerson(p)}
                onToggle={() => handleToggleStatus(p)}
                onDelete={() => handleDeletePerson(p)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function PersonCard({ person, taskCount, onEdit, onToggle, onDelete }: { person: LegacyPerson; taskCount: number; onEdit: () => void; onToggle: () => void; onDelete: () => void }) {
  const isInactive = person.status === 'inactive'

  return (
    <div className={`person-card ${isInactive ? 'inactive' : ''}`} onClick={onEdit}>
      <div className="person-card-top">
        <div className={`person-card-avatar ${isInactive ? 'inactive' : ''}`}>{initials(person.name || '')}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="person-card-name">{person.name}</div>
          <div className="person-card-status">
            {isInactive ? <span className="badge badge-cancelled">已停用</span> : <span className="badge badge-active">在职</span>}
            {person.gender && ` · ${person.gender === 'male' ? '男' : person.gender === 'female' ? '女' : '其他'}`}
          </div>
        </div>
        <div className="person-card-actions">
          <button className="card-btn" onClick={(e) => { e.stopPropagation(); onEdit(); }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button className="card-btn" onClick={(e) => { e.stopPropagation(); onToggle(); }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
              {isInactive
                ? <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                : (
                  <>
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </>
                )}
            </svg>
          </button>
          <button className="card-btn danger" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
          </button>
        </div>
      </div>
      {(person.skills || []).length > 0 && (
        <div className="person-card-skills">
          {(person.skills || []).map((s: string, i: number) => <span key={i} className="skill-tag">{s}</span>)}
        </div>
      )}
      <div className="person-card-meta">
        <span>{taskCount} 个进行中任务</span>
        {person.notes && <span title={person.notes}>备注: {person.notes.slice(0, 15)}…</span>}
      </div>
    </div>
  )
}

function openPersonModal(person: LegacyPerson | null) {
  const isNew = !person;
  const initial = person || { status: 'active', gender: '', skills: [] };
  const schema = {
    fields: [
      { name: 'name',   label: '姓名',   type: 'text',   required: true, placeholder: '姓名…' },
      { name: 'gender', label: '性别',   type: 'select', options: [['','不填'],['male','男'],['female','女'],['other','其他']] },
      { name: 'status', label: '状态',   type: 'select', options: [['active','在职'],['inactive','停用']] },
      { name: 'skills', label: '技能标签', type: 'skills', span2: true },
      { name: 'notes',  label: '备注',   type: 'textarea', span2: true, placeholder: '备注信息…' },
    ]
  };

  const { formEl, getData, validate } = buildForm(schema, initial);
  const footer = document.createElement('div');
  footer.style.display = 'flex'; footer.style.gap = '8px';
  footer.innerHTML = `<button class="btn btn-secondary" id="pm-cancel">取消</button>
                      <button class="btn btn-primary"   id="pm-save">${isNew ? '添加人员' : '保存'}</button>`;

  openModal({ title: isNew ? '新增人员' : '编辑人员', body: formEl, footer });

  const cancelBtn = document.getElementById('pm-cancel')
  const saveBtn = document.getElementById('pm-save')
  if (cancelBtn) cancelBtn.onclick = closeModal;
  if (saveBtn) saveBtn.onclick = async () => {
    if (!validate()) { toast('请填写姓名', 'error'); return; }
    const data = getData() as unknown as PersonFormData;
    const saved: LegacyPerson = {
      id:        person?.id || uid(),
      name:      data.name || '',
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
  };
}
