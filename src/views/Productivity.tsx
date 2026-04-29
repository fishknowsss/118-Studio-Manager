import { Fragment, useEffect, useMemo, useRef, useState, type CSSProperties, type ChangeEvent, type Dispatch, type SetStateAction } from 'react'
import { useConfirm } from '../components/feedback/ConfirmProvider'
import { useToast } from '../components/feedback/ToastProvider'
import { SquidMark } from '../components/easter/SquidMark'
import { getSquidVariant, hasSquidPersonName } from '../components/easter/squidMarkUtils'
import { Dialog } from '../components/ui/Dialog'
import {
  buildProductivityPersonModels,
  buildScheduleOwnerSummaries,
  type ProductivityPersonModel,
  type ScheduleOwnerSummary,
} from '../features/productivity/productivityModels'
import {
  buildScheduleClusters,
  buildScheduleCourseLayouts,
  getWeekNumber,
  groupScheduleCourses,
  mergeScheduleEntries,
  scheduleGroupKey,
  weekTextApplies,
  type ScheduleCourseGroup,
} from '../features/productivity/scheduleModels'
import { extractSchedulePdf } from '../features/productivity/schedulePdfParser'
import type { ClassScheduleEntry, LegacyPerson } from '../legacy/store'
import { store } from '../legacy/store'
import { downloadFile, formatFileDate, formatLocalDateKey, now, uid } from '../legacy/utils'
import { useLegacyStoreSnapshot } from '../legacy/useLegacyStore'
import { useTodayDate } from '../legacy/useTodayDate'

const PAGE_SIZE = 16
const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日']
const SECTIONS = Array.from({ length: 12 }, (_, index) => index + 1)
const DEFAULT_TERM_START_DATE = '2026-03-02'
const TERM_START_STORAGE_KEY = '118sm.productivity.termStartDate'

type ViewMode = 'cards' | 'schedule'
type ScheduleFormState = {
  personId: string
  courseName: string
  dayOfWeek: number
  startSection: number
  endSection: number
  weeksText: string
  location: string
  teacher: string
}
type ScheduleTextField = 'personId' | 'courseName' | 'weeksText' | 'location' | 'teacher'
type ScheduleNumberField = 'dayOfWeek' | 'startSection' | 'endSection'
type ScheduleVisualCourse = {
  id: string
  startSection: number
  endSection: number
  courseGroup: ScheduleCourseGroup
}
type SelectedScheduleDetail = {
  id: string
  type: 'course' | 'conflict'
  title: string
  subtitle: string
  rows: { label: string; value: string }[]
  courses?: { id: string; title: string; meta: string }[]
}
type ScheduleDetailAnchor = {
  left: number
  top: number
  side: 'top' | 'bottom'
  maxHeight: number
}
type SelectedScheduleState = {
  detail: SelectedScheduleDetail
  anchor: ScheduleDetailAnchor
}

function getScheduleCourseMemberText(courseGroup: ScheduleCourseGroup) {
  return Array.from(new Set(
    courseGroup.entries
      .map((entry) => entry.personName || '未命名成员')
      .filter(Boolean),
  )).join('、')
}

function getScheduleCourseDetail(course: ScheduleVisualCourse): SelectedScheduleDetail {
  const memberText = getScheduleCourseMemberText(course.courseGroup)
  const uniqueLocations = Array.from(new Set(course.courseGroup.entries.map((entry) => entry.location).filter(Boolean)))
  const uniqueTeachers = Array.from(new Set(course.courseGroup.entries.map((entry) => entry.teacher).filter(Boolean)))
  const rows = [
    { label: '成员', value: memberText },
    { label: '节次', value: `${course.startSection}–${course.endSection} 节` },
    { label: '周次', value: course.courseGroup.weeksText },
    ...(uniqueLocations.length > 0 ? [{ label: '地点', value: uniqueLocations.join(' / ') }] : []),
    ...(uniqueTeachers.length > 0 ? [{ label: '教师', value: uniqueTeachers.join(' / ') }] : []),
  ]

  return {
    id: course.id,
    type: 'course',
    title: course.courseGroup.courseName,
    subtitle: memberText,
    rows,
  }
}

function getScheduleConflictDetail(
  id: string,
  courses: ScheduleVisualCourse[],
  startSection: number,
  endSection: number,
): SelectedScheduleDetail {
  const summary = getScheduleConflictSummary(courses)
  const courseText = summary.courseNames.join('、')
  const memberText = summary.memberNames.join('、')

  return {
    id,
    type: 'conflict',
    title: summary.title,
    subtitle: `${startSection}–${endSection} 节`,
    rows: [
      { label: '课程', value: courseText },
      { label: '成员', value: memberText },
      { label: '节次', value: `${startSection}–${endSection} 节` },
    ],
    courses: courses.map((course) => ({
      id: course.id,
      title: course.courseGroup.courseName,
      meta: `${course.startSection}–${course.endSection} 节 · ${getScheduleCourseMemberText(course.courseGroup)} · ${course.courseGroup.weeksText}`,
    })),
  }
}

