import { describe, expect, it } from 'vitest'
import {
  buildBackupSummary,
  buildDashboardHeaderModel,
  buildDashboardMiniCalendarModel,
  buildCalendarEventMap,
  buildDashboardFocusCards,
  buildEntityMaps,
  buildPersonCardModels,
  buildProjectCardModels,
  buildProjectEventSummaryMap,
  buildProjectTimelineModel,
  buildQuickJumpSearchItems,
  buildTaskListItemModels,
  formatRecentLogs,
  getFilteredProjects,
  getDashboardFocusData,
  getProjectEventsForDate,
  getTaskPool,
} from '../src/legacy/selectors'
import { buildTaskRecord } from '../src/legacy/actions'
import { buildPersonDeletionPatch, syncTaskStatusWithAssignees } from '../src/legacy/store'

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

  it('builds dashboard mini calendar cells and event flags from one selector', () => {
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
    )

    expect(model.title).toBe('2026 · 四月')
    expect(model.weekdays).toEqual(['日', '一', '二', '三', '四', '五', '六'])

    const todayCell = model.days.find((day) => day.dateKey === '2026-04-12')
    expect(todayCell).toMatchObject({
      dateKey: '2026-04-12',
      dayOfMonth: 12,
      hasEvents: true,
      hasUrgent: false,
      isOtherMonth: false,
      isToday: true,
      markerKind: 'ddl',
      markerTone: 'focus-calm',
    })

    const urgentCell = model.days.find((day) => day.dateKey === '2026-04-18')
    expect(urgentCell).toMatchObject({
      hasEvents: true,
      hasUrgent: true,
      markerKind: 'ddl',
      markerTone: 'focus-critical',
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
      offsetDays: 11,
      durationDays: 3,
      startDate: '2026-04-12',
      endDate: '2026-04-15',
      urgencyKey: 'focus-critical',
    })
    expect(timeline.rows[1].urgencyKey).toBe('focus-strong')
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
    })

    expect(summary).toEqual({
      classScheduleCount: 1,
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
        ts: '2026-04-12T08:05:00+08:00',
      },
    ])

    expect(items[0]).toEqual({
      id: 'log-1',
      text: '导出备份',
      date: '4/12',
      time: '08:05',
    })
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
