import { useMemo, useState } from 'react'
import { useConfirm } from '../components/feedback/ConfirmProvider'
import { useToast } from '../components/feedback/ToastProvider'
import { ShortDramaAssignmentDialog } from '../features/short-drama/ShortDramaAssignmentDialog'
import { ShortDramaDialog } from '../features/short-drama/ShortDramaDialog'
import { ShortDramaGroupDialog } from '../features/short-drama/ShortDramaGroupDialog'
import { ShortDramaQuickAssignmentDialog } from '../features/short-drama/ShortDramaQuickAssignmentDialog'
import {
  buildShortDramaGroupLanes,
  buildShortDramaPersonSummaries,
  buildShortDramaStats,
  SHORT_DRAMA_PROGRESS_LABELS,
  type ShortDramaAssignmentCardModel,
} from '../features/short-drama/shortDramaModels'
import {
  SHORT_DRAMA_PROGRESS_STATUSES,
  store,
  type ShortDrama,
  type ShortDramaAssignment,
  type ShortDramaGroup,
  type ShortDramaProgressStatus,
} from '../legacy/store'
import { formatDate, now } from '../legacy/utils'
import { useLegacyStoreSnapshot } from '../legacy/useLegacyStore'

function dateRangeLabel(startDate?: string | null, endDate?: string | null) {
  if (startDate && endDate) return `${formatDate(startDate)} - ${formatDate(endDate)}`
  if (startDate) return `开始 ${formatDate(startDate)}`
  if (endDate) return `完成 ${formatDate(endDate)}`
  return '未定'
}

function dramaProgressLabel(drama: ShortDrama) {
  return `${SHORT_DRAMA_PROGRESS_LABELS[drama.status || 'not-started']} · ${drama.totalEpisodes || 0} 集`
}

function AssignmentCard({
  assignment,
  card,
  onDelete,
  onEdit,
  onStatusChange,
}: {
  assignment: ShortDramaAssignment | undefined
  card: ShortDramaAssignmentCardModel
  onDelete: (assignmentId: string) => void
  onEdit: (assignment: ShortDramaAssignment | null) => void
  onStatusChange: (assignmentId: string, status: ShortDramaProgressStatus) => void
}) {
  const producerNames = card.producerNames === '未分配' ? [] : card.producerNames.split('、').filter(Boolean)

  return (
    <article className="short-drama-assignment-row">
      <div className="short-drama-assignment-title">
        <strong>{card.title}</strong>
        <span>负责：{card.ownerName || '未指定'}</span>
      </div>
      <div className="short-drama-assignment-people">
        {producerNames.length > 0 ? (
          <div className="short-drama-assignment-chips" aria-label={`制作人：${card.producerNames}`}>
            {producerNames.map((name) => (
              <span key={name}>{name}</span>
            ))}
          </div>
        ) : (
          <span>未分配</span>
        )}
      </div>
      <div className="short-drama-assignment-metrics">
        <span>{card.hoursText}</span>
        <span>{card.durationText}</span>
      </div>
      <select
        aria-label={`${card.title}制作进度`}
        className={`short-drama-status-select status-${card.status}`}
        value={card.status}
        onChange={(event) => onStatusChange(card.id, event.target.value as ShortDramaProgressStatus)}
      >
        {SHORT_DRAMA_PROGRESS_STATUSES.map((status) => (
          <option key={status} value={status}>{SHORT_DRAMA_PROGRESS_LABELS[status]}</option>
        ))}
      </select>
      <div className="short-drama-row-actions">
        <button className="btn btn-ghost btn-xs" type="button" onClick={() => onEdit(assignment || null)}>编辑</button>
        <button className="btn btn-ghost btn-xs short-drama-danger-action" type="button" onClick={() => onDelete(card.id)}>删除</button>
      </div>
    </article>
  )
}

