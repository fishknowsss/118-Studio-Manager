import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePeople } from '../hooks/usePeople'
import { PageHeader } from '../components/PageHeader'
import { Button } from '../components/Button'
import { Modal } from '../components/Modal'
import { ConfirmModal } from '../components/ConfirmModal'
import { Card } from '../components/Card'
import { Badge } from '../components/Badge'
import { EmptyState } from '../components/EmptyState'
import { SearchInput } from '../components/SearchInput'
import { FormField } from '../components/FormField'
import { inputClass, textareaClass } from '../components/formFieldClasses'
import { TagInput } from '../components/TagInput'
import type { PersonInput } from '../types/person'

const emptyForm: PersonInput = { name: '', role: '', skills: [], note: '', isActive: true }

export function PeoplePage() {
  const { people, addPerson, updatePerson, deletePerson, togglePersonActive } = usePeople()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<PersonInput>(emptyForm)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const searchTerm = search.trim().toLowerCase()
  const filtered = people
    .filter(p =>
      !searchTerm ||
      p.name.toLowerCase().includes(searchTerm) ||
      p.role.toLowerCase().includes(searchTerm) ||
      p.note.toLowerCase().includes(searchTerm) ||
      p.skills.some(s => s.toLowerCase().includes(searchTerm))
    )
    .sort((a, b) => {
      const activeDiff = Number(b.isActive) - Number(a.isActive)
      if (activeDiff !== 0) return activeDiff
      return a.name.localeCompare(b.name, 'zh-CN')
    })

  const openCreate = () => {
    setForm(emptyForm)
    setEditingId(null)
    setErrors({})
    setShowForm(true)
  }

  const openEdit = (p: typeof people[0]) => {
    setForm({ name: p.name, role: p.role, skills: p.skills, note: p.note, isActive: p.isActive })
    setEditingId(p.id)
    setErrors({})
    setShowForm(true)
  }

  const validate = (): boolean => {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = '请输入姓名'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    if (editingId) {
      await updatePerson(editingId, form)
    } else {
      await addPerson(form)
    }
    setShowForm(false)
  }

  return (
    <>
      <PageHeader
        title="人员管理"
        subtitle={`共 ${people.length} 人`}
        actions={<Button onClick={openCreate}>+ 新建人员</Button>}
      />

      <div className="mb-4 max-w-xs">
        <SearchInput value={search} onChange={setSearch} placeholder="搜索姓名、角色、技能..." />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={search ? '没有匹配的人员' : '还没有人员'}
          description={search ? '试试其他关键词' : '添加工作室成员开始管理'}
          actionLabel={search ? undefined : '+ 新建人员'}
          onAction={search ? undefined : openCreate}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(person => (
            <Card key={person.id} hoverable onClick={() => navigate(`/people/${person.id}`)} className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="text-sm font-medium text-text-primary">{person.name}</h3>
                  <p className="text-xs text-text-secondary">{person.role || '未设置角色'}</p>
                </div>
                <Badge className={person.isActive ? 'text-accent-teal bg-accent-teal/10' : 'text-text-muted bg-gray-100'}>
                  {person.isActive ? '在职' : '停用'}
                </Badge>
              </div>
              {person.skills.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {person.skills.map((skill, i) => (
                    <span key={i} className="text-xs px-1.5 py-0.5 rounded bg-primary/5 text-primary">{skill}</span>
                  ))}
                </div>
              )}
              <div className="flex gap-2 mt-3 pt-3 border-t border-border-light">
                <button
                  className="text-xs text-primary hover:underline cursor-pointer"
                  onClick={e => { e.stopPropagation(); openEdit(person) }}
                >
                  编辑
                </button>
                <button
                  className="text-xs text-text-secondary hover:underline cursor-pointer"
                  onClick={e => { e.stopPropagation(); togglePersonActive(person.id) }}
                >
                  {person.isActive ? '停用' : '启用'}
                </button>
                <button
                  className="text-xs text-danger hover:underline cursor-pointer"
                  onClick={e => { e.stopPropagation(); setDeleteTarget({ id: person.id, name: person.name }) }}
                >
                  删除
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editingId ? '编辑人员' : '新建人员'}>
        <div className="space-y-4">
          <FormField label="姓名" required error={errors.name}>
            <input className={inputClass} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </FormField>
          <FormField label="角色">
            <input className={inputClass} value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} placeholder="如: 剪辑师、设计师" />
          </FormField>
          <FormField label="技能标签">
            <TagInput tags={form.skills} onChange={skills => setForm({ ...form, skills })} placeholder="输入技能后回车" />
          </FormField>
          <FormField label="备注">
            <textarea className={textareaClass} rows={3} value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} />
          </FormField>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowForm(false)}>取消</Button>
            <Button onClick={handleSubmit}>{editingId ? '保存' : '创建'}</Button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => { if (deleteTarget) { await deletePerson(deleteTarget.id); setDeleteTarget(null) } }}
        title="确认删除"
        message={`确定要删除「${deleteTarget?.name}」吗？该人员的所有分配记录也会被删除。`}
        confirmText="删除"
        danger
      />
    </>
  )
}
