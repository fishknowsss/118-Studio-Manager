import { describe, expect, it } from 'vitest'
import {
  buildShortDramaAssignmentDefaults,
  buildShortDramaAssignmentRows,
  buildShortDramaGroupLanes,
  buildShortDramaStats,
  formatDurationSeconds,
} from '../src/features/short-drama/shortDramaModels'
import type { LegacyPerson, ShortDrama, ShortDramaAssignment, ShortDramaGroup } from '../src/legacy/store'

describe('short drama models', () => {
  const drama: ShortDrama = {
    id: 'drama-1',
    title: '夜色之后',
    totalEpisodes: 8,
    status: 'in-progress',
  }
  const groups: ShortDramaGroup[] = [
    {
      id: 'group-1',
      dramaId: 'drama-1',
      name: 'A组',
      memberIds: ['person-1', 'person-2'],
      leaderId: 'person-1',
    },
  ]
  const people: LegacyPerson[] = [
    { id: 'person-1', name: '张三' },
    { id: 'person-2', name: '李四' },
    { id: 'person-3', name: '王五' },
  ]
  const assignments: ShortDramaAssignment[] = [
    {
      id: 'assignment-1',
      dramaId: 'drama-1',
      groupId: 'group-1',
      episodes: '1-5',
      producerIds: ['person-1', 'person-2'],
      ownerId: 'person-1',
      status: 'done',
      estimatedHours: 30,
      actualHours: 24,
      finishedDurationSeconds: 400,
      allocations: [
        { personId: 'person-1', episodes: '1-2', estimatedHours: 12, actualHours: 10 },
        { personId: 'person-2', episodes: '3-5', estimatedHours: 18, actualHours: 14 },
      ],
    },
    {
      id: 'assignment-2',
      dramaId: 'drama-1',
      groupId: 'group-1',
      episodes: '6-8',
      producerIds: ['person-3'],
      ownerId: 'person-2',
      status: 'revision',
      estimatedHours: 18,
      actualHours: 6,
      finishedDurationSeconds: null,
      allocations: [],
    },
    {
      id: 'assignment-3',
      dramaId: 'drama-2',
      groupId: null,
      episodes: '1',
      producerIds: ['person-3'],
      ownerId: 'person-3',
      status: 'done',
      estimatedHours: 3,
      actualHours: 3,
      finishedDurationSeconds: 90,
      allocations: [],
    },
  ]

  it('summarizes selected drama progress without counting other dramas', () => {
    const stats = buildShortDramaStats(drama, assignments)

    expect(stats.assignedEpisodeCount).toBe(8)
    expect(stats.completedEpisodeCount).toBe(5)
    expect(stats.totalEstimatedHours).toBe(48)
    expect(stats.totalActualHours).toBe(30)
    expect(stats.finishedDurationLabel).toBe('6:40')
    expect(stats.statusCounts).toEqual({
      'not-started': 0,
      'in-progress': 0,
      review: 0,
      revision: 1,
      done: 1,
    })
  })

  it('builds assignment rows with group, producer, owner, and duration labels', () => {
    const rows = buildShortDramaAssignmentRows(assignments, groups, people, 'drama-1')

    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({
      id: 'assignment-1',
      episodes: '1-5',
      groupName: 'A组',
      producerNames: '张三、李四',
      ownerName: '张三',
      statusLabel: '已完成',
      hoursText: '24 / 30h',
      durationText: '6:40',
    })
    expect(rows[1]).toMatchObject({
      id: 'assignment-2',
      producerNames: '王五',
      ownerName: '李四',
      statusLabel: '返修',
      durationText: '—',
    })
  })

  it('groups assignment cards into simple production lanes', () => {
    const lanes = buildShortDramaGroupLanes(assignments, groups, people, 'drama-1')

    expect(lanes).toHaveLength(1)
    expect(lanes[0]).toMatchObject({
      assignmentCount: 2,
      episodeCount: 8,
      groupId: 'group-1',
      groupName: 'A组',
      hourText: '30 / 48h',
      memberNames: '张三、李四',
    })
    expect(lanes[0].cards[0]).toMatchObject({
      id: 'assignment-1',
      episodes: '1-5',
      title: '1-5 集',
      ownerName: '张三',
      producerNames: '张三、李四',
      statusLabel: '已完成',
    })
  })

  it('reuses group and previous assignment defaults for quick assignment', () => {
    const defaults = buildShortDramaAssignmentDefaults({
      assignments,
      dramaId: 'drama-1',
      groupId: 'group-1',
      groups,
    })

    expect(defaults).toMatchObject({
      estimatedHours: 18,
      groupId: 'group-1',
      ownerId: 'person-2',
      producerIds: ['person-3'],
      status: 'revision',
    })
    expect(defaults.allocations).toEqual([{ personId: 'person-3' }])
  })

  it('falls back to group members when there is no previous assignment', () => {
    const defaults = buildShortDramaAssignmentDefaults({
      assignments: [],
      dramaId: 'drama-1',
      groupId: 'group-1',
      groups,
    })

    expect(defaults).toMatchObject({
      estimatedHours: null,
      groupId: 'group-1',
      ownerId: 'person-1',
      producerIds: ['person-1', 'person-2'],
      status: 'not-started',
    })
    expect(defaults.allocations).toEqual([{ personId: 'person-1' }, { personId: 'person-2' }])
  })

  it('formats finished durations as minutes and seconds', () => {
    expect(formatDurationSeconds(65)).toBe('1:05')
    expect(formatDurationSeconds(0)).toBe('—')
    expect(formatDurationSeconds(null)).toBe('—')
  })
})
