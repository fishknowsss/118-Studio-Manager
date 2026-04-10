import { useEffect, useRef, useState, type ChangeEvent, type DragEvent, type ReactNode } from 'react'
import dayjs, { type Dayjs } from 'dayjs'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { Badge } from '../components/Badge'
import { Modal } from '../components/Modal'
import { FormField } from '../components/FormField'
import { inputClass, selectClass, textareaClass } from '../components/formFieldClasses'
import { useSettings } from '../hooks/useSettings'
import { useProjects } from '../hooks/useProjects'
import { useTasks } from '../hooks/useTasks'
import { usePeople } from '../hooks/usePeople'
import { useMilestones } from '../hooks/useMilestones'
import { useAssignments } from '../hooks/useAssignments'
import { MILESTONE_TYPE_COLORS, MILESTONE_TYPE_LABELS, PRIORITY_COLORS, PRIORITY_LABELS, PROJECT_STATUS_COLORS, PROJECT_STATUS_LABELS, TASK_STATUS_COLORS, TASK_STATUS_LABELS } from '../constants'
import { daysUntil, formatDateFull, formatDateTime, today } from '../utils/date'
import { downloadJSON, exportFullJSON, importFullJSON, parseImportFile, type ImportSummary } from '../services/backupService'
import type { ProjectInput, ProjectPriority, ProjectStatus } from '../types/project'
import type { TaskInput, TaskPriority, TaskStatus } from '../types/task'
import type { PersonGender, PersonInput } from '../types/person'
import type { MilestoneInput, MilestoneType } from '../types/milestone'

type DragPayload =
  | { type: 'task'; taskId: string }
  | { type: 'person'; personId: string }

const QUOTE_LIBRARY = [
  {
    quote: '重要的不是喧闹，而是让作品自己发声。',
    author: '福楼拜意涵',
    prompt: '今天把讨论收束成清晰结果，让产出替我们说话。',
  },
  {
    quote: '把注意力放回此刻，秩序会一点点长出来。',
    author: '斯多葛意涵',
    prompt: '先完成最卡脖子的节点，再处理零散沟通。',
  },
  {
    quote: '伟大的风格，来自持续而克制的选择。',
    author: '加缪意涵',
    prompt: '今天所有画面和节奏，只保留真正必要的表达。',
  },
  {
    quote: '不要急着证明自己，先把手上的事做深。',
    author: '里尔克意涵',
    prompt: '让专注代替焦虑，把半成品推进到能被看见的程度。',
  },
  {
    quote: '真正的清醒，是在繁忙里还知道轻重。',
    author: '蒙田意涵',
    prompt: '优先级先行，别让临时消息带走整天节奏。',
  },
]

const PROJECT_COLORS = ['#4166F5', '#39C5BB', '#F5A623', '#4CAF50', '#797', '#E54D4D']
const DASHBOARD_UI = {
  pagePadding: 14,
  gap: 9,
  topRowHeight: 185,
  midRowHeight: 212,
  topColumns: 'minmax(0, 0.7fr) minmax(0, 1.6fr) minmax(0, 0.89fr)',
  midColumns: 'minmax(0, 1.15fr) minmax(0, 0.85fr)',
  bottomColumns: 'minmax(0, 7fr) minmax(0, 3fr)',
  bottomInnerColumns: 'minmax(0, 0.8fr) minmax(0, 1.22fr)',
  outerRadius: 18,
  innerRadius: 12,
  panelPadding: 16,
  cardPadding: 9,
  titleSize: 24,
  subtitleSize: 12,
  bodySize: 14,
  microSize: 13,
  dateSize: 45,
  quoteSize: 24,
  cardTitleSize: 14,
  taskCardHeight: 124,
  personCardHeight: 190,
  calendarNumberSize: 13,
  calendarMarkerSize: 9,
  calendarGap: 4,
  calendarCellRadius: 9,
  panelShadow: '0 20px 45px -11px rgba(42, 63, 125, 0.17)',
  panelBorder: '1px solid #c2d6ff',
  softSurface: 'rgba(250, 251, 255, 0.82)',
  softSurfaceAlt: 'rgba(255, 255, 255, 0.8)',
  darkSurface: '#35437e',
}

const DASHBOARD_CANVAS = {
  width: 1440,
  height: 900,
  viewportPadding: 12,
}

function hashDate(date: string) {
  return Array.from(date).reduce((total, char) => total + char.charCodeAt(0), 0)
}

function getQuotesForDate(date: string) {
  const start = hashDate(date) % QUOTE_LIBRARY.length
  return [QUOTE_LIBRARY[start], QUOTE_LIBRARY[(start + 1) % QUOTE_LIBRARY.length]]
}

function getGenderLabel(gender?: PersonGender) {
  switch (gender) {
    case 'male':
      return '男'
    case 'female':
      return '女'
    default:
      return '未设'
  }
}

function getGenderClass(gender?: PersonGender) {
  switch (gender) {
    case 'male':
      return 'bg-primary/10 text-primary'
    case 'female':
      return 'bg-danger/10 text-danger'
    default:
      return 'bg-gray-100 text-text-secondary'
  }
}

function readDragPayload(event: DragEvent<HTMLElement>, fallback: DragPayload | null) {
  const raw = event.dataTransfer.getData('application/x-studio-drag')
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as DragPayload
  } catch {
    return fallback
  }
}

function getPagedItems<T>(items: T[], page: number, pageSize: number) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize))
  const safePage = Math.min(page, totalPages - 1)
  const start = safePage * pageSize
  return {
    items: items.slice(start, start + pageSize),
    page: safePage,
    totalPages,
  }
}

function buildMonthGrid(month: Dayjs) {
  const start = month.startOf('month').startOf('week')
  return Array.from({ length: 42 }, (_, index) => start.add(index, 'day'))
}

const panelStyle = {
  borderRadius: `${DASHBOARD_UI.outerRadius}px`,
  padding: `${DASHBOARD_UI.panelPadding}px`,
  boxShadow: DASHBOARD_UI.panelShadow,
  height: '100%',
  minHeight: 0,
  overflow: 'hidden',
}

const tileStyle = {
  borderRadius: `${DASHBOARD_UI.innerRadius}px`,
  padding: `${DASHBOARD_UI.cardPadding}px`,
  border: DASHBOARD_UI.panelBorder,
  background: DASHBOARD_UI.softSurface,
  minHeight: 0,
}

function getDashboardScale() {
  if (typeof window === 'undefined') {
    return 1
  }

  return Math.min(
    1,
    (window.innerWidth - DASHBOARD_CANVAS.viewportPadding * 2) / DASHBOARD_CANVAS.width,
    (window.innerHeight - DASHBOARD_CANVAS.viewportPadding * 2) / DASHBOARD_CANVAS.height,
  )
}

