import { describe, expect, it, vi } from 'vitest'
import {
  buildBackupSummary,
  buildDashboardHeaderModel,
  buildDashboardMiniCalendarModel,
  buildDatePlannerModel,
  buildTaskDatePatch,
  buildCalendarEventMap,
  buildDashboardFocusCards,
  buildDashboardProjectFocusTimeline,
  buildEntityMaps,
  buildPersonCardModels,
  buildProjectCardModels,
  buildProjectEventSummaryMap,
  buildProjectTimelineModel,
  buildProjectWorkspaceItems,
  buildQuickJumpSearchItems,
  buildTaskListItemModels,
  formatRecentLogs,
  getFilteredProjects,
  getDashboardFocusData,
  getProjectEventsForDate,
  getTaskPool,
} from '../src/legacy/selectors'
import { db } from '../src/legacy/db'
import { buildProjectRecord, buildTaskRecord, updateProjectDeadline, updateProjectSchedule } from '../src/legacy/actions'
import { buildPersonDeletionPatch, store, syncTaskStatusWithAssignees } from '../src/legacy/store'
import { buildBackupPayload } from '../src/legacy/utils'

describe('store selectors', () => {
  it('builds fast lookup maps and open task counts', () => {
    const maps = buildEntityMaps(
      [{ id: 'project-1', name: '项目 A' }],
      [
        { id: 'task-1', projectId: 'project-1', assigneeId: 'person-1', status: 'todo' },
        { id: 'task-2', projectId: 'project-1', assigneeId: 'person-1', status: 'done' },
      ],
      [{ id: 'person-1', name: '张三', status: 'active' }],
    )

    expect(maps.projectsById['project-1']?.name).toBe('项目 A')
    expect(maps.peopleById['person-1']?.name).toBe('张三')
    expect(maps.tasksByProjectId['project-1']).toHaveLength(2)
    expect(maps.openTaskCountByPersonId['person-1']).toBe(1)
  })

  it('keeps dashboard task pool sorted by status, priority, and deadline', () => {
    const pool = getTaskPool([
      { id: 'task-4', title: '低优先级', status: 'todo', priority: 'low', endDate: '2026-04-20' },
      { id: 'task-3', title: '进行中', status: 'in-progress', priority: 'medium', endDate: '2026-04-18' },
      { id: 'task-2', title: '紧急', status: 'todo', priority: 'urgent', endDate: '2026-04-16' },
      { id: 'task-1', title: '已完成', status: 'done', priority: 'urgent', endDate: '2026-04-15' },
      { id: 'task-5', title: '受阻', status: 'blocked', priority: 'high', endDate: '2026-04-17' },
    ])

    expect(pool.map((task) => task.id)).toEqual(['task-5', 'task-3', 'task-2', 'task-4', 'task-1'])
  })

  it('computes dashboard focus counters from one place', () => {
    const focus = getDashboardFocusData(
      {
        id: 'project-1',
        name: '项目 A',
        status: 'active',
        ddl: '2026-04-15',
      },
      [
        { id: 'task-1', projectId: 'project-1', status: 'todo', scheduledDate: '2026-04-12', endDate: '2026-04-12' },
        { id: 'task-2', projectId: 'project-1', status: 'todo', scheduledDate: null, endDate: '2026-04-10' },
        { id: 'task-3', projectId: 'project-1', status: 'done', scheduledDate: null, endDate: '2026-04-09' },
      ],
      '2026-04-12',
    )

    expect(focus?.todayCount).toBe(1)
    expect(focus?.overdueCount).toBe(1)
    expect(focus?.remainingCount).toBe(2)
    expect(focus?.brief).toBeTruthy()
  })

  it('builds dashboard secondary focus cards from one selector', () => {
    const cards = buildDashboardFocusCards(
      [
        {
          id: 'project-0',
          name: '项目 逾期',
          status: 'active',
          ddl: '2026-04-10',
        },
        {
          id: 'project-1',
          name: '项目 A',
          status: 'active',
          ddl: '2026-04-15',
        },
        {
          id: 'project-2',
          name: '项目 B',
          status: 'active',
          ddl: '2026-04-18',
        },
        {
          id: 'project-3',
          name: '项目 C',
          status: 'active',
          ddl: '2026-04-21',
        },
        {
          id: 'project-4',
          name: '项目 D',
          status: 'active',
          ddl: '2026-04-25',
        },
        {
          id: 'project-5',
          name: '项目 E',
          status: 'active',
          ddl: '2026-05-02',
        },
      ],
      [
        { id: 'task-1', projectId: 'project-1', status: 'todo' },
        { id: 'task-2', projectId: 'project-1', status: 'done' },
        { id: 'task-3', projectId: 'project-2', status: 'in-progress' },
      ],
      '2026-04-12',
    )

    expect(cards[0]).toMatchObject({
      id: 'project-0',
      urgencyKey: 'focus-overdue',
    })
    expect(cards[1]).toMatchObject({
      id: 'project-1',
      name: '项目 A',
      openTaskCount: 1,
      urgencyKey: 'focus-critical',
    })
    expect(cards[2]).toMatchObject({
      id: 'project-2',
      openTaskCount: 1,
      urgencyKey: 'focus-strong',
    })
    expect(cards[3].urgencyKey).toBe('focus-medium')
    expect(cards[4].urgencyKey).toBe('focus-calm')
    expect(cards[5].urgencyKey).toBe('focus-neutral')
  })

  it('builds dashboard project focus as a four-row production timeline', () => {
    const timeline = buildDashboardProjectFocusTimeline(
      [
        {
          id: 'project-overdue',
          name: '竖屏短剧 A',
          status: 'active',
          priority: 'urgent',
          startDate: '2026-04-06',
          reviewDate: '2026-04-09',
          deliveryDate: '2026-04-10',
          endDate: '2026-04-10',
          ddl: '2026-04-10',
          notes: '客户等样片',
        },
        {
          id: 'project-near',
          name: '品牌片剪辑',
          status: 'active',
          priority: 'high',
          startDate: '2026-04-12',
          reviewDate: '2026-04-15',
          deliveryDate: '2026-04-18',
          endDate: '2026-04-18',
        },
        {
          id: 'project-mid',
          name: '校园纪录片',
          status: 'active',
          priority: 'medium',
          startDate: '2026-04-14',
          deliveryDate: '2026-04-24',
          ddl: '2026-04-24',
        },
        {
          id: 'project-calm',
          name: '分镜筹备',
          status: 'paused',
          priority: 'low',
          startDate: '2026-04-20',
          deliveryDate: '2026-05-08',
          ddl: '2026-05-08',
        },
        {
          id: 'project-hidden',
          name: '远期项目',
          status: 'active',
          ddl: '2026-05-20',
        },
      ],
      [
        { id: 'task-1', title: '粗剪', projectId: 'project-overdue', status: 'done', assigneeIds: ['person-1'] },
        { id: 'task-2', title: '调色', projectId: 'project-overdue', status: 'in-progress', assigneeIds: ['person-2'], endDate: '2026-04-10' },
        { id: 'task-3', title: '花字包装', projectId: 'project-near', status: 'blocked', assigneeIds: ['person-2'] },
        { id: 'task-4', title: '声音修整', projectId: 'project-near', status: 'todo', assigneeIds: ['person-3'] },
      ],
      [
        { id: 'person-1', name: '剪辑甲', status: 'active' },
        { id: 'person-2', name: '后期乙', status: 'active' },
        { id: 'person-3', name: '导演丙', status: 'active' },
      ],
      '2026-04-12',
    )

    expect(timeline.items).toHaveLength(4)
    expect(timeline.items.map((item) => item.id)).toEqual([
      'project-overdue',
      'project-near',
      'project-mid',
      'project-calm',
    ])
    // Axis is padded by 1 day on each side so bars/milestones are not edge-glued.
    expect(timeline.axisStartDate).toBe('2026-04-05')
    expect(timeline.axisEndDate).toBe('2026-05-09')
    expect(timeline.axisStartLabel).toBe('4/5')
    expect(timeline.axisEndLabel).toBe('5/9')
    expect(timeline.axisTicks.length).toBeGreaterThanOrEqual(6)
    expect(timeline.rangeDays).toBeGreaterThanOrEqual(30)
    expect(timeline.todayPercent).toBeGreaterThanOrEqual(0)
    expect(timeline.todayPercent).toBeLessThanOrEqual(100)
    expect(timeline.items[0]).toMatchObject({
      assigneeNames: ['后期乙'],
      blockedTaskCount: 0,
      doneTaskCount: 1,
      openTaskCount: 1,
      progressPercent: 50,
      progressText: '1/2',
      reviewDate: '2026-04-09',
      deliveryDate: '2026-04-10',
      phaseLabel: '逾期',
      notePreview: '客户等样片',
      urgencyKey: 'focus-overdue',
    })
    expect(timeline.items[1]).toMatchObject({
      actionKind: 'blocked',
      actionLabel: '1 项受阻',
      assigneeNames: ['后期乙', '导演丙'],
      blockedTaskCount: 1,
      phaseLabel: '审查前',
      progressText: '0/2',
    })
    expect(timeline.items[0].barStartPercent).toBeGreaterThanOrEqual(0)
    expect(timeline.items[0].barStartPercent).toBeLessThan(10)
    expect(timeline.items[0].barWidthPercent).toBeGreaterThanOrEqual(5)
    expect(timeline.items[1].reviewPercent).toBeGreaterThan(timeline.items[1].barStartPercent)
    expect(timeline.items[1].deliveryPercent).toBeGreaterThan(timeline.items[1].reviewPercent || 0)
    expect(timeline.items[0].assigneePreview).toBe('后期乙')
    expect(timeline.items[0].durationLabel).toBeTruthy()
    expect(timeline.items[0].deliveryLabel).toBeTruthy()
  })

  it('keeps blocked focus actions visible even on very short timeline bars', () => {
    const timeline = buildDashboardProjectFocusTimeline(
      [
        {
          id: 'project-blocked-short',
          name: '一分钟短片',
          status: 'active',
          startDate: '2026-04-12',
          endDate: '2026-04-12',
          deliveryDate: '2026-04-12',
        },
      ],
      [
        { id: 'task-1', title: '客户卡点确认', projectId: 'project-blocked-short', status: 'blocked' },
      ],
      [],
      '2026-04-12',
    )

    expect(timeline.items[0].actionKind).toBe('blocked')
    expect(timeline.items[0].actionLabel).toBe('1 项受阻')
    expect(timeline.items[0].barWidthPercent).toBeGreaterThanOrEqual(4)
  })

  it('migrates explicit legacy ddl into delivery date when delivery and end are empty', () => {
    const saved = buildProjectRecord({
      id: 'project-legacy',
      name: '旧项目',
      status: 'active',
      priority: 'medium',
      ddl: '2026-04-12',
      createdAt: '2026-04-01T10:00:00.000Z',
      updatedAt: '2026-04-01T10:00:00.000Z',
    }, {
      name: '旧项目',
      status: 'active',
      priority: 'medium',
      startDate: null,
      reviewDate: null,
      deliveryDate: null,
      endDate: null,
      ddl: '2026-04-30',
      description: '',
      notes: '',
    }, '2026-04-12T10:00:00.000Z')

    expect(saved).toMatchObject({
      deliveryDate: '2026-04-30',
      endDate: '2026-04-30',
      ddl: '2026-04-30',
    })
  })

  it('does not synthesize ddl from only start and review checkpoints', () => {
    const saved = buildProjectRecord(null, {
      name: '仅审查排期',
      status: 'active',
      priority: 'medium',
      startDate: '2026-04-12',
      reviewDate: '2026-04-18',
      deliveryDate: null,
      endDate: null,
      ddl: null,
      description: '',
      notes: '',
    }, '2026-04-12T10:00:00.000Z')

    expect(saved).toMatchObject({
      startDate: '2026-04-12',
      reviewDate: '2026-04-18',
      deliveryDate: null,
      endDate: '2026-04-18',
      ddl: null,
    })
  })

  it('normalizes project schedule bounds across all filled checkpoints while mirroring ddl from delivery date', () => {
    const saved = buildProjectRecord(null, {
      name: '影像交付',
      status: 'active',
      priority: 'high',
      startDate: '2026-04-22',
      reviewDate: '2026-04-18',
      deliveryDate: '2026-04-12',
      endDate: '2026-04-20',
      ddl: null,
      description: '客户主片',
      notes: '先出 30 秒样片',
    }, '2026-04-12T10:00:00.000Z')

    expect(saved).toMatchObject({
      startDate: '2026-04-12',
      reviewDate: '2026-04-18',
      deliveryDate: '2026-04-12',
      endDate: '2026-04-22',
      ddl: '2026-04-12',
      notes: '先出 30 秒样片',
    })

    const backup = buildBackupPayload({
      projects: [{
        ...saved,
        shouldDrop: true,
      }],
    })

    expect(backup.projects[0]).toMatchObject({
      startDate: '2026-04-12',
      reviewDate: '2026-04-18',
      deliveryDate: '2026-04-12',
      endDate: '2026-04-22',
      ddl: '2026-04-12',
      notes: '先出 30 秒样片',
    })
    expect(backup.projects[0]).not.toHaveProperty('shouldDrop')
  })

  it('clearing schedule delivery does not backfill a legacy ddl in saved project data', async () => {
    vi.spyOn(db, 'exportAll').mockResolvedValue(buildBackupPayload({}))
    vi.spyOn(store, 'getProject').mockReturnValue({
      id: 'project-legacy-ddl',
      name: '旧排期项目',
      status: 'active',
      priority: 'medium',
      startDate: '2026-04-12',
      reviewDate: null,
      deliveryDate: null,
      endDate: null,
      ddl: '2026-04-30',
      notes: '保留备注',
      createdAt: '2026-04-01T10:00:00.000Z',
      updatedAt: '2026-04-01T10:00:00.000Z',
    })
    const captured: { saved: unknown } = { saved: null }
    vi.spyOn(store, 'saveProject').mockImplementation(async (project) => {
      captured.saved = project
    })
    vi.spyOn(store, 'addLog').mockResolvedValue({
      id: 'log-1',
      text: '更新项目排期',
      ts: '2026-04-12T10:00:00.000Z',
    })

    await updateProjectSchedule('project-legacy-ddl', {
      startDate: '2026-04-12',
      reviewDate: '2026-04-18',
      deliveryDate: null,
      endDate: null,
      notes: '保留备注',
    })

    expect(captured.saved).toMatchObject({
      startDate: '2026-04-12',
      reviewDate: '2026-04-18',
      deliveryDate: null,
      endDate: '2026-04-18',
      ddl: null,
      notes: '保留备注',
    })
  })

  it('normalizes deadline updates against existing checkpoints when saving project data', async () => {
    vi.spyOn(db, 'exportAll').mockResolvedValue(buildBackupPayload({}))
    vi.spyOn(store, 'getProject').mockReturnValue({
      id: 'p-delay',
      name: '延后项目',
      status: 'active',
      priority: 'medium',
      startDate: '2026-05-01',
      reviewDate: '2026-05-20',
      deliveryDate: null,
      endDate: null,
      ddl: null,
      notes: '',
      createdAt: '2026-05-01T00:00:00.000Z',
      updatedAt: '2026-05-01T00:00:00.000Z',
    })
    const captured: { saved: unknown } = { saved: null }
    vi.spyOn(store, 'saveProject').mockImplementation(async (project) => {
      captured.saved = project
    })
    vi.spyOn(store, 'addLog').mockResolvedValue({
      id: 'log-1',
      text: '延期项目',
      ts: '2026-05-15T10:00:00.000Z',
    })

    await updateProjectDeadline('p-delay', '2026-05-15')

    expect(captured.saved).toMatchObject({
      id: 'p-delay',
      startDate: '2026-05-01',
      reviewDate: '2026-05-20',
      deliveryDate: '2026-05-15',
      endDate: '2026-05-20',
      ddl: '2026-05-15',
    })
  })

  it('keeps review-driven project end dates when clearing a deadline', async () => {
    vi.spyOn(db, 'exportAll').mockResolvedValue(buildBackupPayload({}))
    vi.spyOn(store, 'getProject').mockReturnValue({
      id: 'p-clear',
      name: '清空交付项目',
      status: 'active',
      priority: 'medium',
      startDate: '2026-05-01',
      reviewDate: '2026-05-20',
      deliveryDate: '2026-05-15',
      endDate: null,
      ddl: '2026-05-15',
      notes: '',
      createdAt: '2026-05-01T00:00:00.000Z',
      updatedAt: '2026-05-15T10:00:00.000Z',
    })
    const captured: { saved: unknown } = { saved: null }
    vi.spyOn(store, 'saveProject').mockImplementation(async (project) => {
      captured.saved = project
    })
    vi.spyOn(store, 'addLog').mockResolvedValue({
      id: 'log-1',
      text: '延期项目',
      ts: '2026-05-15T10:00:00.000Z',
    })

    await updateProjectDeadline('p-clear', null)

    expect(captured.saved).toMatchObject({
      id: 'p-clear',
      startDate: '2026-05-01',
      reviewDate: '2026-05-20',
      deliveryDate: null,
      endDate: '2026-05-20',
      ddl: null,
    })
  })

  it('keeps project focus timeline axis aligned with schedule dates and ignores createdAt when schedule exists', () => {
    const timeline = buildDashboardProjectFocusTimeline(
      [
        {
          id: 'project-dirty-range',
          name: '错序排期项目',
          status: 'active',
          priority: 'high',
          createdAt: '2026-04-01T00:30:00+08:00',
          reviewDate: '2026-04-18',
          deliveryDate: '2026-04-12',
          endDate: '2026-04-20',
        },
      ],
      [],
      [],
      '2026-04-12',
    )

    expect(timeline.axisStartDate).toBe('2026-04-11')
    expect(timeline.axisEndDate).toBe('2026-04-21')
    expect(timeline.items[0]?.startDate).toBe('2026-04-12')
    expect(timeline.items[0]?.endDate).toBe('2026-04-20')
    expect(timeline.items[0]?.deliveryPercent).not.toBeNull()
    expect(timeline.items[0]?.reviewPercent).not.toBeNull()
    expect(timeline.items[0]?.deliveryPercent).toBeGreaterThanOrEqual(0)
    expect(timeline.items[0]?.deliveryPercent).toBeLessThanOrEqual(100)
    expect(timeline.items[0]?.reviewPercent).toBeGreaterThanOrEqual(0)
    expect(timeline.items[0]?.reviewPercent).toBeLessThanOrEqual(100)
    expect(timeline.items[0]?.barWidthPercent).toBeGreaterThanOrEqual(4)
  })

  it('uses local createdAt as the start date when no schedule fields exist', () => {
    const timeline = buildDashboardProjectFocusTimeline(
      [
        {
          id: 'p-created',
          name: '旧项目',
          createdAt: new Date(2026, 3, 20, 0, 30).toISOString(),
        },
      ],
      [],
      [],
      '2026-04-12',
    )

    expect(timeline.axisStartDate).toBe('2026-04-19')
    expect(timeline.items[0]?.startDate).toBe('2026-04-20')
    expect(timeline.items[0]?.endDate).toBe('2026-05-04')
    expect(timeline.axisEndDate).toBe('2026-05-05')
  })

  it('falls back to today when no createdAt exists', () => {
    const timeline = buildDashboardProjectFocusTimeline(
      [
        {
          id: 'p-today',
          name: '今天项目',
        },
      ],
      [],
      [],
      '2026-04-12',
    )

    expect(timeline.axisStartDate).toBe('2026-04-11')
  })

  it('falls back to local createdAt plus 14 days only when no schedule fields exist', () => {
    const timeline = buildDashboardProjectFocusTimeline(
      [
        {
          id: 'project-created-at-fallback',
          name: '仅创建时间项目',
          status: 'active',
          priority: 'medium',
          createdAt: new Date(2026, 3, 1, 0, 30).toISOString(),
        },
      ],
      [],
      [],
      '2026-04-12',
    )

    expect(timeline.axisStartDate).toBe('2026-03-31')
    expect(timeline.axisEndDate).toBe('2026-04-16')
    expect(timeline.items[0]).toMatchObject({
      startDate: '2026-04-01',
      endDate: '2026-04-15',
    })
  })

  it('builds dashboard header copy from one model selector', () => {
    const header = buildDashboardHeaderModel(
      new Date('2026-04-12T10:00:00+08:00'),
    )

    expect(header).toEqual({
      dateText: '4月12日',
      weekdayText: '2026 · 星期日',
    })
  })

  it('keeps present people at the front and leave people at the end regardless of custom order', () => {
    const models = buildPersonCardModels(
      [
        { id: 'person-1', name: '阿青', gender: 'female', status: 'active', skills: ['排版'] },
        { id: 'person-2', name: '白杨', gender: 'male', status: 'active', skills: ['拍摄'] },
        { id: 'person-3', name: '程野', gender: 'other', status: 'active', skills: ['剪辑'] },
      ],
      [
        { id: 'task-1', title: '棚拍现场执行', assigneeIds: ['person-2'], status: 'in-progress' },
      ],
      new Set(['person-2']),
      {
        order: ['person-2', 'person-3', 'person-1'],
        presenceByPersonId: {
          'person-1': 'present',
          'person-2': 'present',
        },
      },
    )

    expect(models.map((item) => item.id)).toEqual(['person-1', 'person-3', 'person-2'])
    expect(models[0]).toMatchObject({
      id: 'person-1',
      isOnLeaveToday: false,
      isPresent: true,
    })
    expect(models[2]).toMatchObject({
      id: 'person-2',
      isOnLeaveToday: true,
      isPresent: false,
      topInProgressTaskLabel: '棚拍现场执行',
    })
  })

  it('builds dashboard mini calendar cells with workload and event flags from one selector', () => {
    const model = buildDashboardMiniCalendarModel(
      new Date('2026-04-12T10:00:00+08:00'),
      {
        '2026-04-12': {
          ddls: [{ label: '检查点', toneKey: 'focus-calm' }],
          hasDdl: true,
          markerKind: 'ddl',
          markerTone: 'focus-calm',
          urgent: false,
        },
        '2026-04-18': {
          ddls: [{ label: '毕业设计', toneKey: 'focus-critical' }],
          hasDdl: true,
          markerKind: 'ddl',
          markerTone: 'focus-critical',
          urgent: true,
        },
      },
      '2026-04-12',
      new Set(['2026-04-18']),
      [
        { id: 'task-1', title: '当天拍摄', scheduledDate: '2026-04-12', status: 'todo', estimatedHours: 2 },
        { id: 'task-2', title: '跨日剪辑', startDate: '2026-04-11', endDate: '2026-04-13', status: 'in-progress', estimatedHours: 4 },
        { id: 'task-3', title: '已完成', scheduledDate: '2026-04-12', status: 'done', estimatedHours: 8 },
      ],
    )

    expect(model.title).toBe('2026 · 四月')
    expect(model.weekdays).toEqual(['日', '一', '二', '三', '四', '五', '六'])

    const todayCell = model.days.find((day) => day.dateKey === '2026-04-12')
    expect(todayCell).toMatchObject({
      dateKey: '2026-04-12',
      dayOfMonth: 12,
      hasEvents: true,
      hasUrgent: true,
      isOtherMonth: false,
      isToday: true,
      markerKind: 'ddl',
      markerTone: 'focus-calm',
      taskCount: 2,
      workloadLevel: 'medium',
    })

    const urgentCell = model.days.find((day) => day.dateKey === '2026-04-18')
    expect(urgentCell).toMatchObject({
      hasEvents: true,
      hasUrgent: true,
      markerKind: 'ddl',
      markerTone: 'focus-critical',
    })
  })

  it('builds date planner tasks from scheduled and active date ranges', () => {
    const model = buildDatePlannerModel(
      '2026-04-12',
      [
        { id: 'project-1', name: '短片', ddl: '2026-04-14' },
      ],
      [
        { id: 'task-1', title: '当天拍摄', scheduledDate: '2026-04-12', status: 'todo', priority: 'medium', estimatedHours: 2 },
        { id: 'task-2', title: '跨日剪辑', startDate: '2026-04-10', endDate: '2026-04-15', status: 'in-progress', priority: 'high', estimatedHours: 4, projectId: 'project-1' },
        { id: 'task-3', title: '今日截止', endDate: '2026-04-12', status: 'todo', priority: 'urgent', estimatedHours: 1 },
        { id: 'task-4', title: '已完成跨日', startDate: '2026-04-10', endDate: '2026-04-15', status: 'done', priority: 'urgent' },
      ],
      [{ id: 'person-1', name: '张三', status: 'active' }],
      [],
      '2026-04-12',
    )

    expect(model.tasks.map((task) => task.id)).toEqual(['task-3', 'task-2', 'task-1'])
    expect(model.urgentTasks.map((task) => task.id)).toEqual(['task-3', 'task-2'])
    expect(model.summary).toMatchObject({
      dueCount: 1,
      taskCount: 3,
      totalHours: 7,
    })
  })

  it('shows in-progress tasks before their deadline even without a start date', () => {
    const model = buildDatePlannerModel(
      '2026-04-08',
      [],
      [
        { id: 'task-1', title: '10号截止任务', endDate: '2026-04-10', status: 'in-progress', priority: 'high', estimatedHours: 3 },
        { id: 'task-2', title: '未开始远期任务', endDate: '2026-04-10', status: 'todo', priority: 'medium' },
      ],
      [],
      [],
      '2026-04-08',
    )

    expect(model.tasks.map((task) => task.id)).toEqual(['task-1'])
    expect(model.tasks[0]).toMatchObject({
      dateText: '2026/4/10',
      dueInDays: 2,
      title: '10号截止任务',
    })
  })

  it('separates active task count from actual deadline markers in mini calendar', () => {
    const model = buildDashboardMiniCalendarModel(
      new Date('2026-04-01T10:00:00+08:00'),
      {},
      '2026-04-08',
      new Set(),
      [
        { id: 'task-1', title: '10号截止任务', endDate: '2026-04-10', status: 'in-progress', priority: 'high' },
      ],
    )

    expect(model.days.find((day) => day.dateKey === '2026-04-08')).toMatchObject({
      deadlineKind: '',
      hasDeadline: false,
      taskCount: 1,
    })
    expect(model.days.find((day) => day.dateKey === '2026-04-10')).toMatchObject({
      deadlineKind: 'task',
      hasDeadline: true,
      taskCount: 1,
    })
  })

  it('moves task date while preserving its duration', () => {
    expect(buildTaskDatePatch({
      id: 'task-1',
      title: '跨日任务',
      startDate: '2026-04-10',
      endDate: '2026-04-12',
      scheduledDate: '2026-04-10',
    }, '2026-05-02')).toEqual({
      startDate: '2026-05-02',
      endDate: '2026-05-04',
      scheduledDate: '2026-05-02',
    })

    expect(buildTaskDatePatch({ id: 'task-2', title: '未排期' }, '2026-05-02')).toEqual({
      startDate: '2026-05-02',
      endDate: '2026-05-02',
      scheduledDate: '2026-05-02',
    })
  })

  it('builds calendar events from project ddl in one place', () => {
    const eventMap = buildCalendarEventMap([
      {
        id: 'project-1',
        name: '中期汇报',
        ddl: '2026-04-14',
      },
      {
        id: 'project-2',
        name: '毕业设计',
        ddl: '2026-04-18',
      },
    ])

    expect(eventMap['2026-04-14']).toEqual({
      ddls: ['中期汇报'],
    })
    expect(eventMap['2026-04-18']).toEqual({
      ddls: ['毕业设计'],
    })
  })

  it('builds one event summary map for dashboard markers and planner details', () => {
    const eventMap = buildProjectEventSummaryMap([
      {
        id: 'project-1',
        name: '毕业设计',
        status: 'active',
        ddl: '2026-04-18',
      },
      {
        id: 'project-2',
        name: '旧项目',
        status: 'active',
        ddl: '2026-04-10',
      },
    ], '2026-04-12')

    expect(eventMap['2026-04-18']).toEqual({
      ddls: [{ label: '毕业设计', toneKey: 'focus-critical' }],
      hasDdl: true,
      markerKind: 'ddl',
      markerTone: 'focus-critical',
      urgent: false,
    })
    expect(eventMap['2026-04-10']?.urgent).toBe(true)
    expect(eventMap['2026-04-10']?.markerTone).toBe('focus-overdue')
  })

  it('builds planner event rows from the same event summary map', () => {
    const eventMap = buildProjectEventSummaryMap([
      {
        id: 'project-1',
        name: '毕业设计',
        status: 'active',
        ddl: '2026-04-18',
      },
    ], '2026-04-12')

    expect(getProjectEventsForDate(eventMap, '2026-04-18')).toEqual([
      { label: 'DDL · 毕业设计', toneKey: 'focus-critical', type: 'ddl' },
    ])
  })

  it('builds project timeline rows using local calendar dates instead of UTC parsing', () => {
    const timeline = buildProjectTimelineModel([
      {
        id: 'project-1',
        name: '答辩周',
        createdAt: '2026-04-12T00:30:00+08:00',
        ddl: '2026-04-15',
      },
      {
        id: 'project-2',
        name: '中期项目',
        createdAt: '2026-04-11T00:30:00+08:00',
        ddl: '2026-04-18',
      },
    ], 14, undefined, '2026-04-12')

    expect(timeline.startDate).toBe('2026-04-01')
    expect(timeline.rows[0]).toMatchObject({
      id: 'project-1',
      offsetDays: 14,
      durationDays: 1,
      startDate: '2026-04-15',
      endDate: '2026-04-15',
      urgencyKey: 'focus-critical',
    })
    expect(timeline.rows[1]).toMatchObject({
      startDate: '2026-04-18',
      endDate: '2026-04-18',
    })
    expect(timeline.rows[1].urgencyKey).toBe('focus-strong')
    expect(timeline.todayOffsetDays).toBe(11)

    const outsideRange = buildProjectTimelineModel([
      {
        id: 'project-1',
        name: '答辩周',
        createdAt: '2026-04-12T00:30:00+08:00',
        ddl: '2026-04-15',
      },
    ], 14, undefined, '2026-05-12')

    expect(outsideRange.todayOffsetDays).toBeNull()
  })

  it('builds project card models with progress summary', () => {
    const cards = buildProjectCardModels(
      [
        {
          id: 'project-1',
          name: '毕业设计',
          description: '终稿与答辩',
          status: 'active',
          priority: 'urgent',
          ddl: '2026-04-18',
        },
        {
          id: 'project-2',
          name: '宣发收尾',
          description: '收尾阶段',
          status: 'active',
          priority: 'high',
          ddl: '2026-04-22',
        },
      ],
      [
        { id: 'task-1', projectId: 'project-1', status: 'todo' },
        { id: 'task-2', projectId: 'project-1', status: 'done' },
      ],
      '2026-04-12',
    )

    expect(cards[0]).toMatchObject({
      doneCount: 1,
      taskCount: 2,
      name: '毕业设计',
      statusLabel: '进行中',
      priorityLabel: '紧急',
      urgencyKey: 'focus-critical',
    })
    expect(cards[1].urgencyKey).toBe('focus-strong')
  })

  it('groups project workspace items by real delivery risk and next action', () => {
    const items = buildProjectWorkspaceItems(
      [
        { id: 'project-risk', name: '受阻项目', status: 'active', priority: 'urgent', deliveryDate: '2026-04-18' },
        { id: 'project-progress', name: '推进项目', status: 'active', priority: 'high', deliveryDate: '2026-04-22' },
        { id: 'project-plan', name: '待安排项目', status: 'active', priority: 'medium' },
        { id: 'project-done', name: '归档项目', status: 'completed', priority: 'low', deliveryDate: '2026-04-10' },
      ],
      [
        { id: 'task-blocked', projectId: 'project-risk', title: '确认成片规格', status: 'blocked', endDate: '2026-04-14' },
        { id: 'task-progress', projectId: 'project-progress', title: '合成终版', status: 'in-progress', endDate: '2026-04-20' },
        { id: 'task-plan', projectId: 'project-plan', title: '分配剪辑', status: 'todo' },
        { id: 'task-done', projectId: 'project-done', title: '交付归档', status: 'done' },
      ],
      '2026-04-12',
    )

    expect(items.map((item) => [item.id, item.groupKey])).toEqual([
      ['project-risk', 'attention'],
      ['project-progress', 'progressing'],
      ['project-plan', 'planning'],
      ['project-done', 'finished'],
    ])
    expect(items[0]).toMatchObject({
      blockedTaskCount: 1,
      nextActionLabel: '处理受阻：确认成片规格',
      openTaskCount: 1,
      progressPercent: 0,
    })
    expect(items[1].nextActionLabel).toBe('继续推进：合成终版')
    expect(items[2].nextActionLabel).toBe('分配任务：分配剪辑')
    expect(items[3].nextActionLabel).toBe('查看复盘与归档')
  })

  it('sorts project lists by the shared deadline tone order', () => {
    const items = getFilteredProjects(
      [
        { id: 'project-1', name: '远期项目', status: 'active', ddl: '2026-05-02' },
        { id: 'project-2', name: '最近项目', status: 'active', ddl: '2026-04-15' },
        { id: 'project-3', name: '逾期项目', status: 'active', ddl: '2026-04-10' },
        { id: 'project-4', name: '较近项目', status: 'active', ddl: '2026-04-18' },
      ],
      '',
      '',
      '2026-04-12',
    )

    expect(items.map((item) => item.id)).toEqual(['project-3', 'project-2', 'project-4', 'project-1'])
  })

  it('builds task list item models with resolved project and assignee labels', () => {
    const items = buildTaskListItemModels(
      [
        {
          id: 'task-1',
          title: '整理答辩稿',
          projectId: 'project-1',
          assigneeId: 'person-1',
          priority: 'high',
          status: 'todo',
          endDate: '2026-04-11',
          estimatedHours: 3,
        },
      ],
      [{ id: 'project-1', name: '毕业设计' }],
      [{ id: 'person-1', name: '张三', status: 'active' }],
      '2026-04-12',
    )

    expect(items[0]).toMatchObject({
      assigneeNames: ['张三'],
      dateText: '逾期 2026/4/11',
      estimatedHoursText: '3h',
      isDone: false,
      isOverdue: true,
      priorityLabel: '高',
      projectName: '毕业设计',
      statusLabel: '待处理',
      title: '整理答辩稿',
    })
  })

  it('builds person card models with task counts and note preview', () => {
    const items = buildPersonCardModels(
      [
        {
          id: 'person-1',
          name: '李四',
          status: 'inactive',
          gender: 'female',
          skills: ['剪辑', '动画'],
          notes: '负责视频包装与字幕校对',
        },
      ],
      [
        { id: 'task-1', assigneeId: 'person-1', status: 'todo' },
        { id: 'task-2', assigneeId: 'person-1', status: 'done' },
      ],
    )

    expect(items[0]).toMatchObject({
      genderLabel: '女',
      isInactive: true,
      name: '李四',
      notePreview: '备注: 负责视频包装与字幕校对',
      statusLabel: '已停用',
      taskCount: 1,
    })
    expect(items[0].skills).toEqual(['剪辑', '动画'])
  })

  it('builds quick jump search results across project, task, and person', () => {
    const items = buildQuickJumpSearchItems(
      [
        { id: 'project-1', name: '品牌宣传片', status: 'active', ddl: '2026-04-18' },
      ],
      [
        { id: 'task-1', title: '宣传片音效混音', projectId: 'project-1', assigneeId: 'person-1' },
      ],
      [
        { id: 'person-1', name: '陈佳宁', skills: ['视频剪辑', 'After Effects'] },
      ],
      '宣传片',
      8,
    )

    expect(items[0]).toMatchObject({
      id: 'task-1',
      kind: 'task',
      title: '宣传片音效混音',
    })
    expect(items.some((item) => item.id === 'project-1' && item.kind === 'project')).toBe(true)
  })

  it('returns empty quick jump results for blank query', () => {
    expect(buildQuickJumpSearchItems([], [], [], '   ')).toEqual([])
  })

  it('summarizes backup payload counts for import and export feedback', () => {
    const summary = buildBackupSummary({
      projects: [{ id: 'project-1' }],
      tasks: [{ id: 'task-1' }, { id: 'task-2' }],
      people: [{ id: 'person-1' }],
      logs: [{ id: 'log-1' }, { id: 'log-2' }, { id: 'log-3' }],
      settings: [{ key: 'theme', value: 'light' }],
      leaveRecords: [{ id: 'leave-1' }],
      classSchedules: [{ id: 'schedule-1' }],
      shortDramas: [{ id: 'drama-1' }],
      shortDramaGroups: [{ id: 'group-1' }, { id: 'group-2' }],
      shortDramaAssignments: [{ id: 'assignment-1' }],
    })

    expect(summary).toEqual({
      classScheduleCount: 1,
      shortDramaAssignmentCount: 1,
      shortDramaCount: 1,
      shortDramaGroupCount: 2,
      projectCount: 1,
      taskCount: 2,
      personCount: 1,
      logCount: 3,
      settingsCount: 1,
      leaveRecordCount: 1,
    })
  })

  it('formats recent logs into readable date and time tokens', () => {
    const items = formatRecentLogs([
      {
        id: 'log-1',
        text: '导出备份',
        ts: new Date(2026, 3, 12, 8, 5).toISOString(),
      },
    ])

    expect(items[0]).toEqual({
      id: 'log-1',
      text: '导出备份',
      date: '4/12',
      time: '08:05',
    })
  })

  it('derives project delivery dates from the edited form schedule only', () => {
    const legacyProject = { id: 'legacy', name: '旧项目', ddl: '2026-04-30' }

    const savedWithEndDate = buildProjectRecord(legacyProject, {
      name: '旧项目',
      status: null,
      priority: null,
      startDate: null,
      endDate: '2026-04-20',
      reviewDate: null,
      deliveryDate: null,
      ddl: '2026-04-30',
      description: '',
      notes: '',
    }, '2026-04-12T10:00:00+08:00')

    expect(savedWithEndDate.deliveryDate).toBeNull()
    expect(savedWithEndDate.ddl).toBe('2026-04-20')

    const savedWithoutEndDate = buildProjectRecord(legacyProject, {
      name: '旧项目',
      status: null,
      priority: null,
      startDate: null,
      endDate: null,
      reviewDate: null,
      deliveryDate: null,
      ddl: '2026-04-30',
      description: '',
      notes: '',
    }, '2026-04-12T10:00:00+08:00')

    expect(savedWithoutEndDate.deliveryDate).toBe('2026-04-30')
    expect(savedWithoutEndDate.ddl).toBe('2026-04-30')
  })

  it('builds task records with strict defaults from form input', () => {
    const task = buildTaskRecord(null, {
      title: '  继续排期  ',
      projectId: null,
      status: null,
      priority: null,
      assigneeIds: [],
      scheduledDate: null,
      startDate: null,
      endDate: null,
      estimatedHours: null,
      description: '',
    }, '2026-04-12T10:00:00+08:00')

    expect(task).toMatchObject({
      title: '继续排期',
      status: 'todo',
      priority: 'medium',
      description: '',
      createdAt: '2026-04-12T10:00:00+08:00',
      updatedAt: '2026-04-12T10:00:00+08:00',
    })
  })

  it('auto switches task status when assignee count crosses zero', () => {
    const assigned = syncTaskStatusWithAssignees(
      { id: 'task-1', title: '任务 A', status: 'todo', assigneeIds: [] },
      { id: 'task-1', title: '任务 A', status: 'todo', assigneeIds: ['person-1'] },
    )
    const unassigned = syncTaskStatusWithAssignees(
      { id: 'task-1', title: '任务 A', status: 'in-progress', assigneeIds: ['person-1'] },
      { id: 'task-1', title: '任务 A', status: 'in-progress', assigneeIds: [] },
    )

    expect(assigned.status).toBe('in-progress')
    expect(unassigned.status).toBe('todo')
  })

  it('keeps explicit status edits when task form changes assignees', () => {
    const task = buildTaskRecord({
      id: 'task-1',
      title: '已有任务',
      status: 'todo',
      priority: 'medium',
      assigneeIds: [],
      createdAt: '2026-04-12T10:00:00+08:00',
      updatedAt: '2026-04-12T10:00:00+08:00',
    }, {
      title: '已有任务',
      projectId: null,
      status: 'blocked',
      priority: 'medium',
      assigneeIds: ['person-1'],
      scheduledDate: null,
      startDate: null,
      endDate: null,
      estimatedHours: null,
      description: '',
    }, '2026-04-12T12:00:00+08:00')

    expect(task.status).toBe('blocked')
  })

  it('defaults new assigned tasks to in-progress when status is untouched', () => {
    const task = buildTaskRecord(null, {
      title: '  分配后启动  ',
      projectId: null,
      status: 'todo',
      priority: 'medium',
      assigneeIds: ['person-1'],
      scheduledDate: null,
      startDate: null,
      endDate: null,
      estimatedHours: null,
      description: '',
    }, '2026-04-12T10:00:00+08:00')

    expect(task.status).toBe('in-progress')
  })

  it('plans person deletion cleanup across tasks, leave records, and class schedules', () => {
    const patch = buildPersonDeletionPatch(
      'person-1',
      [
        { id: 'task-1', title: '剪辑', status: 'in-progress', assigneeIds: ['person-1', 'person-2'] },
        { id: 'task-2', title: '排版', status: 'in-progress', assigneeIds: ['person-1'] },
        { id: 'task-3', title: '拍摄', status: 'todo', assigneeIds: ['person-2'] },
      ],
      [
        { id: 'leave-1', personId: 'person-1', date: '2026-04-24' },
        { id: 'leave-2', personId: 'person-2', date: '2026-04-24' },
      ],
      [
        { id: 'schedule-1', personId: 'person-1', personName: '陈怡盈', courseName: '动画基础', dayOfWeek: 1, startSection: 1, endSection: 2, weeksText: '1-8周' },
        { id: 'schedule-2', personId: 'person-2', personName: '李知行', courseName: '摄影', dayOfWeek: 2, startSection: 3, endSection: 4, weeksText: '1-16周' },
      ],
    )

    expect(patch.updatedTasks).toEqual([
      expect.objectContaining({ id: 'task-1', assigneeIds: ['person-2'], status: 'in-progress' }),
      expect.objectContaining({ id: 'task-2', assigneeIds: [], status: 'todo' }),
    ])
    expect(patch.nextTasks.find((task) => task.id === 'task-2')).toMatchObject({ assigneeIds: [], status: 'todo' })
    expect(patch.leaveRecordIds).toEqual(['leave-1'])
    expect(patch.classScheduleIds).toEqual(['schedule-1'])
  })
})
