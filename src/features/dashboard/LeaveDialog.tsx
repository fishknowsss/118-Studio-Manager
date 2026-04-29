import { useCallback, useEffect, useRef, useState } from 'react'
import type { LeaveRecord } from '../../legacy/store'
import { useBackdropDismiss } from '../../components/ui/useBackdropDismiss'

export function LeaveDialog({
  date,
  leaveRecords,
  peopleById,
  availablePeople,
  onClose,
  onSave,
  onDelete,
  onAdd,
}: {
  date: string
  leaveRecords: LeaveRecord[]
  peopleById: Record<string, { name?: string }>
  availablePeople: { id: string; name: string }[]
  onClose: () => void
  onSave: (id: string, reason: string) => void
  onDelete: (id: string) => void
  onAdd: (personId: string) => void
}) {
  const [editing, setEditing] = useState<Record<string, string>>(() =>
    Object.fromEntries(leaveRecords.map((r) => [r.id, r.reason ?? '']))
  )
  const [selectedPersonId, setSelectedPersonId] = useState<string>('')
  const [closing, setClosing] = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)

  // sync new records into editing map
  const syncedEditing = { ...editing }
  for (const r of leaveRecords) {
    if (!(r.id in syncedEditing)) syncedEditing[r.id] = r.reason ?? ''
  }

  const dateLabel = (() => {
    const [, month, day] = date.split('-')
    return `${parseInt(month, 10)}月${parseInt(day, 10)}日`
  })()

  const triggerClose = useCallback(() => {
    if (closing) return
    setClosing(true)
  }, [closing])
  const backdropDismiss = useBackdropDismiss<HTMLDivElement>(triggerClose)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') triggerClose()
    }
    document.addEventListener('keydown', handler, true)
    return () => document.removeEventListener('keydown', handler, true)
  }, [triggerClose])

  const handleAnimationEnd = (e: React.AnimationEvent<HTMLDivElement>) => {
    if (closing && e.target === overlayRef.current) onClose()
  }

  const handleAdd = () => {
    if (!selectedPersonId) return
    onAdd(selectedPersonId)
    setSelectedPersonId('')
  }

  return (
    <div
      ref={overlayRef}
      className={`leave-dialog-overlay${closing ? ' is-closing' : ''}`}
      onAnimationEnd={handleAnimationEnd}
      {...backdropDismiss}
    >
      <div className="leave-dialog">
        <div className="leave-dialog-header">
          <span className="leave-dialog-title">{dateLabel} 请假</span>
          <button className="leave-dialog-close" onClick={triggerClose} title="关闭">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="leave-dialog-body">
          {leaveRecords.length === 0 ? (
            <div className="leave-dialog-empty">当日暂无请假记录</div>
          ) : (
            <ul className="leave-dialog-list">
              {leaveRecords.map((record) => {
                const name = peopleById[record.personId]?.name || '未知成员'
                return (
                  <li key={record.id} className="leave-dialog-item">
                    <span className="leave-dialog-name">{name}</span>
                    <input
                      className="leave-dialog-reason"
                      placeholder="请假原因（可选）"
                      value={syncedEditing[record.id] ?? ''}
                      onChange={(e) => setEditing((prev) => ({ ...prev, [record.id]: e.target.value }))}
                      onBlur={() => onSave(record.id, syncedEditing[record.id] ?? '')}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.currentTarget.blur()
                          onSave(record.id, syncedEditing[record.id] ?? '')
                        }
                      }}
                    />
                    <button
                      className="leave-dialog-delete"
                      title="删除请假"
                      onClick={() => onDelete(record.id)}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}

          {availablePeople.length > 0 && (
            <div className="leave-dialog-add-row">
              <select
                className="leave-dialog-person-select"
                value={selectedPersonId}
                onChange={(e) => setSelectedPersonId(e.target.value)}
              >
                <option value="">选择成员…</option>
                {availablePeople.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <button
                className="leave-dialog-add-btn"
                disabled={!selectedPersonId}
                onClick={handleAdd}
              >
                添加
              </button>
            </div>
          )}
        </div>

        <div className="leave-dialog-footer">
          <button className="btn btn-primary btn-sm" onClick={triggerClose}>完成</button>
        </div>
      </div>
    </div>
  )
}
