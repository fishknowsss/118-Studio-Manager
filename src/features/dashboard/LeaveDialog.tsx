import { useCallback, useEffect, useRef, useState } from 'react'
import type { LeaveRecord } from '../../legacy/store'
import { useBackdropDismiss } from '../../components/ui/useBackdropDismiss'
import { useModalFocus } from '../../components/ui/useModalFocus'
import { useBodyScrollLock } from '../../components/ui/useBodyScrollLock'

const CLOSE_FALLBACK_MS = 260

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
  const closeTimerRef = useRef<number | null>(null)
  const closedRef = useRef(false)

  // sync new records into editing map
  const syncedEditing = { ...editing }
  for (const r of leaveRecords) {
    if (!(r.id in syncedEditing)) syncedEditing[r.id] = r.reason ?? ''
  }

  const dateLabel = (() => {
    const [, month, day] = date.split('-')
    return `${parseInt(month, 10)}月${parseInt(day, 10)}日`
  })()

  const finishClose = useCallback(() => {
    if (closedRef.current) return
    closedRef.current = true
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current)
    closeTimerRef.current = null
    onClose()
  }, [onClose])

  const triggerClose = useCallback(() => {
    if (closing) return
    setClosing(true)
    closeTimerRef.current = window.setTimeout(finishClose, CLOSE_FALLBACK_MS)
  }, [closing, finishClose])
  const dialogRef = useModalFocus(true, triggerClose)
  useBodyScrollLock(true)
  const backdropDismiss = useBackdropDismiss<HTMLDivElement>(triggerClose)

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current)
    }
  }, [])

  const handleAnimationEnd = (e: React.AnimationEvent<HTMLDivElement>) => {
    if (closing && e.target === overlayRef.current) finishClose()
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
      <div ref={dialogRef} className="leave-dialog" role="dialog" aria-modal="true" aria-label={`${dateLabel} 请假`} tabIndex={-1}>
        <div className="leave-dialog-header">
          <span className="leave-dialog-title">{dateLabel} 请假</span>
          <button className="leave-dialog-close" type="button" onClick={triggerClose} aria-label="关闭">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="leave-dialog-body">
          {leaveRecords.length === 0 ? (
            <div className="leave-dialog-empty">选择成员添加请假</div>
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
                        }
                      }}
                    />
                    <button
                      className="leave-dialog-delete"
                      type="button"
                      aria-label={`删除${name}的请假`}
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
                type="button"
                disabled={!selectedPersonId}
                onClick={handleAdd}
              >
                添加
              </button>
            </div>
          )}
        </div>

        <div className="leave-dialog-footer">
          <button className="btn btn-primary btn-sm" type="button" onClick={triggerClose}>完成</button>
        </div>
      </div>
    </div>
  )
}
