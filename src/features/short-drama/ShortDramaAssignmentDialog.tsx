import { useMemo, useState } from 'react'
import { DatePicker } from '../../components/ui/DatePicker'
import { Dialog } from '../../components/ui/Dialog'
import {
  SHORT_DRAMA_PROGRESS_STATUSES,
  store,
  type LegacyPerson,
  type ShortDramaAssignment,
  type ShortDramaAssignmentAllocation,
  type ShortDramaGroup,
} from '../../legacy/store'
import { now, uid } from '../../legacy/utils'
import { formatDurationSeconds, parseDurationText, SHORT_DRAMA_PROGRESS_LABELS } from './shortDramaModels'

function numericText(value: number | null | undefined) {
  return Number.isFinite(Number(value)) && Number(value) > 0 ? String(value) : ''
}

function toNumberOrNull(value: string) {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? number : null
}

export function ShortDramaAssignmentDialog({
  assignment,
  dramaId,
  groups,
  initialGroupId = null,
  onClose,
  people,
}: {
  assignment: ShortDramaAssignment | null
  dramaId: string
  groups: ShortDramaGroup[]
  initialGroupId?: string | null
  onClose: () => void
  people: LegacyPerson[]
}) {
  const activePeople = useMemo(() => people.filter((person) => person.status !== 'inactive'), [people])
  const initialGroup = useMemo(
    () => groups.find((group) => group.id === (assignment?.groupId || initialGroupId)),
    [assignment?.groupId, groups, initialGroupId],
  )
  const initialProducerIds = assignment?.allocations.length
    ? assignment.allocations.map((allocation) => allocation.personId)
    : assignment?.producerIds || initialGroup?.memberIds || []
  const [episodes, setEpisodes] = useState(assignment?.episodes || '')
  const [groupId, setGroupId] = useState(assignment?.groupId || initialGroupId || '')
  const [producerIds, setProducerIds] = useState<string[]>(initialProducerIds)
  const [ownerId, setOwnerId] = useState(assignment?.ownerId || initialGroup?.leaderId || '')
  const [status, setStatus] = useState(assignment?.status || 'not-started')
  const [estimatedHours, setEstimatedHours] = useState(numericText(assignment?.estimatedHours))
  const [actualHours, setActualHours] = useState(numericText(assignment?.actualHours))
  const [startDate, setStartDate] = useState<string | null>(assignment?.startDate || null)
  const [endDate, setEndDate] = useState<string | null>(assignment?.endDate || null)
  const [durationText, setDurationText] = useState(formatDurationSeconds(assignment?.finishedDurationSeconds).replace('—', ''))
  const [notes, setNotes] = useState(assignment?.notes || '')
  const [showDetails, setShowDetails] = useState(false)
  const [allocations, setAllocations] = useState<ShortDramaAssignmentAllocation[]>(
    assignment?.allocations.length
      ? assignment.allocations
      : initialProducerIds.map((personId) => ({ personId })),
  )
  const candidatePeople = useMemo(() => {
    const group = groups.find((item) => item.id === groupId)
    if (!group) return activePeople
    const groupMemberIds = new Set(group.memberIds)
    const grouped = activePeople.filter((person) => groupMemberIds.has(person.id))
    return grouped.length > 0 ? grouped : activePeople
  }, [activePeople, groupId, groups])

  const selectedAllocations = producerIds.map((personId) => (
    allocations.find((allocation) => allocation.personId === personId) || { personId }
  ))

  const updateAllocation = (
    personId: string,
    patch: Partial<Omit<ShortDramaAssignmentAllocation, 'personId'>>,
  ) => {
    setAllocations((current) => {
      const existing = current.find((allocation) => allocation.personId === personId)
      if (!existing) return [...current, { personId, ...patch }]
      return current.map((allocation) =>
        allocation.personId === personId ? { ...allocation, ...patch } : allocation,
      )
    })
  }

  const toggleProducer = (personId: string) => {
    setProducerIds((current) => {
      if (current.includes(personId)) {
        setAllocations((items) => items.filter((allocation) => allocation.personId !== personId))
        return current.filter((id) => id !== personId)
      }
      return [...current, personId]
    })
  }

  const handleGroupChange = (nextGroupId: string) => {
    setGroupId(nextGroupId)
    const group = groups.find((item) => item.id === nextGroupId)
    if (!group) return
    setProducerIds(group.memberIds)
    if (!ownerId && group.leaderId) setOwnerId(group.leaderId)
    setAllocations((current) => {
      const currentMap = new Map(current.map((allocation) => [allocation.personId, allocation]))
      return group.memberIds.map((personId) => currentMap.get(personId) || { personId })
    })
  }

  const handleSubmit = async () => {
    const text = episodes.trim()
    if (!text) return
    const timestamp = now()
    const cleanAllocations = selectedAllocations.map((allocation) => ({
      ...allocation,
      actualHours: allocation.actualHours || null,
      estimatedHours: allocation.estimatedHours || null,
      episodes: allocation.episodes?.trim() || '',
      notes: allocation.notes?.trim() || '',
    }))
    const allocationEstimated = cleanAllocations.reduce((sum, allocation) => sum + (Number(allocation.estimatedHours) || 0), 0)
    const allocationActual = cleanAllocations.reduce((sum, allocation) => sum + (Number(allocation.actualHours) || 0), 0)

    await store.saveShortDramaAssignment({
      id: assignment?.id || uid(),
      createdAt: assignment?.createdAt || timestamp,
      updatedAt: timestamp,
      actualHours: (toNumberOrNull(actualHours) ?? allocationActual) || null,
      allocations: cleanAllocations,
      dramaId,
      endDate,
      episodes: text,
      estimatedHours: (toNumberOrNull(estimatedHours) ?? allocationEstimated) || null,
      finishedDurationSeconds: parseDurationText(durationText),
      groupId: groupId || null,
      notes: notes.trim(),
      ownerId: ownerId || null,
      producerIds: cleanAllocations.map((allocation) => allocation.personId),
      startDate,
      status,
    })
    onClose()
  }

  return (
    <Dialog
      open
      title={assignment ? '编辑分配' : '新建分配'}
      onClose={onClose}
      width="wide"
      footer={(
        <>
          <button className="btn btn-secondary" type="button" onClick={onClose}>取消</button>
          <button className="btn btn-primary" type="button" onClick={() => void handleSubmit()} disabled={!episodes.trim() || producerIds.length === 0}>保存</button>
        </>
      )}
    >
      <div className="form-grid">
        <div className="form-field">
          <label className="form-label" htmlFor="short-drama-assignment-episodes">集数</label>
          <input id="short-drama-assignment-episodes" className="form-input" value={episodes} onChange={(event) => setEpisodes(event.target.value)} placeholder="1-5" />
        </div>
        <div className="form-field">
          <label className="form-label" htmlFor="short-drama-assignment-status">制作进度</label>
          <select id="short-drama-assignment-status" className="form-input" value={status} onChange={(event) => setStatus(event.target.value as typeof status)}>
            {SHORT_DRAMA_PROGRESS_STATUSES.map((item) => (
              <option key={item} value={item}>{SHORT_DRAMA_PROGRESS_LABELS[item]}</option>
            ))}
          </select>
        </div>
        <div className="form-field">
          <label className="form-label" htmlFor="short-drama-assignment-actual">实际工时</label>
          <input id="short-drama-assignment-actual" className="form-input" type="number" min="0" value={actualHours} onChange={(event) => setActualHours(event.target.value)} />
        </div>
        <div className="form-field">
          <label className="form-label" htmlFor="short-drama-assignment-duration">成片时长</label>
          <input id="short-drama-assignment-duration" className="form-input" value={durationText} onChange={(event) => setDurationText(event.target.value)} placeholder="1:30" />
        </div>
        <div className="form-field">
          <label className="form-label" htmlFor="short-drama-assignment-owner">负责人</label>
          <select id="short-drama-assignment-owner" className="form-input" value={ownerId} onChange={(event) => setOwnerId(event.target.value)}>
            <option value="">未指定</option>
            {activePeople.map((person) => (
              <option key={person.id} value={person.id}>{person.name || '未命名'}</option>
            ))}
          </select>
        </div>
        <div className="form-field">
          <label className="form-label" htmlFor="short-drama-assignment-group">小组</label>
          <select id="short-drama-assignment-group" className="form-input" value={groupId} onChange={(event) => handleGroupChange(event.target.value)}>
            <option value="">未分组</option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>{group.name || '未命名'}</option>
            ))}
          </select>
        </div>
        <div className="form-field span2">
          <span className="form-label">制作人</span>
          <div className="short-drama-person-picker">
            {candidatePeople.map((person) => (
              <button
                key={person.id}
                className={`short-drama-person-chip${producerIds.includes(person.id) ? ' selected' : ''}`}
                type="button"
                onClick={() => toggleProducer(person.id)}
              >
                {person.name || '未命名'}
              </button>
            ))}
          </div>
        </div>
        {selectedAllocations.length > 0 ? (
          <div className="form-field span2">
            <span className="form-label">人员拆分</span>
            <div className="short-drama-allocation-list">
              {selectedAllocations.map((allocation) => {
                const person = activePeople.find((item) => item.id === allocation.personId)
                return (
                  <div key={allocation.personId} className="short-drama-allocation-row">
                    <strong>{person?.name || '未命名'}</strong>
                    <input className="form-input" value={allocation.episodes || ''} onChange={(event) => updateAllocation(allocation.personId, { episodes: event.target.value })} placeholder="集数" />
                    <input className="form-input" type="number" min="0" value={numericText(allocation.estimatedHours)} onChange={(event) => updateAllocation(allocation.personId, { estimatedHours: toNumberOrNull(event.target.value) })} placeholder="预计" />
                    <input className="form-input" type="number" min="0" value={numericText(allocation.actualHours)} onChange={(event) => updateAllocation(allocation.personId, { actualHours: toNumberOrNull(event.target.value) })} placeholder="实际" />
                  </div>
                )
              })}
            </div>
          </div>
        ) : null}
        <div className="form-field span2">
          <button className="btn btn-secondary btn-sm" type="button" onClick={() => setShowDetails((value) => !value)}>
            {showDetails ? '收起' : '更多'}
          </button>
        </div>

        {showDetails ? (
          <>
            <div className="form-field">
              <label className="form-label" htmlFor="short-drama-assignment-estimated">预计工时</label>
              <input id="short-drama-assignment-estimated" className="form-input" type="number" min="0" value={estimatedHours} onChange={(event) => setEstimatedHours(event.target.value)} />
            </div>
            <div className="form-field">
          <DatePicker id="short-drama-assignment-start" label="开始日期" value={startDate} onChange={setStartDate} />
            </div>
            <div className="form-field">
          <DatePicker id="short-drama-assignment-end" label="完成日期" value={endDate} onChange={setEndDate} />
            </div>
            <div className="form-field span2">
              <label className="form-label" htmlFor="short-drama-assignment-notes">备注</label>
              <textarea id="short-drama-assignment-notes" className="form-input" value={notes} onChange={(event) => setNotes(event.target.value)} />
            </div>
          </>
        ) : null}
      </div>
    </Dialog>
  )
}
