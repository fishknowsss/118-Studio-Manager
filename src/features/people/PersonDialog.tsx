import { useState } from 'react'
import { useToast } from '../../components/feedback/ToastProvider'
import { Dialog } from '../../components/ui/Dialog'
import { PERSON_GENDERS, PERSON_STATUSES, type LegacyPerson } from '../../legacy/store'
import { savePersonFromForm, type PersonFormInput } from '../../legacy/actions'

const GENDER_LABELS = {
  male: '男',
  female: '女',
  other: '其他',
} as const

const STATUS_LABELS = {
  active: '在职',
  inactive: '停用',
} as const

export function PersonDialog({
  onClose,
  person,
}: {
  onClose: () => void
  person: LegacyPerson | null
}) {
  const isNew = !person
  const { toast } = useToast()
  const [skillInput, setSkillInput] = useState('')
  const [form, setForm] = useState<PersonFormInput>(() => ({
    name: person?.name || '',
    gender: person?.gender || '',
    status: person?.status || 'active',
    skills: [...(person?.skills || [])],
    notes: person?.notes || '',
  }))

  const addSkill = () => {
    const nextSkill = skillInput.trim()
    if (!nextSkill) return
    setForm((current) => ({
      ...current,
      skills: current.skills.includes(nextSkill) ? current.skills : [...current.skills, nextSkill],
    }))
    setSkillInput('')
  }

  const save = async () => {
    if (!form.name?.trim()) {
      toast('请填写姓名', 'error')
      return
    }

    await savePersonFromForm(person, form)
    toast(isNew ? '人员已添加' : '已保存', 'success')
    onClose()
  }

  return (
    <Dialog
      open
      title={isNew ? '新增人员' : '编辑人员'}
      onClose={onClose}
      footer={(
        <>
          <button className="btn btn-secondary" type="button" onClick={onClose}>取消</button>
          <button className="btn btn-primary" type="button" onClick={() => void save()}>
            {isNew ? '添加人员' : '保存'}
          </button>
        </>
      )}
    >
      <div className="form-grid">
        <div className="form-field">
          <label className="form-label" htmlFor="person-name">姓名 *</label>
          <input id="person-name" className="form-input" value={form.name || ''} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
        </div>
        <div className="form-field">
          <label className="form-label" htmlFor="person-gender">性别</label>
          <select id="person-gender" className="form-input" value={form.gender || ''} onChange={(event) => setForm((current) => ({ ...current, gender: event.target.value as PersonFormInput['gender'] }))}>
            <option value="">不填</option>
            {PERSON_GENDERS.map((gender) => (
              <option key={gender} value={gender}>{GENDER_LABELS[gender]}</option>
            ))}
          </select>
        </div>
        <div className="form-field">
          <label className="form-label" htmlFor="person-status">状态</label>
          <select id="person-status" className="form-input" value={form.status || 'active'} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as PersonFormInput['status'] }))}>
            {PERSON_STATUSES.map((status) => (
              <option key={status} value={status}>{STATUS_LABELS[status]}</option>
            ))}
          </select>
        </div>
        <div className="form-field span2">
          <label className="form-label">技能标签</label>
          <div className="skills-editor">
            {form.skills.map((skill) => (
              <span key={skill} className="skill-edit-tag">
                {skill}
                <button
                  type="button"
                  className="skill-remove-button"
                  onClick={() => setForm((current) => ({
                    ...current,
                    skills: current.skills.filter((item) => item !== skill),
                  }))}
                >
                  ×
                </button>
              </span>
            ))}
            <input
              className="skill-add-input"
              value={skillInput}
              placeholder="添加技能"
              onChange={(event) => setSkillInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ',') {
                  event.preventDefault()
                  addSkill()
                }
              }}
            />
            <button className="btn btn-secondary btn-sm" type="button" onClick={addSkill}>添加</button>
          </div>
        </div>
        <div className="form-field span2">
          <label className="form-label" htmlFor="person-notes">备注</label>
          <textarea id="person-notes" className="form-input" rows={4} value={form.notes || ''} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
        </div>
      </div>
    </Dialog>
  )
}