function getScheduleLoadClass(loadTone: ProductivityPersonModel['loadTone'] | undefined) {
  return `schedule-load-${loadTone || 'calm'}`
}

function getScheduleOverlapClass(overlapCount: number, overlapRanks: number[]) {
  if (overlapCount <= 1) return 'schedule-load-calm'
  const rank = overlapRanks.indexOf(overlapCount)
  if (rank === 0) return 'schedule-load-tight'
  if (rank === 1) return 'schedule-load-busy'
  if (rank === 2) return 'schedule-load-steady'
  return 'schedule-load-calm'
}

function buildImportedPerson(parsed: Awaited<ReturnType<typeof extractSchedulePdf>>, existing: LegacyPerson | undefined) {
  const timestamp = now()

  return {
    id: existing?.id || uid(),
    name: parsed.personName || existing?.name || '未命名成员',
    className: parsed.className || existing?.className || '',
    studentNo: parsed.studentNo || existing?.studentNo || '',
    email: existing?.email || '',
    gender: existing?.gender || '',
    status: existing?.status || 'active',
    skills: existing?.skills || [],
    notes: existing?.notes || '',
    createdAt: existing?.createdAt || timestamp,
    updatedAt: timestamp,
  } satisfies LegacyPerson
}

function readStoredTermStartDate() {
  if (typeof window === 'undefined') return DEFAULT_TERM_START_DATE
  return window.localStorage.getItem(TERM_START_STORAGE_KEY) || DEFAULT_TERM_START_DATE
}