export function ShortDrama() {
  const snap = useLegacyStoreSnapshot()
  const { shortDramas, shortDramaGroups, shortDramaAssignments, people } = snap
  const { confirm } = useConfirm()
  const { toast } = useToast()
  const [selectedDramaId, setSelectedDramaId] = useState(() => shortDramas[0]?.id || '')
  const [editingDrama, setEditingDrama] = useState<ShortDrama | null | undefined>(undefined)
  const [editingGroup, setEditingGroup] = useState<ShortDramaGroup | null | undefined>(undefined)
  const [editingAssignment, setEditingAssignment] = useState<ShortDramaAssignment | null | undefined>(undefined)
  const [quickAssignmentGroupId, setQuickAssignmentGroupId] = useState<string | null | undefined>(undefined)
  const [quickAssignmentPersonId, setQuickAssignmentPersonId] = useState<string | null>(null)

  const selectedDrama = useMemo(
    () => shortDramas.find((drama) => drama.id === selectedDramaId) || shortDramas[0] || null,
    [selectedDramaId, shortDramas],
  )
  const effectiveSelectedDramaId = selectedDrama?.id || ''
  const selectedGroups = useMemo(
    () => shortDramaGroups
      .filter((group) => group.dramaId === effectiveSelectedDramaId)
      .sort((left, right) => (left.sortOrder || 0) - (right.sortOrder || 0)),
    [effectiveSelectedDramaId, shortDramaGroups],
  )
  const selectedAssignments = useMemo(
    () => shortDramaAssignments.filter((assignment) => assignment.dramaId === effectiveSelectedDramaId),
    [effectiveSelectedDramaId, shortDramaAssignments],
  )
  const stats = useMemo(
    () => buildShortDramaStats(selectedDrama, shortDramaAssignments),
    [selectedDrama, shortDramaAssignments],
  )
  const lanes = useMemo(
    () => selectedDrama ? buildShortDramaGroupLanes(shortDramaAssignments, selectedGroups, people, selectedDrama.id) : [],
    [people, selectedDrama, selectedGroups, shortDramaAssignments],
  )
  const personSummaries = useMemo(
    () => selectedDrama
      ? buildShortDramaPersonSummaries(shortDramaAssignments, selectedGroups, people, selectedDrama.id)
      : [],
    [people, selectedDrama, selectedGroups, shortDramaAssignments],
  )

  const openQuickAssignmentDialog = (groupId: string | null = null, personId: string | null = null) => {
    const fallbackGroupId = personId
      ? selectedGroups.find((group) => group.memberIds.includes(personId))?.id || groupId
      : groupId
    setQuickAssignmentGroupId(fallbackGroupId || null)
    setQuickAssignmentPersonId(personId)
  }

  const closeQuickAssignmentDialog = () => {
    setQuickAssignmentGroupId(undefined)
    setQuickAssignmentPersonId(null)
  }

  const handleDeleteDrama = async () => {
    if (!selectedDrama) return
    const ok = await confirm('删除短剧', `将删除「${selectedDrama.title || '未命名短剧'}」及其小组和分配。`)
    if (!ok) return
    await store.deleteShortDrama(selectedDrama.id)
    toast('短剧已删除', 'success')
  }

  const handleDeleteGroup = async (group: ShortDramaGroup) => {
    const ok = await confirm('删除小组', `将删除「${group.name || '未命名小组'}」，已有分配会保留。`)
    if (!ok) return
    await store.deleteShortDramaGroup(group.id)
    toast('小组已删除', 'success')
  }

  const handleDeleteAssignment = async (assignmentId: string) => {
    const ok = await confirm('删除分配', '将删除这条集数分配。')
    if (!ok) return
    await store.deleteShortDramaAssignment(assignmentId)
    toast('分配已删除', 'success')
  }

  const updateAssignmentStatus = async (assignmentId: string, status: ShortDramaProgressStatus) => {
    const assignment = selectedAssignments.find((item) => item.id === assignmentId)
    if (!assignment || assignment.status === status) return
    await store.saveShortDramaAssignment({
      ...assignment,
      status,
      updatedAt: now(),
    })
  }

  return (
    <div className="view-short-drama fade-in">
      <div className="view-header">
        <h1 className="view-title">短剧</h1>
        <div className="view-actions">
          <button className="btn btn-primary" type="button" onClick={() => setEditingDrama(null)}>新短剧</button>
        </div>
      </div>

      {shortDramas.length === 0 ? (
        <div className="empty-state short-drama-empty">
          <div className="empty-text">先新建一部短剧。</div>
          <button className="btn btn-primary" type="button" onClick={() => setEditingDrama(null)}>新短剧</button>
        </div>
      ) : (
        <div className="short-drama-workspace">
          <aside className="short-drama-rail">
            <div className="short-drama-rail-title">剧目</div>
            <div className="short-drama-rail-list">
              {shortDramas.map((drama) => (
                <button
                  key={drama.id}
                  className={`short-drama-rail-item${drama.id === effectiveSelectedDramaId ? ' active' : ''}`}
                  type="button"
                  onClick={() => setSelectedDramaId(drama.id)}
                >
                  <strong>{drama.title || '未命名短剧'}</strong>
                  <span>{dramaProgressLabel(drama)}</span>
                </button>
              ))}
            </div>
          </aside>

          <section className="short-drama-board">
            {selectedDrama ? (
              <>
                <div className="short-drama-board-head">
                  <div>
                    <h2>{selectedDrama.title || '未命名短剧'}</h2>
                    <div className="short-drama-board-meta">
                      <span>{SHORT_DRAMA_PROGRESS_LABELS[selectedDrama.status || 'not-started']}</span>
                      <span>{dateRangeLabel(selectedDrama.startDate, selectedDrama.endDate)}</span>
                    </div>
                  </div>
                  <div className="short-drama-board-actions">
                    <button className="btn btn-secondary btn-sm" type="button" onClick={() => setEditingDrama(selectedDrama)}>编辑</button>
                    <button className="btn btn-secondary btn-sm" type="button" onClick={() => setEditingGroup(null)}>建小组</button>
                    <button className="btn btn-primary btn-sm" type="button" onClick={() => openQuickAssignmentDialog(null)}>分配给人</button>
                    <button className="btn btn-ghost btn-sm short-drama-danger-action" type="button" onClick={() => void handleDeleteDrama()}>删除</button>
                  </div>
                </div>

                <div className="short-drama-overview-strip">
                  <span><strong>{stats.completedEpisodeCount}</strong> / {selectedDrama.totalEpisodes || stats.assignedEpisodeCount || 0} 集</span>
                  <span><strong>{stats.assignedEpisodeCount}</strong> 已分配</span>
                  <span><strong>{stats.totalActualHours}</strong> / {stats.totalEstimatedHours}h</span>
                  <span><strong>{stats.finishedDurationLabel}</strong> 成片</span>
                  <span><strong>{stats.statusCounts.revision}</strong> 返修</span>
                  <span><strong>{stats.statusCounts.review}</strong> 待审核</span>
                </div>

                {personSummaries.length > 0 ? (
                  <div className="short-drama-person-strip" aria-label="人员分配概览">
                    {personSummaries.map((person) => (
                      <button
                        key={person.id}
                        className="short-drama-person-summary"
                        type="button"
                        onClick={() => openQuickAssignmentDialog(null, person.id)}
                      >
                        <strong>{person.name}</strong>
                        <span>{person.episodeCount} 集</span>
                        <span>{person.assignmentCount} 条</span>
                        {person.reviewCount > 0 ? <em>{person.reviewCount} 待处理</em> : null}
                      </button>
                    ))}
                  </div>
                ) : null}

                {selectedGroups.length === 0 && selectedAssignments.length === 0 ? (
                  <div className="short-drama-next-step">
                    <strong>先把制作单元建起来。</strong>
                    <div className="short-drama-next-actions">
                      <button className="btn btn-secondary" type="button" onClick={() => setEditingGroup(null)}>建小组</button>
                      <button className="btn btn-primary" type="button" onClick={() => openQuickAssignmentDialog(null)}>分配给人</button>
                    </div>
                  </div>
                ) : null}

                <div className="short-drama-lanes">
                  {lanes.map((lane) => {
                    const group = lane.groupId ? selectedGroups.find((item) => item.id === lane.groupId) : null
                    return (
                      <section key={lane.groupId || 'unassigned'} className="short-drama-lane">
                        <div className="short-drama-lane-head">
                          <div>
                            <h3>{lane.groupName}</h3>
                            <div className="short-drama-lane-meta">
                              <span>{lane.memberNames}</span>
                              <span>{lane.episodeCount} 集</span>
                              <span>{lane.hourText}</span>
                            </div>
                          </div>
                          <div className="short-drama-lane-actions">
                            <button className="btn btn-secondary btn-xs" type="button" onClick={() => openQuickAssignmentDialog(lane.groupId)}>分配</button>
                            {group ? (
                              <>
                                <button className="btn btn-ghost btn-xs" type="button" onClick={() => setEditingGroup(group)}>编辑</button>
                                <button className="btn btn-ghost btn-xs short-drama-danger-action" type="button" onClick={() => void handleDeleteGroup(group)}>删除</button>
                              </>
                            ) : null}
                          </div>
                        </div>

                        {lane.cards.length === 0 ? (
                          <div className="short-drama-lane-empty">给人员分配集数。</div>
                        ) : (
                          <div className="short-drama-assignment-list">
                            {lane.cards.map((card) => (
                              <AssignmentCard
                                key={card.id}
                                assignment={selectedAssignments.find((item) => item.id === card.id)}
                                card={card}
                                onDelete={(assignmentId) => void handleDeleteAssignment(assignmentId)}
                                onEdit={(assignment) => {
                                  setEditingAssignment(assignment)
                                }}
                                onStatusChange={(assignmentId, status) => void updateAssignmentStatus(assignmentId, status)}
                              />
                            ))}
                          </div>
                        )}
                      </section>
                    )
                  })}
                </div>
              </>
            ) : null}
          </section>
        </div>
      )}

      {editingDrama !== undefined ? (
        <ShortDramaDialog drama={editingDrama} onClose={() => setEditingDrama(undefined)} />
      ) : null}
      {selectedDrama && editingGroup !== undefined ? (
        <ShortDramaGroupDialog
          dramaId={selectedDrama.id}
          group={editingGroup}
          people={people}
          onClose={() => setEditingGroup(undefined)}
        />
      ) : null}
      {selectedDrama && editingAssignment !== undefined ? (
        <ShortDramaAssignmentDialog
          assignment={editingAssignment}
          dramaId={selectedDrama.id}
          groups={selectedGroups}
          people={people}
          onClose={() => setEditingAssignment(undefined)}
        />
      ) : null}
      {selectedDrama && quickAssignmentGroupId !== undefined ? (
        <ShortDramaQuickAssignmentDialog
          assignments={selectedAssignments}
          dramaId={selectedDrama.id}
          groups={selectedGroups}
          initialGroupId={quickAssignmentGroupId}
          initialPersonId={quickAssignmentPersonId}
          people={people}
          totalEpisodes={selectedDrama.totalEpisodes}
          onClose={closeQuickAssignmentDialog}
        />
      ) : null}
    </div>
  )
}
