import { useMemo, useState } from 'react'
import { Dialog } from '../../components/ui/Dialog'
import {
  store,
  type LegacyPerson,
  type ShortDramaAssignment,
  type ShortDramaGroup,
} from '../../legacy/store'
import { now, uid } from '../../legacy/utils'
import { buildShortDramaAssignmentDefaults } from './shortDramaModels'

function numericText(value: number | null | undefined) {
  return Number.isFinite(Number(value)) && Number(value) > 0 ? String(value) : ''
}

function toNumberOrNull(value: string) {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? number : null
}

type PersonEpisodeRange = {
  end: number
  start: number
}

function formatEpisodeRange(range: PersonEpisodeRange) {
  return range.start === range.end ? String(range.start) : `${range.start}-${range.end}`
}

function normalizeEpisodeRange(start: number, end: number): PersonEpisodeRange {
  return {
    end: Math.max(start, end),
    start,
  }
}

function buildAssignmentEpisodeText(ranges: PersonEpisodeRange[]) {
  if (ranges.length === 0) return ''
  const start = Math.min(...ranges.map((range) => range.start))
  const end = Math.max(...ranges.map((range) => range.end))
  return formatEpisodeRange({ start, end })
}

export function ShortDramaQuickAssignmentDialog({
  assignments,
  dramaId,
  groups,
  initialGroupId = null,
  initialPersonId = null,
  onClose,
  people,
  totalEpisodes,
}: {
  assignments: ShortDramaAssignment[]
  dramaId: string
  groups: ShortDramaGroup[]
  initialGroupId?: string | null
  initialPersonId?: string | null
  onClose: () => void
  people: LegacyPerson[]
  totalEpisodes?: number | null
}) {
  const activePeople = useMemo(() => people.filter((person) => person.status !== 'inactive'), [people])
  const episodeOptions = useMemo(() => {
    const count = Math.max(1, Math.min(300, Number(totalEpisodes) || 100))
    return Array.from({ length: count }, (_, index) => index + 1)
  }, [totalEpisodes])
  const firstGroupId = initialGroupId || ''
  const [groupId, setGroupId] = useState(firstGroupId)
  const defaults = useMemo(
    () => buildShortDramaAssignmentDefaults({ assignments, dramaId, groupId, groups }),
    [assignments, dramaId, groupId, groups],
  )
  const [estimatedHours, setEstimatedHours] = useState(numericText(defaults.estimatedHours))
  const [ownerId, setOwnerId] = useState(defaults.ownerId)
  const initialProducerIds = initialPersonId ? [initialPersonId] : defaults.producerIds
  const [personRanges, setPersonRanges] = useState<Record<string, PersonEpisodeRange>>(
    Object.fromEntries(initialProducerIds.map((personId, index) => {
      const start = Math.min(index + 1, episodeOptions.length)
      return [personId, { start, end: start }]
    })),
  )
  const candidatePeople = useMemo(() => {
    const group = groups.find((item) => item.id === groupId)
    if (!group) return activePeople
    const groupMemberIds = new Set(group.memberIds)
    const grouped = activePeople.filter((person) => groupMemberIds.has(person.id))
    return grouped.length > 0 ? grouped : activePeople
  }, [activePeople, groupId, groups])

  const handleGroupChange = (nextGroupId: string) => {
    setGroupId(nextGroupId)
    const nextDefaults = buildShortDramaAssignmentDefaults({ assignments, dramaId, groupId: nextGroupId, groups })
    setEstimatedHours(numericText(nextDefaults.estimatedHours))
    setOwnerId(nextDefaults.ownerId)
    const nextPersonIds = initialPersonId ? [initialPersonId] : nextDefaults.producerIds
    setPersonRanges(Object.fromEntries(nextPersonIds.map((personId, index) => {
      const start = Math.min(index + 1, episodeOptions.length)
      return [personId, { start, end: start }]
    })))
  }

  const toggleProducer = (personId: string) => {
    setPersonRanges((current) => {
      if (current[personId]) {
        const next = { ...current }
        delete next[personId]
        return next
      }

      const selectedCount = Object.keys(current).length
      const start = Math.min(selectedCount + 1, episodeOptions.length)
      return {
        ...current,
        [personId]: { start, end: start },
      }
    })
  }

  const updatePersonRange = (personId: string, patch: Partial<PersonEpisodeRange>) => {
    setPersonRanges((current) => {
      const currentRange = current[personId] || { start: 1, end: 1 }
      return {
        ...current,
        [personId]: normalizeEpisodeRange(
          patch.start ?? currentRange.start,
          patch.end ?? currentRange.end,
        ),
      }
    })
  }

  const handleSubmit = async () => {
    const selectedEntries = Object.entries(personRanges)
    if (selectedEntries.length === 0) return
    const timestamp = now()
    const latestDefaults = buildShortDramaAssignmentDefaults({ assignments, dramaId, groupId, groups })
    const nextEstimatedHours = toNumberOrNull(estimatedHours) ?? latestDefaults.estimatedHours
    const cleanAllocations = selectedEntries.map(([personId, range]) => ({
      personId,
      episodes: formatEpisodeRange(range),
    }))
    const producerIds = cleanAllocations.map((allocation) => allocation.personId)
    const episodeText = buildAssignmentEpisodeText(selectedEntries.map(([, range]) => range))
    await store.saveShortDramaAssignment({
      id: uid(),
      actualHours: null,
      allocations: cleanAllocations,
      createdAt: timestamp,
      dramaId,
      endDate: null,
      episodes: episodeText,
      estimatedHours: nextEstimatedHours,
      finishedDurationSeconds: null,
      groupId: groupId || null,
      notes: '',
      ownerId: ownerId || null,
      producerIds,
      startDate: null,
      status: latestDefaults.status,
      updatedAt: timestamp,
    })
    onClose()
  }

  return (
    <Dialog
      open
      title="分配给人"
      onClose={onClose}
      footer={(
        <>
          <button className="btn btn-secondary" type="button" onClick={onClose}>取消</button>
          <button className="btn btn-primary" type="button" onClick={() => void handleSubmit()} disabled={Object.keys(personRanges).length === 0}>保存</button>
        </>
      )}
    >
      <div className="short-drama-quick-form">
        <div className="form-field">
          <label className="form-label" htmlFor="short-drama-quick-owner">负责人</label>
          <select
            id="short-drama-quick-owner"
            className="form-input"
            value={ownerId}
            onChange={(event) => setOwnerId(event.target.value)}
          >
            <option value="">未指定</option>
            {activePeople.map((person) => (
              <option key={person.id} value={person.id}>{person.name || '未命名'}</option>
            ))}
          </select>
        </div>
        <div className="form-field">
          <label className="form-label" htmlFor="short-drama-quick-group">小组</label>
          <select
            id="short-drama-quick-group"
            className="form-input"
            value={groupId}
            onChange={(event) => handleGroupChange(event.target.value)}
          >
            <option value="">未分组</option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>{group.name || '未命名'}</option>
            ))}
          </select>
        </div>
        <div className="form-field">
          <label className="form-label" htmlFor="short-drama-quick-estimated">预计工时</label>
          <input
            id="short-drama-quick-estimated"
            className="form-input"
            min="0"
            type="number"
            value={estimatedHours}
            onChange={(event) => setEstimatedHours(event.target.value)}
          />
        </div>
        <div className="form-field span2">
          <span className="form-label">制作人</span>
          <div className="short-drama-person-range-list">
            <div className="short-drama-person-range-head">
              <span>人员</span>
              <span>起始</span>
              <span>结束</span>
              <span>集数</span>
            </div>
            {candidatePeople.map((person) => (
              <div
                key={person.id}
                className={`short-drama-person-range${personRanges[person.id] ? ' selected' : ''}`}
                onClick={() => {
                  if (!personRanges[person.id]) toggleProducer(person.id)
                }}
              >
                <button
                  className="short-drama-person-range-name"
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    toggleProducer(person.id)
                  }}
                >
                  {person.name || '未命名'}
                </button>
                <select
                  aria-label={`${person.name || '未命名'}起始集`}
                  className="form-input"
                  disabled={!personRanges[person.id]}
                  value={personRanges[person.id]?.start || 1}
                  onClick={(event) => event.stopPropagation()}
                  onChange={(event) => updatePersonRange(person.id, { start: Number(event.target.value) })}
                >
                  {episodeOptions.map((episode) => (
                    <option key={episode} value={episode}>{episode}</option>
                  ))}
                </select>
                <select
                  aria-label={`${person.name || '未命名'}最终集`}
                  className="form-input"
                  disabled={!personRanges[person.id]}
                  value={personRanges[person.id]?.end || 1}
                  onClick={(event) => event.stopPropagation()}
                  onChange={(event) => updatePersonRange(person.id, { end: Number(event.target.value) })}
                >
                  {episodeOptions.map((episode) => (
                    <option key={episode} value={episode}>{episode}</option>
                  ))}
                </select>
                <span>{personRanges[person.id] ? formatEpisodeRange(personRanges[person.id]) : '未选'}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Dialog>
  )
}