export function Productivity() {
  const snapshot = useLegacyStoreSnapshot()
  const { people, tasks, classSchedules } = snapshot
  const { toast } = useToast()
  const { confirm } = useConfirm()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [mode, setMode] = useState<ViewMode>('cards')
  const [page, setPage] = useState(0)
  const [flippedPersonIds, setFlippedPersonIds] = useState<Set<string>>(() => new Set())
  const [selectedPersonIds, setSelectedPersonIds] = useState<string[]>([])
  const [termStartDate, setTermStartDate] = useState(readStoredTermStartDate)
  const [isImporting, setIsImporting] = useState(false)
  const [showScheduleDialog, setShowScheduleDialog] = useState(false)
  const [openScheduleMenu, setOpenScheduleMenu] = useState<'people' | 'management' | 'week' | null>(null)

  const todayDate = useTodayDate()
  const today = formatLocalDateKey(todayDate)
  const personModels = useMemo(
    () => buildProductivityPersonModels(people, tasks, today),
    [people, tasks, today],
  )
  const totalPages = Math.max(1, Math.ceil(personModels.length / PAGE_SIZE))
  const pageModels = personModels.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)
  const currentWeek = getWeekNumber(termStartDate, todayDate)
  const scheduleSummaries = useMemo(
    () => buildScheduleOwnerSummaries(people, classSchedules),
    [classSchedules, people],
  )
  const visiblePersonIds = useMemo(
    () => selectedPersonIds.length > 0 ? selectedPersonIds : personModels.map((person) => person.id),
    [personModels, selectedPersonIds],
  )
  const visibleSchedules = useMemo(() => {
    const visiblePersonIdSet = new Set(visiblePersonIds)
    return mergeScheduleEntries(classSchedules)
      .filter((entry) => visiblePersonIdSet.has(entry.personId))
      .filter((entry) => weekTextApplies(entry.weeksText, currentWeek))
  }, [classSchedules, currentWeek, visiblePersonIds])

  const toggleFlip = (personId: string) => {
    setFlippedPersonIds((current) => {
      const next = new Set(current)
      if (next.has(personId)) {
        next.delete(personId)
      } else {
        next.add(personId)
      }
      return next
    })
  }

  const importSchedules = async (files: FileList | null) => {
    if (!files?.length) return
    setIsImporting(true)

    try {
      const knownPeople = [...people]
      let importedCount = 0

      for (const file of Array.from(files)) {
        const parsed = await extractSchedulePdf(file)
        if (!parsed.personName || !parsed.entries.length) continue

        const existing = knownPeople.find((person) =>
          (parsed.studentNo && person.studentNo === parsed.studentNo) || person.name === parsed.personName,
        )
        const savedPerson = buildImportedPerson(parsed, existing)
        await store.savePerson(savedPerson)

        const entries: ClassScheduleEntry[] = parsed.entries.map((entry) => ({
          id: uid(),
          personId: savedPerson.id,
          personName: savedPerson.name || parsed.personName,
          studentNo: savedPerson.studentNo || parsed.studentNo,
          className: savedPerson.className || parsed.className,
          courseName: entry.courseName,
          dayOfWeek: entry.dayOfWeek,
          startSection: entry.startSection,
          endSection: entry.endSection,
          weeksText: entry.weeksText,
          location: entry.location,
          teacher: entry.teacher,
          sourceFileName: file.name,
          createdAt: now(),
          updatedAt: now(),
        }))

        await store.replaceClassSchedulesForPerson(savedPerson.id, entries)
        const knownIndex = knownPeople.findIndex((person) => person.id === savedPerson.id)
        if (knownIndex >= 0) knownPeople[knownIndex] = savedPerson
        else knownPeople.push(savedPerson)
        importedCount += 1
      }

      if (importedCount > 0) {
        await store.addLog(`导入课表 ${importedCount} 份`)
        toast(`已导入 ${importedCount} 份`, 'success')
      } else {
        toast('未识别课表', 'error')
      }
    } catch (error) {
      console.error('[118SM] 课表导入失败:', error)
      toast('导入失败', 'error')
    } finally {
      setIsImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleSaveManualSchedule = async (form: ScheduleFormState) => {
    const person = people.find((item) => item.id === form.personId)
    if (!person) {
      toast('请选择成员', 'error')
      return
    }
    if (!form.courseName.trim()) {
      toast('请填写课程', 'error')
      return
    }
    if (form.endSection < form.startSection) {
      toast('节次不正确', 'error')
      return
    }

    const timestamp = now()
    await store.saveClassScheduleEntry({
      id: uid(),
      personId: person.id,
      personName: person.name || '未命名成员',
      studentNo: person.studentNo || '',
      className: person.className || '',
      courseName: form.courseName.trim(),
      dayOfWeek: form.dayOfWeek,
      startSection: form.startSection,
      endSection: form.endSection,
      weeksText: form.weeksText.trim() || '整学期',
      location: form.location.trim(),
      teacher: form.teacher.trim(),
      sourceFileName: '手动添加',
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    await store.addLog(`添加课表「${form.courseName.trim()}」`)
    setShowScheduleDialog(false)
    toast('课表已添加', 'success')
  }

  const handleExportSchedules = (personId?: string) => {
    const entries = personId
      ? classSchedules.filter((entry) => entry.personId === personId)
      : classSchedules
    if (entries.length === 0) {
      toast('暂无课表', 'info')
      return
    }

    const owner = personId ? scheduleSummaries.find((item) => item.personId === personId) : null
    const suffix = owner?.personName ? `-${owner.personName}` : ''
    downloadFile(JSON.stringify({
      exportedAt: now(),
      classSchedules: entries,
    }, null, 2), `118-class-schedules${suffix}-${formatFileDate(new Date())}.json`)
    toast('课表已导出', 'success')
  }

  const handleDeleteSchedulesForPerson = async (personId: string, personName: string) => {
    const ok = await confirm('删除课表', `将删除「${personName}」的课表，是否继续？`, {
      confirmLabel: '删除',
      tone: 'danger',
    })
    if (!ok) return

    await store.deleteClassSchedulesForPerson(personId)
    await store.addLog(`删除课表「${personName}」`)
    setSelectedPersonIds((current) => current.filter((id) => id !== personId))
    toast('课表已删除', 'success')
  }

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages - 1))
  }, [totalPages])

  useEffect(() => {
    window.localStorage.setItem(TERM_START_STORAGE_KEY, termStartDate)
  }, [termStartDate])

  return (
    <div className="productivity-view">
      <div className="view-header productivity-header">
        <h1 className="view-title">工效</h1>
        <div className="view-actions">
          <input
            ref={fileInputRef}
            className="visually-hidden"
            type="file"
            accept="application/pdf"
            multiple
            onChange={(event) => void importSchedules(event.currentTarget.files)}
          />
          <button className="btn btn-primary" type="button" disabled={isImporting} onClick={() => fileInputRef.current?.click()}>
            {isImporting ? '导入中' : '导入课表'}
          </button>
        </div>
      </div>
      <div className="productivity-subbar">
        <div className="productivity-subbar-main">
          <div className="segmented-control" aria-label="工效视图">
            <button className={mode === 'cards' ? 'active' : ''} type="button" onClick={() => setMode('cards')}>卡片</button>
            <button className={mode === 'schedule' ? 'active' : ''} type="button" onClick={() => setMode('schedule')}>课表</button>
          </div>
          {mode === 'schedule' ? (
            <div className="schedule-subbar-tools">
              <details
                className="schedule-week-menu"
                open={openScheduleMenu === 'week'}
                onToggle={(event) => setOpenScheduleMenu(event.currentTarget.open ? 'week' : null)}
              >
                <summary className="schedule-week-pill">第 {currentWeek} 周</summary>
                <div className="schedule-week-panel">
                  <label className="schedule-week-field">
                    <span>学期开始</span>
                    <input
                      type="date"
                      value={termStartDate}
                      onChange={(event) => setTermStartDate(event.currentTarget.value || DEFAULT_TERM_START_DATE)}
                    />
                  </label>
                </div>
              </details>
              <SchedulePersonFilter
                isOpen={openScheduleMenu === 'people'}
                people={personModels}
                selectedPersonIds={selectedPersonIds}
                onOpenChange={(isOpen) => setOpenScheduleMenu(isOpen ? 'people' : null)}
                onClearPeople={() => setSelectedPersonIds([])}
                onTogglePerson={(personId) => setSelectedPersonIds((current) => {
                  if (current.includes(personId)) return current.filter((id) => id !== personId)
                  return [...current, personId]
                })}
              />
              <ScheduleManagementMenu
                isOpen={openScheduleMenu === 'management'}
                summaries={scheduleSummaries}
                onOpenChange={(isOpen) => setOpenScheduleMenu(isOpen ? 'management' : null)}
                onDeleteSchedulesForPerson={handleDeleteSchedulesForPerson}
                onExportSchedules={handleExportSchedules}
              />
              <button className="btn btn-secondary btn-sm" type="button" onClick={() => setShowScheduleDialog(true)}>添加</button>
              <button className="btn btn-secondary btn-sm" type="button" onClick={() => handleExportSchedules()}>导出全部</button>
            </div>
          ) : null}
        </div>
        {mode === 'schedule' ? (
          <div className="productivity-statline">
            <span>{personModels.length} 人</span>
            <span>{classSchedules.length} 条课表</span>
          </div>
        ) : null}
      </div>

      {mode === 'cards' ? (
        <ProductivityCardsView
          flippedPersonIds={flippedPersonIds}
          page={page}
          pageModels={pageModels}
          setPage={setPage}
          totalPages={totalPages}
          onFlip={toggleFlip}
        />
      ) : (
        <ProductivityScheduleView
          schedules={visibleSchedules}
        />
      )}
      {showScheduleDialog ? (
        <ScheduleEntryDialog
          people={people.filter((person) => person.status !== 'inactive')}
          onClose={() => setShowScheduleDialog(false)}
          onSave={handleSaveManualSchedule}
        />
      ) : null}
    </div>
  )
}

