import { useEffect, useMemo, useRef, useState } from 'react'
import { Dialog } from '../../components/ui/Dialog'
import { PersonGenderAvatar } from '../../components/ui/PersonGenderAvatar'
import { store, type LegacyPerson, type ShortDramaGroup } from '../../legacy/store'
import { now, uid } from '../../legacy/utils'

const MEMBER_ROWS = 3

function getMemberColumns(width: number) {
  if (width >= 650) return 6
  if (width >= 560) return 5
  if (width >= 450) return 4
  if (width >= 340) return 3
  return 2
}

export function ShortDramaGroupDialog({
  dramaId,
  group,
  onClose,
  people,
}: {
  dramaId: string
  group: ShortDramaGroup | null
  onClose: () => void
  people: LegacyPerson[]
}) {
  const activePeople = useMemo(() => people.filter((person) => person.status !== 'inactive'), [people])
  const [name, setName] = useState(group?.name || '')
  const [leaderId, setLeaderId] = useState(group?.leaderId || '')
  const [memberIds, setMemberIds] = useState<string[]>(group?.memberIds || [])
  const memberViewportRef = useRef<HTMLDivElement | null>(null)
  const [memberColumns, setMemberColumns] = useState(4)
  const [memberPage, setMemberPage] = useState(0)
  const [notes, setNotes] = useState(group?.notes || '')

  useEffect(() => {
    const node = memberViewportRef.current
    if (!node) return undefined

    const updateColumns = (width = node.clientWidth || node.getBoundingClientRect().width) => {
      const nextColumns = getMemberColumns(width)
      setMemberColumns((current) => (current === nextColumns ? current : nextColumns))
    }

    updateColumns()
    if (typeof ResizeObserver === 'undefined') return undefined

    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? node.clientWidth
      updateColumns(width)
    })

    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const memberPageSize = memberColumns * MEMBER_ROWS
  const memberPageCount = Math.max(1, Math.ceil(activePeople.length / memberPageSize))

  useEffect(() => {
    setMemberPage((current) => Math.min(current, memberPageCount - 1))
  }, [memberPageCount])

  const visiblePeople = useMemo(() => {
    const startIndex = memberPage * memberPageSize
    return activePeople.slice(startIndex, startIndex + memberPageSize)
  }, [activePeople, memberPage, memberPageSize])

  const toggleMember = (personId: string) => {
    setMemberIds((current) =>
      current.includes(personId)
        ? current.filter((id) => id !== personId)
        : [...current, personId],
    )
  }

  const handleSubmit = async () => {
    const text = name.trim()
    if (!text) return
    const timestamp = now()
    const nextMembers = leaderId && !memberIds.includes(leaderId)
      ? [leaderId, ...memberIds]
      : memberIds
    await store.saveShortDramaGroup({
      id: group?.id || uid(),
      createdAt: group?.createdAt || timestamp,
      updatedAt: timestamp,
      dramaId,
      leaderId: leaderId || null,
      memberIds: nextMembers,
      name: text,
      notes: notes.trim(),
      sortOrder: group?.sortOrder ?? Date.now(),
    })
    onClose()
  }

  return (
    <Dialog
      open
      title={group ? '编辑小组' : '新建小组'}
      onClose={onClose}
      footer={(
        <>
          <button className="btn btn-secondary" type="button" onClick={onClose}>取消</button>
          <button className="btn btn-primary" type="button" onClick={() => void handleSubmit()} disabled={!name.trim()}>保存</button>
        </>
      )}
    >
      <div className="form-grid">
        <div className="form-field">
          <label className="form-label" htmlFor="short-drama-group-name">小组名称</label>
          <input id="short-drama-group-name" className="form-input" value={name} onChange={(event) => setName(event.target.value)} />
        </div>
        <div className="form-field">
          <label className="form-label" htmlFor="short-drama-group-leader">负责人</label>
          <select id="short-drama-group-leader" className="form-input" value={leaderId} onChange={(event) => setLeaderId(event.target.value)}>
            <option value="">未指定</option>
            {activePeople.map((person) => (
              <option key={person.id} value={person.id}>{person.name || '未命名'}</option>
            ))}
          </select>
        </div>
        <div className="form-field span2">
          <label className="form-label">
            成员
            {memberIds.length > 0 ? <span className="form-label-count"> · {memberIds.length} 人</span> : null}
          </label>
          <div className="task-assignee-picker">
            <div ref={memberViewportRef} className="task-assignee-viewport">
              {activePeople.length === 0 ? <span className="text-muted text-sm">暂无可用人员</span> : null}
              {activePeople.length > 0 ? (
                <div className={`task-assignee-page cols-${memberColumns}`}>
                  {visiblePeople.map((person) => {
                    const selected = memberIds.includes(person.id)
                    return (
                      <button
                        key={person.id}
                        type="button"
                        className={`assignee-chip${selected ? ' selected' : ''}`}
                        onClick={() => toggleMember(person.id)}
                      >
                        <PersonGenderAvatar className="assignee-chip-avatar" gender={person.gender} />
                        <span className="assignee-chip-name">{person.name || '未命名'}</span>
                        {selected ? (
                          <svg className="assignee-chip-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="12" height="12">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        ) : null}
                      </button>
                    )
                  })}
                </div>
              ) : null}
            </div>
            <div className="task-assignee-pagination" aria-label="成员分页">
              <button
                aria-label="成员上一页"
                className="task-assignee-page-btn"
                disabled={memberPage === 0 || activePeople.length === 0}
                type="button"
                onClick={() => setMemberPage((current) => Math.max(0, current - 1))}
              >
                ‹
              </button>
              <span className="task-assignee-page-indicator">{memberPage + 1} / {memberPageCount}</span>
              <button
                aria-label="成员下一页"
                className="task-assignee-page-btn"
                disabled={memberPage >= memberPageCount - 1 || activePeople.length === 0}
                type="button"
                onClick={() => setMemberPage((current) => Math.min(memberPageCount - 1, current + 1))}
              >
                ›
              </button>
            </div>
          </div>
        </div>
        <div className="form-field span2">
          <label className="form-label" htmlFor="short-drama-group-notes">备注</label>
          <textarea id="short-drama-group-notes" className="form-input" value={notes} onChange={(event) => setNotes(event.target.value)} />
        </div>
      </div>
    </Dialog>
  )
}
