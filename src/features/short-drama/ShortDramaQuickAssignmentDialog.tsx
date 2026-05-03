import { useMemo, useState } from 'react'
import { Dialog } from '../../components/ui/Dialog'
import {
  store,
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

export function ShortDramaQuickAssignmentDialog({
  assignments,
  dramaId,
  groups,
  initialGroupId = null,
  onClose,
}: {
  assignments: ShortDramaAssignment[]
  dramaId: string
  groups: ShortDramaGroup[]
  initialGroupId?: string | null
  onClose: () => void
}) {
  const firstGroupId = initialGroupId || groups[0]?.id || ''
  const [groupId, setGroupId] = useState(firstGroupId)
  const defaults = useMemo(
    () => buildShortDramaAssignmentDefaults({ assignments, dramaId, groupId, groups }),
    [assignments, dramaId, groupId, groups],
  )
  const [episodes, setEpisodes] = useState('')
  const [estimatedHours, setEstimatedHours] = useState(numericText(defaults.estimatedHours))

  const handleGroupChange = (nextGroupId: string) => {
    setGroupId(nextGroupId)
    const nextDefaults = buildShortDramaAssignmentDefaults({ assignments, dramaId, groupId: nextGroupId, groups })
    setEstimatedHours(numericText(nextDefaults.estimatedHours))
  }

  const handleSubmit = async () => {
    const text = episodes.trim()
    if (!text) return
    const timestamp = now()
    const latestDefaults = buildShortDramaAssignmentDefaults({ assignments, dramaId, groupId, groups })
    const nextEstimatedHours = toNumberOrNull(estimatedHours) ?? latestDefaults.estimatedHours
    await store.saveShortDramaAssignment({
      id: uid(),
      actualHours: null,
      allocations: latestDefaults.allocations,
      createdAt: timestamp,
      dramaId,
      endDate: null,
      episodes: text,
      estimatedHours: nextEstimatedHours,
      finishedDurationSeconds: null,
      groupId: groupId || null,
      notes: '',
      ownerId: latestDefaults.ownerId || null,
      producerIds: latestDefaults.producerIds,
      startDate: null,
      status: latestDefaults.status,
      updatedAt: timestamp,
    })
    onClose()
  }

  return (
    <Dialog
      open
      title="分配集数"
      onClose={onClose}
      footer={(
        <>
          <button className="btn btn-secondary" type="button" onClick={onClose}>取消</button>
          <button className="btn btn-primary" type="button" onClick={() => void handleSubmit()} disabled={!episodes.trim()}>保存</button>
        </>
      )}
    >
      <div className="short-drama-quick-form">
        <div className="form-field">
          <label className="form-label" htmlFor="short-drama-quick-episodes">集数</label>
          <input
            id="short-drama-quick-episodes"
            className="form-input"
            value={episodes}
            onChange={(event) => setEpisodes(event.target.value)}
            placeholder="1-5"
          />
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
      </div>
    </Dialog>
  )
}