export function DashboardPage() {
  const todayStr = today()
  const [viewportScale, setViewportScale] = useState(() => getDashboardScale())
  const [selectedDate, setSelectedDate] = useState(todayStr)
  const [calendarMonth, setCalendarMonth] = useState(dayjs(todayStr).startOf('month'))
  const [calendarModalDate, setCalendarModalDate] = useState<string | null>(null)
  const [dragging, setDragging] = useState<DragPayload | null>(null)
  const [message, setMessage] = useState('')

  const [dataCenterOpen, setDataCenterOpen] = useState(false)
  const [taskModalOpen, setTaskModalOpen] = useState(false)
  const [personModalOpen, setPersonModalOpen] = useState(false)
  const [projectModalOpen, setProjectModalOpen] = useState(false)
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false)

  const [taskPage, setTaskPage] = useState(0)
  const [peoplePage, setPeoplePage] = useState(0)

  const [studioName, setStudioName] = useState('')
  const [savingDataCenter, setSavingDataCenter] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null)
  const [importRawData, setImportRawData] = useState('')
  const [importError, setImportError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { setting, updateSetting, updateLastBackup } = useSettings()
  const { projects, addProject } = useProjects()
  const { tasks, addTask, updateTask } = useTasks()
  const { people, addPerson, togglePersonActive } = usePeople()
  const { milestones, addMilestone } = useMilestones()
  const { assignments, assignTaskToPersonOnDate, deleteAssignment } = useAssignments()

  const [projectForm, setProjectForm] = useState<ProjectInput>({
    name: '',
    type: '品牌项目',
    description: '',
    startDate: todayStr,
    deadline: todayStr,
    status: 'not_started',
    priority: 'medium',
    color: PROJECT_COLORS[0],
    clientOrSource: '',
  })
  const [taskForm, setTaskForm] = useState<TaskInput>({
    projectId: '',
    title: '',
    description: '',
    status: 'todo',
    priority: 'medium',
    stage: '',
    startDate: selectedDate,
    dueDate: selectedDate,
    estimatedHours: 4,
  })
  const [personForm, setPersonForm] = useState<PersonInput>({
    name: '',
    role: '',
    gender: 'unspecified',
    skills: [],
    note: '',
    isActive: true,
  })
  const [personSkillsText, setPersonSkillsText] = useState('')
  const [scheduleForm, setScheduleForm] = useState<MilestoneInput>({
    projectId: '',
    title: '',
    date: selectedDate,
    type: 'other',
    note: '',
  })

  useEffect(() => {
    if (!setting) return
    setStudioName(setting.studioName)
    document.title = setting.studioName
  }, [setting])

  useEffect(() => {
    const timer = window.setTimeout(() => setMessage(''), 2600)
    if (!message) {
      window.clearTimeout(timer)
    }
    return () => window.clearTimeout(timer)
  }, [message])

  useEffect(() => {
    if (!projects.length) return
    setTaskForm(current => (current.projectId ? current : { ...current, projectId: projects[0].id }))
    setScheduleForm(current => (current.projectId ? current : { ...current, projectId: projects[0].id }))
  }, [projects])

  useEffect(() => {
    const updateScale = () => setViewportScale(getDashboardScale())
    updateScale()
    window.addEventListener('resize', updateScale)
    return () => window.removeEventListener('resize', updateScale)
  }, [])

  const selectedQuote = getQuotesForDate(todayStr)[0]
  const projectMap = new Map(projects.map(project => [project.id, project]))
  const taskMap = new Map(tasks.map(task => [task.id, task]))
  const personMap = new Map(people.map(person => [person.id, person]))

  const focusProjects = [...projects]
    .filter(project => project.deadline && project.status !== 'completed')
    .sort((a, b) => dayjs(a.deadline).diff(dayjs(b.deadline), 'day'))
    .slice(0, 4)

  const focusSchedules = [...milestones]
    .filter(milestone => milestone.date >= todayStr)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 4)

  const selectedAssignments = assignments
    .filter(assignment => assignment.date === selectedDate)
    .sort((a, b) => (personMap.get(a.personId)?.name || '').localeCompare(personMap.get(b.personId)?.name || '', 'zh-CN'))

  const selectedAssignmentByTaskId = new Map(selectedAssignments.map(assignment => [assignment.taskId, assignment]))

  const visibleTasksState = getPagedItems(
    [...tasks]
      .filter(task => task.status !== 'completed')
      .sort((a, b) => {
        const dueCompare = (a.dueDate || '9999-12-31').localeCompare(b.dueDate || '9999-12-31')
        if (dueCompare !== 0) return dueCompare
        return a.createdAt.localeCompare(b.createdAt)
      }),
    taskPage,
    4,
  )

  const activePeople = people
    .filter(person => person.isActive)
    .sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))

  const peopleCardsState = getPagedItems(activePeople, peoplePage, 6)

  const dailyCounts = new Map<string, { ddl: number; schedule: number; assignment: number }>()

  for (const project of projects) {
    if (!project.deadline) continue
    const current = dailyCounts.get(project.deadline) || { ddl: 0, schedule: 0, assignment: 0 }
    current.ddl += 1
    dailyCounts.set(project.deadline, current)
  }

  for (const schedule of milestones) {
    const current = dailyCounts.get(schedule.date) || { ddl: 0, schedule: 0, assignment: 0 }
    current.schedule += 1
    dailyCounts.set(schedule.date, current)
  }

  for (const assignment of assignments) {
    const current = dailyCounts.get(assignment.date) || { ddl: 0, schedule: 0, assignment: 0 }
    current.assignment += 1
    dailyCounts.set(assignment.date, current)
  }

  const monthDays = buildMonthGrid(calendarMonth)
  const selectedDateLabel = dayjs(selectedDate).format('M月D日 dddd')
  const dayModalDate = calendarModalDate || selectedDate
  const modalAssignments = assignments.filter(assignment => assignment.date === dayModalDate)
  const modalSchedules = milestones.filter(milestone => milestone.date === dayModalDate)
  const modalDeadlines = projects.filter(project => project.deadline === dayModalDate)
  const modalTaskDue = tasks.filter(task => task.dueDate === dayModalDate)
  const scaledCanvasWidth = DASHBOARD_CANVAS.width * viewportScale
  const scaledCanvasHeight = DASHBOARD_CANVAS.height * viewportScale

  const handleOpenDate = (date: string) => {
    setSelectedDate(date)
    setCalendarMonth(dayjs(date).startOf('month'))
    setCalendarModalDate(date)
  }

  const handleAssign = async (taskId: string, personId: string) => {
    const task = taskMap.get(taskId)
    if (!task) return

    try {
      await assignTaskToPersonOnDate({
        date: selectedDate,
        taskId,
        projectId: task.projectId,
        personId,
      })
      setMessage(`已为 ${selectedDateLabel} 完成分配。`)
    } catch {
      setMessage('分配失败，请稍后再试。')
    }
  }

  const handleDropOnPerson = async (event: DragEvent<HTMLElement>, personId: string) => {
    event.preventDefault()
    const payload = readDragPayload(event, dragging)
    setDragging(null)
    if (payload?.type === 'task') {
      await handleAssign(payload.taskId, personId)
    }
  }

  const handleDropOnTask = async (event: DragEvent<HTMLElement>, taskId: string) => {
    event.preventDefault()
    const payload = readDragPayload(event, dragging)
    setDragging(null)
    if (payload?.type === 'person') {
      await handleAssign(taskId, payload.personId)
    }
  }

  const handleExportJSON = async () => {
    try {
      const json = await exportFullJSON()
      downloadJSON(json, `118studio_dashboard_backup_${dayjs().format('YYYYMMDD_HHmmss')}.json`)
      await updateLastBackup()
      setMessage('完整 JSON 备份已导出。')
    } catch {
      setMessage('导出失败，请稍后重试。')
    }
  }

  const handleImportFileSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const result = await parseImportFile(text)

      if ('error' in result) {
        setImportSummary(null)
        setImportRawData('')
        setImportError(result.error)
      } else {
        setImportSummary(result.summary)
        setImportRawData(result.rawData)
        setImportError('')
      }
    } catch {
      setImportSummary(null)
      setImportRawData('')
      setImportError('读取备份文件失败。')
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleConfirmImport = async () => {
    try {
      setImporting(true)
      await importFullJSON(importRawData)
      setDataCenterOpen(false)
      setImportSummary(null)
      setImportRawData('')
      setImportError('')
      setMessage('备份已恢复，旧数据兼容字段已自动补齐。')
    } catch {
      setImportError('导入失败，当前数据未被覆盖。')
    } finally {
      setImporting(false)
    }
  }

  const handleSaveStudioName = async () => {
    const nextName = studioName.trim()
    if (!nextName) {
      setMessage('工作室名称不能为空。')
      return
    }

    try {
      setSavingDataCenter(true)
      await updateSetting({ studioName: nextName, defaultView: 'dashboard' })
      document.title = nextName
      setMessage('工作室名称已更新。')
    } catch {
      setMessage('保存工作室名称失败。')
    } finally {
      setSavingDataCenter(false)
    }
  }

  const openProjectComposer = () => {
    setProjectForm({
      name: '',
      type: '品牌项目',
      description: '',
      startDate: todayStr,
      deadline: selectedDate,
      status: 'not_started',
      priority: 'medium',
      color: PROJECT_COLORS[Math.floor(Math.random() * PROJECT_COLORS.length)],
      clientOrSource: '',
    })
    setProjectModalOpen(true)
  }

  const openTaskComposer = () => {
    setTaskForm({
      projectId: projects[0]?.id || '',
      title: '',
      description: '',
      status: 'todo',
      priority: 'medium',
      stage: '',
      startDate: selectedDate,
      dueDate: selectedDate,
      estimatedHours: 4,
    })
    setTaskModalOpen(true)
  }

  const openPersonComposer = () => {
    setPersonForm({
      name: '',
      role: '',
      gender: 'unspecified',
      skills: [],
      note: '',
      isActive: true,
    })
    setPersonSkillsText('')
    setPersonModalOpen(true)
  }

  const openScheduleComposer = () => {
    setScheduleForm({
      projectId: projects[0]?.id || '',
      title: '',
      date: selectedDate,
      type: 'other',
      note: '',
    })
    setScheduleModalOpen(true)
  }

  const handleCreateProject = async () => {
    if (!projectForm.name.trim()) {
      setMessage('请先填写项目名称。')
      return
    }
    await addProject(projectForm)
    setProjectModalOpen(false)
    setMessage('项目已加入今日焦点。')
  }

  const handleCreateTask = async () => {
    if (!taskForm.title.trim() || !taskForm.projectId) {
      setMessage('任务标题和所属项目不能为空。')
      return
    }
    await addTask(taskForm)
    setTaskModalOpen(false)
    setMessage('任务已加入任务池。')
  }

  const handleCreatePerson = async () => {
    if (!personForm.name.trim()) {
      setMessage('请先填写成员姓名。')
      return
    }
    await addPerson({
      ...personForm,
      skills: personSkillsText
        .split(/[,，]/)
        .map(skill => skill.trim())
        .filter(Boolean),
    })
    setPersonModalOpen(false)
    setMessage('成员已加入人员配置。')
  }

  const handleCreateSchedule = async () => {
    if (!scheduleForm.title.trim() || !scheduleForm.projectId) {
      setMessage('请先填写日程标题并选择项目。')
      return
    }
    await addMilestone(scheduleForm)
    setScheduleModalOpen(false)
    setMessage('日程已加入总览。')
  }

  return (
    <div className="h-screen overflow-hidden bg-[linear-gradient(180deg,_#f4f7ff_0%,_#edf3ff_100%)] text-text-primary">
      {message && (
        <div className="fixed top-4 right-4 z-40 rounded-xl border border-primary/10 bg-white px-4 py-3 text-sm text-text-primary shadow-[var(--shadow-xl)]">
          {message}
        </div>
      )}

      <div className="flex h-full items-center justify-center p-3">
        <div style={{ width: `${scaledCanvasWidth}px`, height: `${scaledCanvasHeight}px` }}>
          <div
            className="overflow-hidden rounded-[24px] bg-bg-main"
            style={{
              width: `${DASHBOARD_CANVAS.width}px`,
              height: `${DASHBOARD_CANVAS.height}px`,
              transform: `scale(${viewportScale})`,
              transformOrigin: 'top left',
              boxShadow: '0 24px 60px rgba(20, 28, 43, 0.12)',
            }}
          >
            <div
              className="grid h-full min-h-0"
              style={{
                padding: `${DASHBOARD_UI.pagePadding}px`,
                gridTemplateRows: `${DASHBOARD_UI.topRowHeight}px ${DASHBOARD_UI.midRowHeight}px minmax(0, 1fr)`,
                gap: `${DASHBOARD_UI.gap}px`,
              }}
            >
        <section className="grid min-h-0" style={{ gridTemplateColumns: DASHBOARD_UI.topColumns, gap: `${DASHBOARD_UI.gap}px` }}>
          <Card className="border-none bg-bg-sidebar text-white" style={panelStyle}>
            <div className="flex h-full flex-col justify-between">
              <div>
                <p className="uppercase tracking-widest text-white/45" style={{ fontSize: `${DASHBOARD_UI.microSize}px` }}>Today</p>
                <h1 className="mt-2 font-semibold tracking-tight" style={{ fontSize: `${DASHBOARD_UI.dateSize}px`, lineHeight: 1 }}>{dayjs(todayStr).format('M月D日')}</h1>
                <p className="mt-1 text-white/60" style={{ fontSize: `${DASHBOARD_UI.bodySize}px` }}>{dayjs(todayStr).format('dddd')}</p>
              </div>
              <div className="flex items-center gap-2 text-white/55" style={{ fontSize: `${DASHBOARD_UI.microSize}px` }}>
                <span className="inline-flex h-2 w-2 rounded-full bg-accent-teal" />
                {setting?.studioName || '118StudioManager'}
              </div>
            </div>
          </Card>

          <Card className="border-none bg-bg-card" style={panelStyle}>
            <div className="flex h-full flex-col justify-center px-5 py-4" style={{ ...tileStyle, padding: '14px 20px' }}>
              <p className="font-semibold leading-relaxed text-text-primary" style={{ fontSize: `${DASHBOARD_UI.quoteSize}px` }}>{selectedQuote.quote}</p>
              <p className="mt-2 font-semibold uppercase tracking-wide text-primary/60" style={{ fontSize: `${DASHBOARD_UI.microSize}px` }}>{selectedQuote.author}</p>
              <p className="mt-3 leading-relaxed text-text-secondary" style={{ fontSize: `${DASHBOARD_UI.bodySize}px` }}>{selectedQuote.prompt}</p>
            </div>
          </Card>

          <Card className="border-none bg-bg-card" style={panelStyle}>
            <div className="flex h-full flex-col justify-between">
              <div>
                <p className="uppercase tracking-widest text-text-muted" style={{ fontSize: `${DASHBOARD_UI.microSize}px` }}>Workspace</p>
                <h2 className="mt-2 font-semibold tracking-tight" style={{ fontSize: '24px' }}>{setting?.studioName || '118StudioManager'}</h2>
                <p className="mt-2 leading-relaxed text-text-secondary" style={{ fontSize: `${DASHBOARD_UI.bodySize}px` }}>单页工作台，所有关键内容固定在当前视图内完成操作。</p>
              </div>
              <div className="grid grid-cols-2" style={{ gap: `${DASHBOARD_UI.gap}px` }}>
                <Button size="sm" variant="secondary" onClick={() => setDataCenterOpen(true)}>数据中心</Button>
                <Button size="sm" onClick={openProjectComposer}>新建项目</Button>
                <Button size="sm" variant="secondary" onClick={openPersonComposer}>新建成员</Button>
                <Button size="sm" variant="secondary" onClick={openTaskComposer}>新建任务</Button>
              </div>
            </div>
          </Card>
        </section>

        <section className="grid min-h-0" style={{ gridTemplateColumns: DASHBOARD_UI.midColumns, gap: `${DASHBOARD_UI.gap}px` }}>
          <Card className="border-none bg-bg-card" style={panelStyle}>
            <PanelHeader
              title="今日焦点"
            />
            <div className="mt-3 grid h-[calc(100%-56px)] grid-cols-4" style={{ gap: `${DASHBOARD_UI.gap}px` }}>
              {focusProjects.length === 0 ? (
                <EmptyPanel text="当前没有需要盯的项目截止日期。" className="col-span-4" />
              ) : (
                focusProjects.map(project => {
                  const remain = daysUntil(project.deadline)
                  return (
                    <div key={project.id} style={tileStyle}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-semibold" style={{ fontSize: `${DASHBOARD_UI.cardTitleSize}px` }}>{project.name}</p>
                          <p className="mt-1 truncate text-text-secondary" style={{ fontSize: `${DASHBOARD_UI.subtitleSize}px` }}>{project.clientOrSource || project.type || '未填写来源'}</p>
                        </div>
                        <span className="mt-1 h-2.5 w-2.5 rounded-full" style={{ backgroundColor: project.color }} />
                      </div>
                      <div className="mt-4 flex items-end justify-between gap-2">
                        <div>
                          <p className="text-text-muted" style={{ fontSize: `${DASHBOARD_UI.microSize}px` }}>截止</p>
                          <p className="mt-1 text-text-secondary" style={{ fontSize: `${DASHBOARD_UI.subtitleSize}px` }}>{formatDateFull(project.deadline)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-text-muted" style={{ fontSize: `${DASHBOARD_UI.microSize}px` }}>剩余</p>
                          <p className={`mt-1 font-semibold ${remain < 0 ? 'text-danger' : 'text-primary'}`} style={{ fontSize: '16px' }}>
                            {remain >= 0 ? `${remain} 天` : `逾期 ${Math.abs(remain)} 天`}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </Card>

          <Card className="border-none bg-bg-card" style={panelStyle}>
            <PanelHeader
              title="日程"
              description="近期日程节点"
              action={<Button size="sm" variant="secondary" onClick={openScheduleComposer}>新增日程</Button>}
            />
            <div className="mt-3 grid h-[calc(100%-56px)] grid-cols-2" style={{ gap: `${DASHBOARD_UI.gap}px` }}>
              {focusSchedules.length === 0 ? (
                <EmptyPanel text="当前没有未来日程节点。" className="col-span-2" />
              ) : (
                focusSchedules.map(schedule => (
                  <div key={schedule.id} style={tileStyle}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-semibold" style={{ fontSize: `${DASHBOARD_UI.cardTitleSize}px` }}>{schedule.title}</p>
                        <p className="mt-1 truncate text-text-secondary" style={{ fontSize: `${DASHBOARD_UI.subtitleSize}px` }}>{projectMap.get(schedule.projectId)?.name || '未命名项目'}</p>
                      </div>
                      <Badge className={MILESTONE_TYPE_COLORS[schedule.type]}>{MILESTONE_TYPE_LABELS[schedule.type]}</Badge>
                    </div>
                    <p className="mt-3 text-text-secondary" style={{ fontSize: `${DASHBOARD_UI.subtitleSize}px` }}>{formatDateFull(schedule.date)}</p>
                  </div>
                ))
              )}
            </div>
          </Card>
        </section>

        <section className="grid min-h-0" style={{ gridTemplateColumns: DASHBOARD_UI.bottomColumns, gap: `${DASHBOARD_UI.gap}px` }}>
          <div className="grid min-h-0" style={{ gridTemplateColumns: DASHBOARD_UI.bottomInnerColumns, gap: `${DASHBOARD_UI.gap}px` }}>
            <Card className="border-none bg-bg-card" style={panelStyle}>
              <PanelHeader
                title="任务池"
                description="自由拖拽任务与成员进行分配交互"
                action={
                  <Pager
                    page={visibleTasksState.page}
                    totalPages={visibleTasksState.totalPages}
                    onPrev={() => setTaskPage(page => Math.max(0, page - 1))}
                    onNext={() => setTaskPage(page => Math.min(visibleTasksState.totalPages - 1, page + 1))}
                  />
                }
              />

              <div className="mt-3 grid h-[calc(100%-58px)] gap-2" style={{ gridTemplateRows: `repeat(4, minmax(0, ${DASHBOARD_UI.taskCardHeight}px))`, gap: `${DASHBOARD_UI.gap - 1}px` }}>
                {visibleTasksState.items.length === 0 ? (
                  <EmptyPanel text="当前没有待推进任务。" />
                ) : (
                  visibleTasksState.items.map(task => {
                    const assignment = selectedAssignmentByTaskId.get(task.id)
                    const assignedPerson = assignment ? personMap.get(assignment.personId) : null
                    return (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={event => {
                          const payload: DragPayload = { type: 'task', taskId: task.id }
                          event.dataTransfer.effectAllowed = 'move'
                          event.dataTransfer.setData('application/x-studio-drag', JSON.stringify(payload))
                          setDragging(payload)
                        }}
                        onDragEnd={() => setDragging(null)}
                        onDragOver={event => {
                          if (dragging?.type === 'person') {
                            event.preventDefault()
                          }
                        }}
                        onDrop={event => void handleDropOnTask(event, task.id)}
                        className="transition-all"
                        style={{
                          ...tileStyle,
                          background: dragging?.type === 'person' ? 'rgba(65, 102, 245, 0.08)' : DASHBOARD_UI.softSurface,
                          border: dragging?.type === 'person' ? '1px solid rgba(65, 102, 245, 0.24)' : DASHBOARD_UI.panelBorder,
                        }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="truncate font-semibold" style={{ fontSize: `${DASHBOARD_UI.cardTitleSize}px` }}>{task.title}</p>
                              <Badge className={TASK_STATUS_COLORS[task.status]}>{TASK_STATUS_LABELS[task.status]}</Badge>
                            </div>
                            <p className="mt-1 truncate text-text-secondary" style={{ fontSize: `${DASHBOARD_UI.subtitleSize}px` }}>
                              {projectMap.get(task.projectId)?.name || '未命名项目'}
                              {task.stage ? ` · ${task.stage}` : ''}
                            </p>
                          </div>
                          <Badge className={PRIORITY_COLORS[task.priority]}>{PRIORITY_LABELS[task.priority]}</Badge>
                        </div>

                        <div className="mt-3 flex items-center justify-between gap-3 text-text-secondary" style={{ fontSize: `${DASHBOARD_UI.subtitleSize}px` }}>
                          <span>DDL {task.dueDate || '未设'}</span>
                          <span>{task.estimatedHours || 0}h</span>
                          <span>{assignedPerson ? `给 ${assignedPerson.name}` : '未分配'}</span>
                        </div>

                        <div className="mt-3 flex items-center justify-between gap-2">
                          <select
                            className={`${selectClass} max-w-[122px] !py-1.5 text-xs`}
                            value={task.status}
                            onChange={event => updateTask(task.id, { status: event.target.value as TaskStatus })}
                          >
                            <option value="todo">待办</option>
                            <option value="in_progress">进行中</option>
                            <option value="blocked">受阻</option>
                            <option value="completed">已完成</option>
                          </select>
                          {assignment ? (
                            <button
                              type="button"
                              className="rounded-lg px-2 py-1 text-xs text-danger transition hover:bg-danger/10"
                              onClick={() => deleteAssignment(assignment.id)}
                            >
                              取消分配
                            </button>
                          ) : (
                            <span className="text-[11px] text-text-muted">拖拽即可分配</span>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </Card>

            <Card className="border-none bg-bg-card" style={panelStyle}>
              <PanelHeader
                title="人员配置"
                action={
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="secondary" onClick={openPersonComposer}>新增成员</Button>
                    <Pager
                      page={peopleCardsState.page}
                      totalPages={peopleCardsState.totalPages}
                      onPrev={() => setPeoplePage(page => Math.max(0, page - 1))}
                      onNext={() => setPeoplePage(page => Math.min(peopleCardsState.totalPages - 1, page + 1))}
                    />
                  </div>
                }
              />

              <div className="mt-3 grid h-[calc(100%-58px)] grid-cols-3 gap-2" style={{ gridTemplateRows: `repeat(2, minmax(0, ${DASHBOARD_UI.personCardHeight}px))`, gap: `${DASHBOARD_UI.gap - 1}px` }}>
                {peopleCardsState.items.length === 0 ? (
                  <EmptyPanel text="当前还没有可用成员。" className="col-span-3 row-span-2" />
                ) : (
                  peopleCardsState.items.map(person => {
                    const personalAssignments = selectedAssignments.filter(assignment => assignment.personId === person.id).slice(0, 2)
                    return (
                      <div
                        key={person.id}
                        draggable
                        onDragStart={event => {
                          const payload: DragPayload = { type: 'person', personId: person.id }
                          event.dataTransfer.effectAllowed = 'move'
                          event.dataTransfer.setData('application/x-studio-drag', JSON.stringify(payload))
                          setDragging(payload)
                        }}
                        onDragEnd={() => setDragging(null)}
                        onDragOver={event => {
                          if (dragging?.type === 'task') {
                            event.preventDefault()
                          }
                        }}
                        onDrop={event => void handleDropOnPerson(event, person.id)}
                        className="transition-all"
                        style={{
                          ...tileStyle,
                          background: dragging?.type === 'task' ? 'rgba(65, 102, 245, 0.08)' : DASHBOARD_UI.softSurface,
                          border: dragging?.type === 'task' ? '1px solid rgba(65, 102, 245, 0.24)' : DASHBOARD_UI.panelBorder,
                        }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="truncate font-semibold" style={{ fontSize: `${DASHBOARD_UI.cardTitleSize}px` }}>{person.name}</p>
                              <Badge className={getGenderClass(person.gender)}>{getGenderLabel(person.gender)}</Badge>
                            </div>
                            <p className="mt-1 truncate text-text-secondary" style={{ fontSize: `${DASHBOARD_UI.subtitleSize}px` }}>{person.role || '未填写角色'}</p>
                          </div>
                          <button
                            type="button"
                            className="rounded-md px-2 py-1 text-[11px] text-text-secondary transition hover:bg-white hover:text-text-primary"
                            onClick={() => void togglePersonActive(person.id)}
                          >
                            停用
                          </button>
                        </div>

                        <div className="mt-3 rounded-lg bg-white/80 p-2" style={{ borderRadius: `${DASHBOARD_UI.innerRadius - 2}px`, background: DASHBOARD_UI.softSurfaceAlt }}>
                          <p className="text-text-muted" style={{ fontSize: `${DASHBOARD_UI.microSize}px` }}>{dayjs(selectedDate).format('M月D日')} 分配</p>
                          {personalAssignments.length === 0 ? (
                            <p className="mt-1 text-text-secondary" style={{ fontSize: `${DASHBOARD_UI.subtitleSize}px` }}>拖任务到此成员卡完成分配</p>
                          ) : (
                            <div className="mt-1 space-y-1">
                              {personalAssignments.map(assignment => (
                                <div key={assignment.id} className="truncate text-text-secondary" style={{ fontSize: `${DASHBOARD_UI.subtitleSize}px` }}>
                                  {taskMap.get(assignment.taskId)?.title || '未知任务'}
                                  {projectMap.get(assignment.projectId)?.name ? ` · ${projectMap.get(assignment.projectId)?.name}` : ''}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </Card>
          </div>

          <Card className="border-none bg-bg-card" style={panelStyle}>
            <PanelHeader
              title="月历总览"
              action={
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className="rounded-lg bg-bg-main px-2.5 py-1 text-xs text-text-secondary transition hover:text-text-primary"
                    onClick={() => setCalendarMonth(month => month.subtract(1, 'month'))}
                  >
                    上月
                  </button>
                  <button
                    type="button"
                    className="rounded-lg bg-bg-main px-2.5 py-1 text-xs text-text-secondary transition hover:text-text-primary"
                    onClick={() => setCalendarMonth(month => month.add(1, 'month'))}
                  >
                    下月
                  </button>
                </div>
              }
            />

            <div className="mt-2 grid grid-cols-7" style={{ gap: `${DASHBOARD_UI.calendarGap}px` }}>
              {['一', '二', '三', '四', '五', '六', '日'].map(weekday => (
                <div key={weekday} className="pb-1 text-center font-semibold text-text-muted" style={{ fontSize: `${DASHBOARD_UI.microSize}px` }}>
                  {weekday}
                </div>
              ))}
            </div>

            <div className="mt-1 grid h-[calc(100%-48px)] grid-cols-7 grid-rows-6" style={{ gap: `${DASHBOARD_UI.calendarGap}px` }}>
              {monthDays.map(day => {
                const key = day.format('YYYY-MM-DD')
                const counts = dailyCounts.get(key)
                const isCurrentMonth = day.isSame(calendarMonth, 'month')
                const isSelected = key === selectedDate
                const isToday = key === todayStr
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleOpenDate(key)}
                    className={`flex min-h-0 flex-col border px-2 py-1.5 text-left transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/6 shadow-[var(--shadow-xs)]'
                        : isToday
                          ? 'border-primary/20 bg-primary/5'
                          : 'border-border-light bg-bg-main/35 hover:border-primary/10'
                    }`}
                    style={{ borderRadius: `${DASHBOARD_UI.calendarCellRadius}px` }}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`font-semibold ${isCurrentMonth ? 'text-text-primary' : 'text-text-muted'}`} style={{ fontSize: `${DASHBOARD_UI.calendarNumberSize}px` }}>
                        {day.date()}
                      </span>
                      {isToday && <span className="h-2 w-2 rounded-full bg-primary" />}
                    </div>
                    <div className="mt-1.5 flex flex-1 flex-col justify-end gap-0.5">
                      <DayMarker color="bg-danger" label="DDL" count={counts?.ddl || 0} />
                      <DayMarker color="bg-accent-teal" label="日程" count={counts?.schedule || 0} />
                      <DayMarker color="bg-primary" label="分配" count={counts?.assignment || 0} />
                    </div>
                  </button>
                )
              })}
            </div>
          </Card>
        </section>
            </div>
          </div>
        </div>
      </div>

      <Modal open={dataCenterOpen} onClose={() => setDataCenterOpen(false)} title="数据中心" width="max-w-3xl">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-semibold">工作室信息</h3>
              <p className="mt-1 text-sm text-text-secondary">视觉已回到原版蓝灰体系，数据仍沿用原 Dexie 本地库。</p>
            </div>

            <FormField label="工作室名称" required>
              <input className={inputClass} value={studioName} onChange={event => setStudioName(event.target.value)} />
            </FormField>

            <div className="rounded-xl border border-border-light bg-bg-main/45 p-4 text-sm text-text-secondary">
              <p>数据库名称：`studio_manager_db`</p>
              <p className="mt-1">最近备份：{setting?.lastBackupAt ? formatDateTime(setting.lastBackupAt) : '暂无记录'}</p>
              <p className="mt-1">旧版 JSON 导入时会自动补齐新增字段。</p>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={handleExportJSON}>导出 JSON</Button>
              <Button onClick={handleSaveStudioName} disabled={savingDataCenter || !studioName.trim()}>
                {savingDataCenter ? '保存中...' : '保存名称'}
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="text-base font-semibold">导入恢复</h3>
              <p className="mt-1 text-sm text-text-secondary">支持旧版完整备份重新导入，人员性别缺失时会自动补成“未设”。</p>
            </div>

            <input ref={fileInputRef} type="file" accept="application/json" className="hidden" onChange={handleImportFileSelect} />

            <div className="rounded-xl border border-dashed border-border bg-white p-4">
              <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>选择备份文件</Button>
              {importError && <p className="mt-3 text-sm text-danger">{importError}</p>}
              {importSummary && (
                <div className="mt-4 rounded-xl bg-bg-main/45 p-4">
                  <p className="text-sm font-medium">导入预览</p>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-text-secondary">
                    <p>项目：{importSummary.projects}</p>
                    <p>人员：{importSummary.people}</p>
                    <p>任务：{importSummary.tasks}</p>
                    <p>日程：{importSummary.milestones}</p>
                    <p>分配：{importSummary.assignments}</p>
                    <p>设置：{importSummary.settings}</p>
                  </div>
                  <Button className="mt-4" onClick={handleConfirmImport} disabled={importing}>
                    {importing ? '导入中...' : '确认覆盖导入'}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </Modal>

      <Modal open={projectModalOpen} onClose={() => setProjectModalOpen(false)} title="新增项目" width="max-w-2xl">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="项目名称" required>
            <input className={inputClass} value={projectForm.name} onChange={event => setProjectForm(current => ({ ...current, name: event.target.value }))} />
          </FormField>
          <FormField label="项目类型">
            <input className={inputClass} value={projectForm.type} onChange={event => setProjectForm(current => ({ ...current, type: event.target.value }))} />
          </FormField>
          <FormField label="开始日期">
            <input type="date" className={inputClass} value={projectForm.startDate} onChange={event => setProjectForm(current => ({ ...current, startDate: event.target.value }))} />
          </FormField>
          <FormField label="截止日期">
            <input type="date" className={inputClass} value={projectForm.deadline} onChange={event => setProjectForm(current => ({ ...current, deadline: event.target.value }))} />
          </FormField>
          <FormField label="状态">
            <select className={selectClass} value={projectForm.status} onChange={event => setProjectForm(current => ({ ...current, status: event.target.value as ProjectStatus }))}>
              <option value="not_started">未开始</option>
              <option value="in_progress">进行中</option>
              <option value="waiting_feedback">等待反馈</option>
              <option value="paused">已暂停</option>
              <option value="completed">已完成</option>
            </select>
          </FormField>
          <FormField label="优先级">
            <select className={selectClass} value={projectForm.priority} onChange={event => setProjectForm(current => ({ ...current, priority: event.target.value as ProjectPriority }))}>
              <option value="high">高</option>
              <option value="medium">中</option>
              <option value="low">低</option>
            </select>
          </FormField>
          <FormField label="客户/来源">
            <input className={inputClass} value={projectForm.clientOrSource} onChange={event => setProjectForm(current => ({ ...current, clientOrSource: event.target.value }))} />
          </FormField>
          <FormField label="项目色">
            <div className="flex flex-wrap gap-2">
              {PROJECT_COLORS.map(color => (
                <button
                  key={color}
                  type="button"
                  className={`h-8 w-8 rounded-full border-2 ${projectForm.color === color ? 'border-text-primary' : 'border-transparent'}`}
                  style={{ backgroundColor: color }}
                  onClick={() => setProjectForm(current => ({ ...current, color }))}
                />
              ))}
            </div>
          </FormField>
          <div className="md:col-span-2">
            <FormField label="描述">
              <textarea className={textareaClass} rows={4} value={projectForm.description} onChange={event => setProjectForm(current => ({ ...current, description: event.target.value }))} />
            </FormField>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setProjectModalOpen(false)}>取消</Button>
          <Button onClick={handleCreateProject}>创建项目</Button>
        </div>
      </Modal>

      <Modal open={taskModalOpen} onClose={() => setTaskModalOpen(false)} title="新增任务" width="max-w-2xl">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="任务标题" required>
            <input className={inputClass} value={taskForm.title} onChange={event => setTaskForm(current => ({ ...current, title: event.target.value }))} />
          </FormField>
          <FormField label="所属项目" required>
            <select className={selectClass} value={taskForm.projectId} onChange={event => setTaskForm(current => ({ ...current, projectId: event.target.value }))}>
              <option value="">请选择项目</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </select>
          </FormField>
          <FormField label="开始日期">
            <input type="date" className={inputClass} value={taskForm.startDate} onChange={event => setTaskForm(current => ({ ...current, startDate: event.target.value }))} />
          </FormField>
          <FormField label="截止日期">
            <input type="date" className={inputClass} value={taskForm.dueDate} onChange={event => setTaskForm(current => ({ ...current, dueDate: event.target.value }))} />
          </FormField>
          <FormField label="状态">
            <select className={selectClass} value={taskForm.status} onChange={event => setTaskForm(current => ({ ...current, status: event.target.value as TaskStatus }))}>
              <option value="todo">待办</option>
              <option value="in_progress">进行中</option>
              <option value="blocked">受阻</option>
              <option value="completed">已完成</option>
            </select>
          </FormField>
          <FormField label="优先级">
            <select className={selectClass} value={taskForm.priority} onChange={event => setTaskForm(current => ({ ...current, priority: event.target.value as TaskPriority }))}>
              <option value="high">高</option>
              <option value="medium">中</option>
              <option value="low">低</option>
            </select>
          </FormField>
          <FormField label="任务阶段">
            <input className={inputClass} value={taskForm.stage} onChange={event => setTaskForm(current => ({ ...current, stage: event.target.value }))} placeholder="如：脚本、拍摄、剪辑" />
          </FormField>
          <FormField label="预估工时">
            <input type="number" min={0} className={inputClass} value={taskForm.estimatedHours} onChange={event => setTaskForm(current => ({ ...current, estimatedHours: Number(event.target.value) || 0 }))} />
          </FormField>
          <div className="md:col-span-2">
            <FormField label="描述">
              <textarea className={textareaClass} rows={4} value={taskForm.description} onChange={event => setTaskForm(current => ({ ...current, description: event.target.value }))} />
            </FormField>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setTaskModalOpen(false)}>取消</Button>
          <Button onClick={handleCreateTask} disabled={!projects.length}>创建任务</Button>
        </div>
      </Modal>

      <Modal open={personModalOpen} onClose={() => setPersonModalOpen(false)} title="新增成员" width="max-w-2xl">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="姓名" required>
            <input className={inputClass} value={personForm.name} onChange={event => setPersonForm(current => ({ ...current, name: event.target.value }))} />
          </FormField>
          <FormField label="角色">
            <input className={inputClass} value={personForm.role} onChange={event => setPersonForm(current => ({ ...current, role: event.target.value }))} />
          </FormField>
          <FormField label="性别">
            <select className={selectClass} value={personForm.gender || 'unspecified'} onChange={event => setPersonForm(current => ({ ...current, gender: event.target.value as PersonGender }))}>
              <option value="unspecified">未设</option>
              <option value="female">女</option>
              <option value="male">男</option>
            </select>
          </FormField>
          <FormField label="状态">
            <select className={selectClass} value={personForm.isActive ? 'active' : 'inactive'} onChange={event => setPersonForm(current => ({ ...current, isActive: event.target.value === 'active' }))}>
              <option value="active">在职</option>
              <option value="inactive">停用</option>
            </select>
          </FormField>
          <div className="md:col-span-2">
            <FormField label="技能标签">
              <input className={inputClass} value={personSkillsText} onChange={event => setPersonSkillsText(event.target.value)} placeholder="使用逗号分隔，例如：脚本, 摄影, 剪辑" />
            </FormField>
          </div>
          <div className="md:col-span-2">
            <FormField label="备注">
              <textarea className={textareaClass} rows={4} value={personForm.note} onChange={event => setPersonForm(current => ({ ...current, note: event.target.value }))} />
            </FormField>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setPersonModalOpen(false)}>取消</Button>
          <Button onClick={handleCreatePerson}>创建成员</Button>
        </div>
      </Modal>

      <Modal open={scheduleModalOpen} onClose={() => setScheduleModalOpen(false)} title="新增日程" width="max-w-2xl">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="日程标题" required>
            <input className={inputClass} value={scheduleForm.title} onChange={event => setScheduleForm(current => ({ ...current, title: event.target.value }))} />
          </FormField>
          <FormField label="所属项目" required>
            <select className={selectClass} value={scheduleForm.projectId} onChange={event => setScheduleForm(current => ({ ...current, projectId: event.target.value }))}>
              <option value="">请选择项目</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </select>
          </FormField>
          <FormField label="日期">
            <input type="date" className={inputClass} value={scheduleForm.date} onChange={event => setScheduleForm(current => ({ ...current, date: event.target.value }))} />
          </FormField>
          <FormField label="类型">
            <select className={selectClass} value={scheduleForm.type} onChange={event => setScheduleForm(current => ({ ...current, type: event.target.value as MilestoneType }))}>
              <option value="kickoff">启动</option>
              <option value="draft">初稿</option>
              <option value="review">评审</option>
              <option value="test">测试</option>
              <option value="delivery">交付</option>
              <option value="other">其他</option>
            </select>
          </FormField>
          <div className="md:col-span-2">
            <FormField label="备注">
              <textarea className={textareaClass} rows={4} value={scheduleForm.note} onChange={event => setScheduleForm(current => ({ ...current, note: event.target.value }))} />
            </FormField>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setScheduleModalOpen(false)}>取消</Button>
          <Button onClick={handleCreateSchedule} disabled={!projects.length}>创建日程</Button>
        </div>
      </Modal>

      <Modal open={!!calendarModalDate} onClose={() => setCalendarModalDate(null)} title={`${formatDateFull(dayModalDate)} 事项`} width="max-w-3xl">
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => { setSelectedDate(dayModalDate); setCalendarModalDate(null) }}>设为当前排期日</Button>
          <Button variant="secondary" onClick={openScheduleComposer}>新增日程</Button>
          <Button onClick={openTaskComposer}>新增任务</Button>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <div className="space-y-5">
            <div>
              <h3 className="text-sm font-semibold">成员分配</h3>
              <div className="mt-3 space-y-2">
                {modalAssignments.length === 0 ? (
                  <EmptyPanel text="当天还没有任务分配。" />
                ) : (
                  modalAssignments.map(assignment => (
                    <div key={assignment.id} className="rounded-xl border border-border bg-white px-4 py-3">
                      <p className="text-sm font-medium">{taskMap.get(assignment.taskId)?.title || '未知任务'}</p>
                      <p className="mt-1 text-sm text-text-secondary">
                        {personMap.get(assignment.personId)?.name || '未指派成员'} · {projectMap.get(assignment.projectId)?.name || '未命名项目'}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold">日程安排</h3>
              <div className="mt-3 space-y-2">
                {modalSchedules.length === 0 ? (
                  <EmptyPanel text="当天没有日程节点。" />
                ) : (
                  modalSchedules.map(schedule => (
                    <div key={schedule.id} className="rounded-xl border border-border bg-white px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium">{schedule.title}</p>
                          <p className="mt-1 text-sm text-text-secondary">{projectMap.get(schedule.projectId)?.name || '未命名项目'}</p>
                        </div>
                        <Badge className={MILESTONE_TYPE_COLORS[schedule.type]}>{MILESTONE_TYPE_LABELS[schedule.type]}</Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <h3 className="text-sm font-semibold">项目 DDL</h3>
              <div className="mt-3 space-y-2">
                {modalDeadlines.length === 0 ? (
                  <EmptyPanel text="当天没有项目截止。" />
                ) : (
                  modalDeadlines.map(project => (
                    <div key={project.id} className="rounded-xl border border-border bg-white px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium">{project.name}</p>
                          <p className="mt-1 text-sm text-text-secondary">{project.clientOrSource || project.type || '未填写来源'}</p>
                        </div>
                        <Badge className={PROJECT_STATUS_COLORS[project.status]}>{PROJECT_STATUS_LABELS[project.status]}</Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold">任务截止</h3>
              <div className="mt-3 space-y-2">
                {modalTaskDue.length === 0 ? (
                  <EmptyPanel text="当天没有任务截止。" />
                ) : (
                  modalTaskDue.map(task => (
                    <div key={task.id} className="rounded-xl border border-border bg-white px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium">{task.title}</p>
                          <p className="mt-1 text-sm text-text-secondary">{projectMap.get(task.projectId)?.name || '未命名项目'}</p>
                        </div>
                        <Badge className={TASK_STATUS_COLORS[task.status]}>{TASK_STATUS_LABELS[task.status]}</Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function PanelHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <h3 className="font-semibold tracking-tight text-text-primary" style={{ fontSize: `${DASHBOARD_UI.titleSize}px`, lineHeight: 1.15 }}>{title}</h3>
        {description && <p className="mt-1 leading-relaxed text-text-secondary" style={{ fontSize: `${DASHBOARD_UI.subtitleSize}px` }}>{description}</p>}
      </div>
      {action}
    </div>
  )
}

function EmptyPanel({ text, className = '' }: { text: string; className?: string }) {
  return (
    <div
      className={`border border-dashed border-border bg-bg-main/45 px-4 py-5 text-text-secondary ${className}`}
      style={{ borderRadius: `${DASHBOARD_UI.innerRadius}px`, fontSize: `${DASHBOARD_UI.bodySize}px` }}
    >
      {text}
    </div>
  )
}

function Pager({ page, totalPages, onPrev, onNext }: { page: number; totalPages: number; onPrev: () => void; onNext: () => void }) {
  if (totalPages <= 1) {
    return null
  }

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <button
        type="button"
        className="rounded-lg bg-bg-main px-2 py-1 text-xs text-text-secondary transition hover:text-text-primary"
        onClick={onPrev}
        disabled={page <= 0}
        aria-label="上一页"
      >
        ‹
      </button>
      <span className="min-w-[42px] text-center text-xs text-text-muted">{page + 1}/{totalPages}</span>
      <button
        type="button"
        className="rounded-lg bg-bg-main px-2 py-1 text-xs text-text-secondary transition hover:text-text-primary"
        onClick={onNext}
        disabled={page >= totalPages - 1}
        aria-label="下一页"
      >
        ›
      </button>
    </div>
  )
}

function DayMarker({ color, label, count }: { color: string; label: string; count: number }) {
  if (!count) {
    return null
  }

  return (
    <span className="inline-flex items-center gap-1 text-text-secondary" style={{ fontSize: `${DASHBOARD_UI.calendarMarkerSize}px` }}>
      <span className={`h-1.5 w-1.5 rounded-full ${color}`} />
      {label} {count}
    </span>
  )
}
