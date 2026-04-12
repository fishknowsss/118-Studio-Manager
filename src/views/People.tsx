import { useMemo, useState } from 'react'
import { useConfirm } from '../components/feedback/ConfirmProvider'
import { useToast } from '../components/feedback/ToastProvider'
import { PersonCard } from '../features/people/PersonCard'
import { PersonDialog } from '../features/people/PersonDialog'
import { deletePersonWithLog, togglePersonStatus } from '../legacy/actions'
import { buildPersonCardModels, getFilteredPeople } from '../legacy/selectors'
import { type LegacyPerson } from '../legacy/store'
import { useLegacyStoreSnapshot } from '../legacy/useLegacyStore'

export function People() {
  const store = useLegacyStoreSnapshot()
  const { people, tasks } = store

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [editingPerson, setEditingPerson] = useState<LegacyPerson | null | undefined>(undefined)
  const { confirm } = useConfirm()
  const { toast } = useToast()
  const filteredPeople = useMemo(() => getFilteredPeople(people, search, statusFilter), [people, search, statusFilter])
  const personCards = useMemo(() => buildPersonCardModels(filteredPeople, tasks), [filteredPeople, tasks])

  const handleToggleStatus = async (person: LegacyPerson) => {
    const updated = await togglePersonStatus(person)
    toast(updated.status === 'active' ? '已启用' : '已停用', 'success')
  }

  const handleDeletePerson = async (person: LegacyPerson) => {
    const ok = await confirm('删除人员', `确认删除「${person.name}」？其名下任务将变为未分配。此操作不可撤销。`)
    if (!ok) return
    await deletePersonWithLog(person)
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
              onChange={(event) => setSearch(event.target.value)}
            />
            <select className="filter-select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="">全部状态</option>
              <option value="active">在职</option>
              <option value="inactive">停用</option>
            </select>
          </div>
          <button className="btn btn-primary" type="button" onClick={() => setEditingPerson(null)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            新增人员
          </button>
        </div>
      </div>

      <div className="view-body">
        <div className="people-grid">
          {filteredPeople.length === 0 ? (
            <div className="empty-state empty-state-full">
              <div className="empty-icon">👥</div>
              <div className="empty-text">先新增一位成员</div>
            </div>
          ) : (
            personCards.map((person) => (
              <PersonCard
                key={person.id}
                model={person}
                onDelete={() => {
                  const target = filteredPeople.find((item) => item.id === person.id)
                  if (target) void handleDeletePerson(target)
                }}
                onEdit={() => setEditingPerson(filteredPeople.find((item) => item.id === person.id) || null)}
                onToggle={() => {
                  const target = filteredPeople.find((item) => item.id === person.id)
                  if (target) void handleToggleStatus(target)
                }}
              />
            ))
          )}
        </div>
      </div>

      {editingPerson !== undefined ? (
        <PersonDialog person={editingPerson} onClose={() => setEditingPerson(undefined)} />
      ) : null}
    </div>
  )
}
