import { useState } from 'react'
import type { LeaveRecord } from '../../legacy/store'

export function LeaveDialog({
  date,
  leaveRecords,
  peopleById,
  onClose,
  onSave,
  onDelete,
}: {
  date: string
  leaveRecords: LeaveRecord[]
  peopleById: Record<string, { name?: string }>
  onClose: () => void
  onSave: (id: string, reason: string) => void
  onDelete: (id: string) => void
}) {
  const [editing, setEditing] = useState<Record<string, string>>(() =>
    Object.fromEntries(leaveRecords.map((r) => [r.id, r.reason ?? '']))
  )

  const [parts] = useState(() => {
    const [, month, day] = date.split('-')
    return `${parseInt(month, 10)}月${parseInt(day, 10)}日`
  })

  return (
    <div className="leave-dialog-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="leave-dialog">
        <div className="leave-dialog-header">
          <span className="leave-dialog-title">{parts} 请假列表</span>
          <button className="leave-dialog-close" onClick={onClose} title="关闭">✕</button>
        </div>

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
                    value={editing[record.id] ?? ''}
                    onChange={(e) => setEditing((prev) => ({ ...prev, [record.id]: e.target.value }))}
                    onBlur={() => onSave(record.id, editing[record.id] ?? '')}
                  />
                  <button
                    className="leave-dialog-delete"
                    title="删除请假"
                    onClick={() => onDelete(record.id)}
                  >
                    ✕
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