function ProductivityCardsView({
  flippedPersonIds,
  page,
  pageModels,
  setPage,
  totalPages,
  onFlip,
}: {
  flippedPersonIds: Set<string>
  page: number
  pageModels: ProductivityPersonModel[]
  setPage: Dispatch<SetStateAction<number>>
  totalPages: number
  onFlip: (personId: string) => void
}) {
  const placeholders = Math.max(0, PAGE_SIZE - pageModels.length)
  const contentRef = useRef<HTMLDivElement>(null)
  const wheelAccum = useRef(0)
  const wheelLock = useRef(false)

  useEffect(() => {
    const el = contentRef.current
    if (!el || totalPages <= 1) return
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      if (wheelLock.current) return
      wheelAccum.current += event.deltaY
      if (Math.abs(wheelAccum.current) < 40) return
      const dir = wheelAccum.current > 0 ? 1 : -1
      wheelAccum.current = 0
      wheelLock.current = true
      window.setTimeout(() => { wheelLock.current = false }, 300)
      setPage((current) => {
        const next = current + dir
        if (next < 0 || next >= totalPages) return current
        return next
      })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [setPage, totalPages])

  return (
    <div className="productivity-cards-shell">
      <div className="productivity-card-stage" ref={contentRef}>
        <div className="productivity-card-grid">
          {pageModels.map((person) => (
            <button
              key={person.id}
              className={`productivity-person-card load-${person.loadTone}${flippedPersonIds.has(person.id) ? ' is-flipped' : ''}`}
              type="button"
              onClick={() => onFlip(person.id)}
            >
              {hasSquidPersonName(person.name) ? <SquidMark className="squid-mark--productivity-card" variant={getSquidVariant(person.id)} /> : null}
              <span className="productivity-card-inner">
                <span className="productivity-card-face productivity-card-front">
                  <span className="productivity-card-top">
                    <strong>{person.name}</strong>
                    <span>{person.className}</span>
                  </span>
                  <span className="productivity-load-row">
                    <span>{person.loadLabel}</span>
                    <strong>{person.loadScore}</strong>
                  </span>
                  <span className="productivity-card-metrics">
                    <span><b>{person.openTaskCount}</b>任务</span>
                    <span><b>{person.urgentTaskCount}</b>紧急</span>
                  </span>
                </span>
                <span className="productivity-card-face productivity-card-back">
                  <span className="productivity-detail-list">
                    <span><b>姓名</b>{person.name}</span>
                    <span><b>班级</b>{person.className}</span>
                    <span><b>学号</b>{person.studentNo}</span>
                    <span><b>邮箱</b>{person.email}</span>
                    <span><b>技能</b>{person.skills.length ? person.skills.slice(0, 4).join('、') : '未填'}</span>
                  </span>
                </span>
              </span>
            </button>
          ))}
          {Array.from({ length: placeholders }, (_, index) => (
            <div key={`productivity-placeholder-${index}`} className="productivity-card-placeholder" />
          ))}
        </div>
      </div>
      {totalPages > 1 ? (
        <div className="productivity-page-dots">
          {Array.from({ length: totalPages }, (_, index) => (
            <button
              key={index}
              className={`productivity-page-dot${index === page ? ' productivity-page-dot--active' : ''}`}
              type="button"
              aria-label={`第 ${index + 1} 页`}
              onClick={() => setPage(index)}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}

function ScheduleManagementMenu({
  isOpen,
  summaries,
  onOpenChange,
  onDeleteSchedulesForPerson,
  onExportSchedules,
}: {
  isOpen: boolean
  summaries: ScheduleOwnerSummary[]
  onOpenChange: (isOpen: boolean) => void
  onDeleteSchedulesForPerson: (personId: string, personName: string) => void
  onExportSchedules: (personId?: string) => void
}) {
  const summaryText = summaries.length === 0
    ? '暂无课表'
    : `${summaries.length} 人 · ${summaries.reduce((sum, item) => sum + item.entryCount, 0)} 条`

  if (summaries.length === 0) {
    return (
      <details className="schedule-management-menu schedule-management-menu--empty" open={isOpen}>
        <summary
          aria-expanded={isOpen}
          onClick={(event) => {
            event.preventDefault()
            onOpenChange(!isOpen)
          }}
        >
          <span>课表管理</span>
          <strong>{summaryText}</strong>
        </summary>
      </details>
    )
  }

  return (
    <details className="schedule-management-menu" open={isOpen}>
      <summary
        aria-expanded={isOpen}
        onClick={(event) => {
          event.preventDefault()
          onOpenChange(!isOpen)
        }}
      >
        <span>课表管理</span>
        <strong>{summaryText}</strong>
      </summary>
      <div className="schedule-management-panel">
        {summaries.map((summary) => (
          <div key={summary.personId} className="schedule-management-item">
            <span className="schedule-management-main">
              <strong>{summary.personName}</strong>
              <span>{summary.courseCount} 门 · {summary.entryCount} 条</span>
            </span>
            <span className="schedule-management-actions">
              <button type="button" onClick={() => onExportSchedules(summary.personId)}>导出</button>
              <button className="danger" type="button" onClick={() => onDeleteSchedulesForPerson(summary.personId, summary.personName)}>删除</button>
            </span>
          </div>
        ))}
      </div>
    </details>
  )
}

function SchedulePersonFilter({
  isOpen,
  people,
  selectedPersonIds,
  onOpenChange,
  onClearPeople,
  onTogglePerson,
}: {
  isOpen: boolean
  people: ProductivityPersonModel[]
  selectedPersonIds: string[]
  onOpenChange: (isOpen: boolean) => void
  onClearPeople: () => void
  onTogglePerson: (personId: string) => void
}) {
  const selectedLabel = selectedPersonIds.length === 0 ? '全部成员' : `已选 ${selectedPersonIds.length} 人`

  return (
    <details className="schedule-person-filter" open={isOpen}>
      <summary
        aria-expanded={isOpen}
        onClick={(event) => {
          event.preventDefault()
          onOpenChange(!isOpen)
        }}
      >
        <span>成员</span>
        <strong>{selectedLabel}</strong>
      </summary>
      <div className="schedule-person-panel">
        <button
          className={`schedule-person-panel-button schedule-person-panel-all${selectedPersonIds.length === 0 ? ' active' : ''}`}
          type="button"
          onClick={onClearPeople}
        >
          全部成员
        </button>
        {people.map((person) => {
          const isSelected = selectedPersonIds.includes(person.id)
          return (
            <button
              key={person.id}
              className={`schedule-person-panel-button ${getScheduleLoadClass(person.loadTone)}${isSelected ? ' active' : ''}`}
              type="button"
              onClick={() => onTogglePerson(person.id)}
            >
              <span className="schedule-person-dot" />
              {person.name}
            </button>
          )
        })}
      </div>
    </details>
  )
}

function createInitialScheduleForm(people: LegacyPerson[]): ScheduleFormState {
  return {
    personId: people[0]?.id || '',
    courseName: '',
    dayOfWeek: 1,
    startSection: 1,
    endSection: 2,
    weeksText: '1-16周',
    location: '',
    teacher: '',
  }
}

function ScheduleEntryDialog({
  people,
  onClose,
  onSave,
}: {
  people: LegacyPerson[]
  onClose: () => void
  onSave: (form: ScheduleFormState) => Promise<void>
}) {
  const [form, setForm] = useState<ScheduleFormState>(() => createInitialScheduleForm(people))
  const updateForm = <K extends keyof ScheduleFormState>(key: K, value: ScheduleFormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }))
  }
  const updateTextField = (key: ScheduleTextField) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = event.currentTarget.value
    updateForm(key, value)
  }
  const updateNumberField = (key: ScheduleNumberField) => (event: ChangeEvent<HTMLSelectElement>) => {
    const value = Number(event.currentTarget.value)
    updateForm(key, value)
  }

  return (
    <Dialog
      open
      title="添加课表"
      onClose={onClose}
      footer={(
        <>
          <button className="btn btn-secondary" type="button" onClick={onClose}>取消</button>
          <button className="btn btn-primary" type="button" onClick={() => void onSave(form)}>添加</button>
        </>
      )}
    >
      <div className="form-grid schedule-entry-form">
        <div className="form-field">
          <label className="form-label" htmlFor="schedule-person">成员</label>
          <select
            id="schedule-person"
            className="form-input"
            value={form.personId}
            onChange={updateTextField('personId')}
          >
            {people.length === 0 ? <option value="">暂无成员</option> : null}
            {people.map((person) => (
              <option key={person.id} value={person.id}>{person.name || '未命名成员'}</option>
            ))}
          </select>
        </div>
        <div className="form-field">
          <label className="form-label" htmlFor="schedule-course">课程 *</label>
          <input
            id="schedule-course"
            className="form-input"
            value={form.courseName}
            onChange={updateTextField('courseName')}
          />
        </div>
        <div className="form-field">
          <label className="form-label" htmlFor="schedule-day">星期</label>
          <select
            id="schedule-day"
            className="form-input"
            value={form.dayOfWeek}
            onChange={updateNumberField('dayOfWeek')}
          >
            {WEEKDAYS.map((day, index) => (
              <option key={day} value={index + 1}>周{day}</option>
            ))}
          </select>
        </div>
        <div className="form-field schedule-section-range">
          <label className="form-label" htmlFor="schedule-start">节次</label>
          <div className="schedule-section-inputs">
            <select
              id="schedule-start"
              className="form-input"
              value={form.startSection}
              onChange={updateNumberField('startSection')}
            >
              {SECTIONS.map((section) => <option key={section} value={section}>{section}</option>)}
            </select>
            <span>至</span>
            <select
              className="form-input"
              value={form.endSection}
              onChange={updateNumberField('endSection')}
            >
              {SECTIONS.map((section) => <option key={section} value={section}>{section}</option>)}
            </select>
          </div>
        </div>
        <div className="form-field">
          <label className="form-label" htmlFor="schedule-weeks">周次</label>
          <input
            id="schedule-weeks"
            className="form-input"
            value={form.weeksText}
            onChange={updateTextField('weeksText')}
          />
        </div>
        <div className="form-field">
          <label className="form-label" htmlFor="schedule-location">地点</label>
          <input
            id="schedule-location"
            className="form-input"
            value={form.location}
            onChange={updateTextField('location')}
          />
        </div>
        <div className="form-field span2">
          <label className="form-label" htmlFor="schedule-teacher">教师</label>
          <input
            id="schedule-teacher"
            className="form-input"
            value={form.teacher}
            onChange={updateTextField('teacher')}
          />
        </div>
      </div>
    </Dialog>
  )
}

function ScheduleCourseContent({
  courseGroup,
  isCompact,
}: {
  courseGroup: ScheduleCourseGroup
  isCompact: boolean
}) {
  const memberText = getScheduleCourseMemberText(courseGroup)

  return (
    <span
      className={`schedule-course-content${isCompact ? ' schedule-course-content--compact' : ''}`}
    >
      <strong className="schedule-stack-name schedule-course-title">{courseGroup.courseName}</strong>
      <span className="schedule-course-person">{memberText}</span>
    </span>
  )
}

function getScheduleConflictSummary(courses: ScheduleVisualCourse[]) {
  const courseNames = Array.from(new Set(courses.map((course) => course.courseGroup.courseName).filter(Boolean)))
  const memberNames = Array.from(new Set(
    courses.flatMap((course) =>
      course.courseGroup.entries.map((entry) => entry.personName || '未命名成员'),
    ),
  ))
  const fullCourseText = courseNames.join('、')
  const fullMemberText = memberNames.join('、')

  return {
    courseNames,
    memberNames,
    title: `${courseNames.length} 门课`,
    fullCourseText,
    fullMemberText,
    courseText: courseNames.slice(0, 3).join('、') + (courseNames.length > 3 ? ` +${courseNames.length - 3}` : ''),
    memberText: memberNames.slice(0, 4).join('、') + (memberNames.length > 4 ? ` +${memberNames.length - 4}` : ''),
  }
}

function buildScheduleStackStyle(course: ScheduleVisualCourse & {
  topPercent: number
  heightPercent: number
  laneIndex: number
  laneCount: number
  stackIndex: number
  stackCount: number
}) {
  const laneCount = Math.max(1, course.laneCount)
  return {
    '--course-top': `${course.topPercent}%`,
    '--course-height': `${course.heightPercent}%`,
    '--course-dense-offset': `${course.laneIndex * 20}px`,
    '--course-lane-left': `${(course.laneIndex / laneCount) * 100}%`,
    '--course-lane-width': `${100 / laneCount}%`,
    '--course-lane': course.laneIndex,
    '--course-lanes': laneCount,
    '--course-stack': course.stackIndex,
    '--course-stacks': course.stackCount,
  } as CSSProperties
}

function buildScheduleConflictStyle() {
  return {
    '--course-top': '0%',
    '--course-height': '100%',
    '--course-lane': 0,
  } as CSSProperties
}

function getScheduleDetailSide(startSection: number) {
  return startSection >= 8 ? 'top' : 'bottom'
}

function getScheduleDetailAlign(dayIndex: number, dayCount: number) {
  return dayIndex >= dayCount - 2 ? 'right' : 'left'
}

function ProductivityScheduleView({
  schedules,
}: {
  schedules: ClassScheduleEntry[]
}) {
  const shellRef = useRef<HTMLDivElement>(null)
  const [selectedState, setSelectedState] = useState<SelectedScheduleState | null>(null)
  const visibleWeekdays = useMemo(() => {
    const hasWeekendSchedule = schedules.some((entry) => entry.dayOfWeek >= 6)
    return WEEKDAYS
      .map((day, index) => ({ day, dayOfWeek: index + 1 }))
      .filter((item) => hasWeekendSchedule || item.dayOfWeek <= 5)
  }, [schedules])
  const visibleWeekdayIndexByDay = useMemo(
    () => new Map(visibleWeekdays.map((item, index) => [item.dayOfWeek, index])),
    [visibleWeekdays],
  )
  const scheduleClusters = useMemo(() => {
    const visibleDaySet = new Set(visibleWeekdays.map((item) => item.dayOfWeek))
    const groups = new Map<string, ClassScheduleEntry[]>()
    for (const entry of schedules) {
      if (!visibleDaySet.has(entry.dayOfWeek)) continue
      const key = `${entry.dayOfWeek}-${entry.startSection}-${entry.endSection}`
      groups.set(key, [...(groups.get(key) || []), entry])
    }
    const baseGroups = Array.from(groups.entries()).map(([key, entries]) => {
      const [dayText, startText, endText] = key.split('-')
      return {
        dayOfWeek: Number(dayText),
        startSection: Number(startText),
        endSection: Number(endText),
        courseGroups: groupScheduleCourses(entries),
      }
    })

    return buildScheduleClusters(baseGroups)
  }, [schedules, visibleWeekdays])
  const scheduleClusterItems = useMemo(() => {
    const items = scheduleClusters.map((cluster) => {
      const visualCourses: ScheduleVisualCourse[] = cluster.groups.flatMap((group) =>
        group.courseGroups.map((courseGroup) => ({
          id: `${scheduleGroupKey(group)}-${courseGroup.id}`,
          startSection: group.startSection,
          endSection: group.endSection,
          courseGroup,
        })),
      )
      const layoutCourses = buildScheduleCourseLayouts(visualCourses, cluster)
      const shouldGroupConflict = layoutCourses.length >= 2 || layoutCourses.some((course) => course.laneCount >= 2)

      return {
        cluster,
        visualCourses,
        layoutCourses,
        conflictSummary: shouldGroupConflict ? getScheduleConflictSummary(visualCourses) : null,
        overlapCount: Math.max(1, layoutCourses.length),
      }
    })
    const overlapRanks = Array.from(new Set(items.map((item) => item.overlapCount).filter((count) => count > 1)))
      .sort((left, right) => right - left)

    return items.map((item) => ({
      ...item,
      overlapClass: getScheduleOverlapClass(item.overlapCount, overlapRanks),
    }))
  }, [scheduleClusters])
  const buildDetailAnchor = (target: HTMLElement): ScheduleDetailAnchor => {
    const shellRect = shellRef.current?.getBoundingClientRect()
    const targetRect = target.getBoundingClientRect()
    if (!shellRect) return { left: 0, top: 0, side: 'bottom', maxHeight: 280 }
    const panelWidth = Math.min(360, Math.max(280, shellRect.width - 24))
    const left = Math.max(12, Math.min(targetRect.left - shellRect.left, shellRect.width - panelWidth - 12))
    const gap = 8
    const spaceAbove = targetRect.top - shellRect.top - gap - 12
    const spaceBelow = shellRect.bottom - targetRect.bottom - gap - 12
    const side = spaceBelow >= 260 || spaceBelow >= spaceAbove ? 'bottom' : 'top'
    const maxHeight = Math.max(160, Math.min(360, side === 'bottom' ? spaceBelow : spaceAbove))
    const top = side === 'top'
      ? targetRect.top - shellRect.top - 8
      : targetRect.bottom - shellRect.top + 8

    return { left, top, side, maxHeight }
  }
  const toggleSelectedDetail = (detail: SelectedScheduleDetail, target: HTMLElement) => {
    setSelectedState((current) => current?.detail.id === detail.id ? null : {
      detail,
      anchor: buildDetailAnchor(target),
    })
  }

  return (
    <div className="productivity-schedule-shell" ref={shellRef}>
      <div className="weekly-schedule-grid" style={{ '--schedule-day-count': visibleWeekdays.length } as CSSProperties}>
        <div className="schedule-corner" style={{ gridColumn: 1, gridRow: 1 }}>节次</div>
        {visibleWeekdays.map(({ day }, dayIndex) => (
          <div key={day} className="schedule-head" style={{ gridColumn: dayIndex + 2, gridRow: 1 }}>
            周{day}
          </div>
        ))}
        {SECTIONS.map((section) => (
          <Fragment key={`row-${section}`}>
            <div className="schedule-section-label" style={{ gridColumn: 1, gridRow: section + 1 }}>{section}</div>
            {visibleWeekdays.map(({ dayOfWeek }, dayIndex) => {
              return <button key={`${dayOfWeek}-${section}`} className="schedule-cell" type="button" aria-label={`周${WEEKDAYS[dayOfWeek - 1]} 第 ${section} 节`} style={{ gridColumn: dayIndex + 2, gridRow: section + 1 }} onClick={() => setSelectedState(null)} />
            })}
          </Fragment>
        ))}
        {scheduleClusterItems.map(({ cluster, visualCourses, layoutCourses, conflictSummary, overlapClass }) => {
          const span = Math.max(1, cluster.endSection - cluster.startSection + 1)
          const dayIndex = visibleWeekdayIndexByDay.get(cluster.dayOfWeek) ?? 0

          return (
            <div
              key={cluster.id}
              className="schedule-cluster"
              style={{
                gridColumn: (visibleWeekdayIndexByDay.get(cluster.dayOfWeek) ?? 0) + 2,
                gridRow: `${cluster.startSection + 1} / span ${span}`,
                '--cluster-section-count': span,
              } as CSSProperties}
            >
              {conflictSummary ? (
                <div
                  className={`schedule-stack-card schedule-conflict-card ${overlapClass}`}
                  role="button"
                  tabIndex={0}
                  aria-label={`${conflictSummary.memberText}，${conflictSummary.title}，${cluster.startSection} 至 ${cluster.endSection} 节`}
                  aria-pressed={selectedState?.detail.id === cluster.id}
                  data-selected={selectedState?.detail.id === cluster.id ? 'true' : 'false'}
                  data-span={span}
                  data-detail-side={getScheduleDetailSide(cluster.startSection)}
                  data-detail-align={getScheduleDetailAlign(dayIndex, visibleWeekdays.length)}
                  style={buildScheduleConflictStyle()}
                  onClick={(event) => {
                    event.stopPropagation()
                    toggleSelectedDetail(
                      getScheduleConflictDetail(cluster.id, visualCourses, cluster.startSection, cluster.endSection),
                      event.currentTarget,
                    )
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter' && event.key !== ' ') return
                    event.preventDefault()
                    toggleSelectedDetail(
                      getScheduleConflictDetail(cluster.id, visualCourses, cluster.startSection, cluster.endSection),
                      event.currentTarget,
                    )
                  }}
                >
                  <span className="schedule-stack-face schedule-conflict-face">
                    <span className="schedule-conflict-count">{conflictSummary.title}</span>
                    <strong className="schedule-conflict-title" data-short-text={conflictSummary.courseText}>{conflictSummary.fullCourseText}</strong>
                    <span className="schedule-conflict-members" data-short-text={conflictSummary.memberText}>{conflictSummary.fullMemberText}</span>
                  </span>
                </div>
              ) : null}
              {!conflictSummary ? layoutCourses.map((course) => {
                const memberText = getScheduleCourseMemberText(course.courseGroup)
                return (
                  <div
                    key={course.id}
                    className={`schedule-stack-card ${overlapClass}`}
                    role="button"
                    tabIndex={0}
                    aria-label={`${memberText}，${course.courseGroup.courseName}，${course.startSection} 至 ${course.endSection} 节`}
                    aria-pressed={selectedState?.detail.id === course.id}
                    data-selected={selectedState?.detail.id === course.id ? 'true' : 'false'}
                    data-stacks={course.stackCount}
                    data-layout={course.stackCount > 4 ? 'dense' : 'lane'}
                    data-detail-side={getScheduleDetailSide(course.startSection)}
                    data-detail-align={getScheduleDetailAlign(dayIndex, visibleWeekdays.length)}
                    style={buildScheduleStackStyle(course)}
                    onClick={(event) => {
                      event.stopPropagation()
                      toggleSelectedDetail(getScheduleCourseDetail(course), event.currentTarget)
                    }}
                    onKeyDown={(event) => {
                      if (event.key !== 'Enter' && event.key !== ' ') return
                      event.preventDefault()
                      toggleSelectedDetail(getScheduleCourseDetail(course), event.currentTarget)
                    }}
                  >
                    <span className="schedule-stack-face">
                      <ScheduleCourseContent courseGroup={course.courseGroup} isCompact={span <= 2 || course.stackCount >= 3} />
                    </span>
                  </div>
                )
              }) : null}
            </div>
          )
        })}
      </div>
      <ScheduleSelectionDetail state={selectedState} />
    </div>
  )
}

function ScheduleSelectionDetail({ state }: { state: SelectedScheduleState | null }) {
  if (!state) return null
  const { detail, anchor } = state

  return (
    <div
      className="schedule-selection-detail"
      data-side={anchor.side}
      style={{
        '--detail-left': `${anchor.left}px`,
        '--detail-top': `${anchor.top}px`,
        '--detail-max-height': `${anchor.maxHeight}px`,
      } as CSSProperties}
    >
      <div className="schedule-selection-main">
        <span className="schedule-selection-kicker">{detail.type === 'conflict' ? '重叠课程' : '课程明细'}</span>
        <strong>{detail.title}</strong>
        <span>{detail.subtitle}</span>
      </div>
      <div className="schedule-selection-rows">
        {detail.rows.map((row) => (
          <span key={row.label} className="schedule-selection-row">
            <span>{row.label}</span>
            <b>{row.value}</b>
          </span>
        ))}
      </div>
      {detail.courses ? (
        <div className="schedule-selection-courses">
          {detail.courses.map((course) => (
            <span key={course.id} className="schedule-selection-course">
              <b>{course.title}</b>
              <span>{course.meta}</span>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  )
}
