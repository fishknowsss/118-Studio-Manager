import { useState } from 'react'
import { DatePicker } from '../../components/ui/DatePicker'
import { Dialog } from '../../components/ui/Dialog'
import { SHORT_DRAMA_PROGRESS_STATUSES, store, type ShortDrama } from '../../legacy/store'
import { now, uid } from '../../legacy/utils'
import { SHORT_DRAMA_PROGRESS_LABELS } from './shortDramaModels'

export function ShortDramaDialog({
  drama,
  onClose,
}: {
  drama: ShortDrama | null
  onClose: () => void
}) {
  const [title, setTitle] = useState(drama?.title || '')
  const [totalEpisodes, setTotalEpisodes] = useState(String(drama?.totalEpisodes || ''))
  const [status, setStatus] = useState(drama?.status || 'not-started')
  const [startDate, setStartDate] = useState<string | null>(drama?.startDate || null)
  const [endDate, setEndDate] = useState<string | null>(drama?.endDate || null)
  const [notes, setNotes] = useState(drama?.notes || '')

  const handleSubmit = async () => {
    const text = title.trim()
    if (!text) return
    const timestamp = now()
    await store.saveShortDrama({
      id: drama?.id || uid(),
      createdAt: drama?.createdAt || timestamp,
      updatedAt: timestamp,
      title: text,
      totalEpisodes: Number(totalEpisodes) || null,
      status,
      startDate,
      endDate,
      notes: notes.trim(),
    })
    onClose()
  }

  return (
    <Dialog
      open
      title={drama ? '编辑短剧' : '新建短剧'}
      onClose={onClose}
      footer={(
        <>
          <button className="btn btn-secondary" type="button" onClick={onClose}>取消</button>
          <button className="btn btn-primary" type="button" onClick={() => void handleSubmit()} disabled={!title.trim()}>保存</button>
        </>
      )}
    >
      <div className="form-grid">
        <div className="form-field span2">
          <label className="form-label" htmlFor="short-drama-title">剧名</label>
          <input id="short-drama-title" className="form-input" value={title} onChange={(event) => setTitle(event.target.value)} />
        </div>
        <div className="form-field">
          <label className="form-label" htmlFor="short-drama-episodes">总集数</label>
          <input id="short-drama-episodes" className="form-input" type="number" min="0" value={totalEpisodes} onChange={(event) => setTotalEpisodes(event.target.value)} />
        </div>
        <div className="form-field">
          <label className="form-label" htmlFor="short-drama-status">制作进度</label>
          <select id="short-drama-status" className="form-input" value={status} onChange={(event) => setStatus(event.target.value as typeof status)}>
            {SHORT_DRAMA_PROGRESS_STATUSES.map((item) => (
              <option key={item} value={item}>{SHORT_DRAMA_PROGRESS_LABELS[item]}</option>
            ))}
          </select>
        </div>
        <div className="form-field">
          <DatePicker id="short-drama-start" label="开始日期" value={startDate} onChange={setStartDate} />
        </div>
        <div className="form-field">
          <DatePicker id="short-drama-end" label="完成日期" value={endDate} onChange={setEndDate} />
        </div>
        <div className="form-field span2">
          <label className="form-label" htmlFor="short-drama-notes">备注</label>
          <textarea id="short-drama-notes" className="form-input" value={notes} onChange={(event) => setNotes(event.target.value)} />
        </div>
      </div>
    </Dialog>
  )
}
