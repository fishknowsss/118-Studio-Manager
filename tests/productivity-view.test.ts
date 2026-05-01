import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'
import { buildProductivityPersonModels, buildScheduleOwnerSummaries } from '../src/features/productivity/productivityModels'
import { buildScheduleCourseLayouts } from '../src/features/productivity/scheduleModels'
import { parseScheduleTextItems, type ScheduleTextItem } from '../src/features/productivity/schedulePdfParser'
import { BACKUP_COLLECTION_NAMES } from '../src/legacy/utils'

async function parseScheduleFixture(fileName: string) {
  const data = new Uint8Array(readFileSync(join(process.cwd(), 'tests/fixtures/schedules', fileName)))
  const pdf = await pdfjsLib.getDocument({
    data,
    cMapUrl: join(process.cwd(), 'node_modules/pdfjs-dist/cmaps') + '/',
    cMapPacked: true,
  }).promise
  const items: ScheduleTextItem[] = []

  for (let pageIndex = 1; pageIndex <= pdf.numPages; pageIndex += 1) {
    const page = await pdf.getPage(pageIndex)
    const content = await page.getTextContent()
    for (const item of content.items) {
      if (!('str' in item) || !item.str.trim()) continue
      items.push({
        str: item.str,
        x: item.transform[4],
        y: item.transform[5],
        pageIndex,
      })
    }
  }

  return parseScheduleTextItems(items)
}

describe('productivity view', () => {
  it('registers the productivity route and sidebar entry', () => {
    const appSource = readFileSync(join(process.cwd(), 'src/App.tsx'), 'utf8')

    expect(appSource).toMatch(/productivity:\s*Productivity/)
    expect(appSource).toMatch(/label="工效"/)
    expect(appSource).toMatch(/M3 19l7-7 3 3 7-8/)
  })

  it('scores person workload from assigned open tasks', () => {
    const models = buildProductivityPersonModels(
      [{ id: 'person-1', name: '陈怡盈', status: 'active', className: '数媒2403', studentNo: '2408240116' }],
      [
        { id: 'task-1', title: '剪辑', assigneeIds: ['person-1'], status: 'in-progress', priority: 'urgent', endDate: '2026-04-24' },
        { id: 'task-2', title: '排版', assigneeIds: ['person-1'], status: 'todo', priority: 'high', endDate: '2026-04-26', estimatedHours: 4 },
        { id: 'task-3', title: '已交付', assigneeIds: ['person-1'], status: 'done', priority: 'urgent' },
      ],
      '2026-04-24',
    )

    expect(models[0]).toMatchObject({
      name: '陈怡盈',
      openTaskCount: 2,
      urgentTaskCount: 2,
      loadTone: 'busy',
    })
  })

  it('keeps card and schedule switching near the content and removes capacity entry controls from cards', () => {
    const source = readFileSync(join(process.cwd(), 'src/views/Productivity.tsx'), 'utf8')
    const storeSource = readFileSync(join(process.cwd(), 'src/legacy/store.ts'), 'utf8')

    expect(source).toMatch(/productivity-subbar/)
    expect(source).toMatch(/productivity-page-dot/)
    expect(source).not.toMatch(/记一笔/)
    expect(source).not.toMatch(/产能/)
    expect(source).not.toMatch(/ProductivityRecordDialog/)
    expect(BACKUP_COLLECTION_NAMES).not.toContain('productivityRecords')
    expect(storeSource).not.toMatch(/type ProductivityRecord/)
    expect(storeSource).not.toMatch(/saveProductivityRecord/)
  })

  it('summarizes imported schedules by person for management actions', () => {
    const summaries = buildScheduleOwnerSummaries(
      [
        { id: 'person-1', name: '陈怡盈', className: '数媒2403', studentNo: '2408240116' },
        { id: 'person-2', name: '李知行', className: '数媒2404' },
      ],
      [
        { id: 'schedule-1', personId: 'person-1', personName: '陈怡盈', courseName: '动画基础', dayOfWeek: 1, startSection: 1, endSection: 2, weeksText: '1-8周' },
        { id: 'schedule-2', personId: 'person-1', personName: '陈怡盈', courseName: '视听语言', dayOfWeek: 3, startSection: 5, endSection: 6, weeksText: '2-12周' },
        { id: 'schedule-3', personId: 'ghost', personName: '未知成员', courseName: '摄影', dayOfWeek: 2, startSection: 3, endSection: 4, weeksText: '1-16周' },
      ],
    )

    expect(summaries).toEqual([
      expect.objectContaining({
        personId: 'person-1',
        personName: '陈怡盈',
        className: '数媒2403',
        studentNo: '2408240116',
        courseCount: 2,
        entryCount: 2,
      }),
      expect.objectContaining({
        personId: 'ghost',
        personName: '未知成员',
        courseCount: 1,
        entryCount: 1,
      }),
    ])
  })

  it('renders overlapping schedule blocks as grouped cards with click details', () => {
    const source = readFileSync(join(process.cwd(), 'src/views/Productivity.tsx'), 'utf8')
    const styleSource = readFileSync(join(process.cwd(), 'css/style.css'), 'utf8')

    expect(source).toMatch(/SchedulePersonFilter/)
    expect(source).toMatch(/schedule-person-filter/)
    expect(source).toMatch(/schedule-person-panel/)
    expect(source).not.toMatch(/schedule-filter-strip/)
    expect(source).not.toMatch(/schedule-filter-chip/)
    expect(source).not.toMatch(/schedule-person-select/)
    expect(source).toMatch(/buildScheduleClusters/)
    expect(source).toMatch(/buildScheduleCourseLayouts/)
    expect(source).toMatch(/schedule-stack-card/)
    expect(source).toMatch(/schedule-stack-name/)
    expect(source).toMatch(/schedule-course-title/)
    expect(source).toMatch(/ScheduleSelectionDetail/)
    expect(source).toMatch(/SelectedScheduleDetail/)
    expect(source).toMatch(/getScheduleConflictSummary/)
    expect(source).toMatch(/getScheduleCourseDetail/)
    expect(source).toMatch(/getScheduleConflictDetail/)
    expect(source).toMatch(/fullCourseText/)
    expect(source).toMatch(/fullMemberText/)
    expect(source).toMatch(/title: `\$\{memberNames\.length\} 人`/)
    expect(source).not.toMatch(/title: `\$\{courseNames\.length\} 门课`/)
    expect(source).toMatch(/data-short-text=\{conflictSummary\.courseText\}/)
    expect(source).toMatch(/summary\.courseNames\.join\('、'\)/)
    expect(source).toMatch(/summary\.memberNames\.join\('、'\)/)
    expect(source).toMatch(/layoutCourses\.length >= 2/)
    expect(source).not.toMatch(/ScheduleCourseHoverDetail/)
    expect(source).not.toMatch(/ScheduleConflictHoverDetail/)
    expect(source).not.toMatch(/schedule-hover-detail/)
    expect(source).not.toMatch(/originX/)
    expect(source).not.toMatch(/originY/)
    expect(source).not.toMatch(/ExpandPanel/)
    expect(source).not.toMatch(/pickOuterScheduleCourse/)
    expect(source).not.toMatch(/getLargestFreeScheduleWindow/)
    expect(source).not.toMatch(/schedule-overlap-card/)
    expect(source).not.toMatch(/schedule-overlap-base/)
    expect(source).not.toMatch(/schedule-overlap-base-label/)
    expect(source).not.toMatch(/schedule-overlap-card--no-free/)
    expect(source).not.toMatch(/schedule-overlap-child/)
    expect(source).toMatch(/ScheduleCourseContent/)
    expect(source).toMatch(/--cluster-section-count/)
    expect(source).toMatch(/--course-top/)
    expect(source).toMatch(/--course-height/)
    expect(source).toMatch(/--course-dense-offset/)
    expect(source).toMatch(/--course-stack/)
    expect(source).toMatch(/--course-stacks/)
    expect(source).not.toMatch(/--course-stack-left/)
    expect(source).not.toMatch(/--course-stack-right/)
    expect(source).toMatch(/--course-lane/)
    expect(source).toMatch(/--course-lanes/)
    expect(source).toMatch(/--course-lane-left/)
    expect(source).toMatch(/--course-lane-width/)
    expect(source).toMatch(/data-layout=\{course\.stackCount > 4 \? 'dense' : 'lane'\}/)
    expect(source).toMatch(/schedule-conflict-card/)
    expect(source).toMatch(/schedule-conflict-face/)
    expect(source).toMatch(/schedule-selection-course/)
    expect(source).toMatch(/\$\{course\.startSection\}–\$\{course\.endSection\} 节 ·/)
    expect(source).toMatch(/weeksText/)
    expect(source).not.toMatch(/--cluster-card-top/)
    expect(source).not.toMatch(/--cluster-card-left/)
    expect(source).not.toMatch(/--cluster-card-width/)
    expect(source).not.toMatch(/\$\{group\.startSection\}-\$\{group\.endSection\}节/)
    expect(source).toMatch(/schedule-course-person/)
    expect(source).toMatch(/groupScheduleCourses/)
    expect(source).toMatch(/getScheduleLoadClass/)
    expect(source).toMatch(/getClusterPersonIds/)
    expect(source).toMatch(/getSchedulePersonLoadClass/)
    expect(source).toMatch(/SchedulePersonCountBadge/)
    expect(source).toMatch(/personCount > 1/)
    expect(source).toMatch(/<SchedulePersonCountBadge personCount=\{personCount\} \/>/)
    expect(source).toMatch(/if \(personCount >= 7\) return 'schedule-load-tight'/)
    expect(source).toMatch(/if \(personCount >= 5\) return 'schedule-load-busy'/)
    expect(source).toMatch(/if \(personCount >= 3\) return 'schedule-load-steady'/)
    expect(source).not.toMatch(/personLoadRanks/)
    expect(source).toMatch(/personCount: Math\.max\(1, getClusterPersonIds\(cluster\)\.length\)/)
    expect(source).not.toMatch(/overlapCount: Math\.max\(1, layoutCourses\.length\)/)
    expect(source).toMatch(/scheduleClusterItems/)
    expect(styleSource).toMatch(/--person-accent/)
    expect(styleSource).toMatch(/\.schedule-load-calm/)
    expect(styleSource).toMatch(/\.schedule-load-tight/)
    expect(styleSource).not.toMatch(/\.schedule-tone-0/)
    expect(styleSource).toMatch(/border-left-width:\s*4px/)
    expect(styleSource).toMatch(/schedule-person-filter/)
    expect(styleSource).toMatch(/schedule-person-panel/)
    expect(source).toMatch(/mode === 'schedule' \? \(/)
    expect(source).toMatch(/schedule-subbar-tools/)
    expect(styleSource).toMatch(/\.schedule-week-menu\s*\{/)
    expect(styleSource).toMatch(/\.schedule-week-panel\s*\{/)
    expect(styleSource).toMatch(/\.schedule-subbar-tools\s*\{[\s\S]*flex-wrap:\s*nowrap/)
    expect(styleSource).toMatch(/\.productivity-subbar\s*\{[\s\S]*position:\s*relative/)
    expect(styleSource).toMatch(/\.productivity-schedule-shell\s*\{[\s\S]*display:\s*block/)
    expect(styleSource).toMatch(/\.weekly-schedule-grid\s*\{[\s\S]*height:\s*100%/)
    expect(styleSource).toMatch(/schedule-stack-card/)
    expect(styleSource).toMatch(/\.schedule-stack-card\[data-layout='dense'\]/)
    expect(styleSource).toMatch(/\.schedule-conflict-card/)
    expect(styleSource).toMatch(/\.schedule-conflict-face/)
    expect(styleSource).toMatch(/\.schedule-conflict-face\s*\{[\s\S]*place-content:\s*center/)
    expect(styleSource).toMatch(/\.schedule-conflict-count\s*\{[\s\S]*position:\s*absolute/)
    expect(styleSource).toMatch(/\.schedule-conflict-count\s*\{[^}]*font-size:\s*14px/)
    expect(styleSource).toMatch(/\.schedule-conflict-title\s*\{[\s\S]*text-align:\s*center/)
    expect(styleSource).toMatch(/\.schedule-conflict-title\s*\{[\s\S]*-webkit-line-clamp:\s*3/)
    expect(styleSource).toMatch(/\.schedule-conflict-members\s*\{[\s\S]*-webkit-line-clamp:\s*2/)
    expect(styleSource).toMatch(/\.schedule-conflict-card\[data-span='1'\]/)
    expect(styleSource).toMatch(/\.schedule-selection-detail\s*\{[\s\S]*position:\s*absolute/)
    expect(styleSource).toMatch(/max-height:\s*min\(var\(--detail-max-height\), 360px\)/)
    expect(styleSource).toMatch(/schedule-detail-enter-bottom/)
    expect(styleSource).toMatch(/schedule-detail-enter-top/)
    expect(styleSource).toMatch(/\.schedule-selection-course/)
    expect(source).toMatch(/tabIndex=\{0\}/)
    expect(styleSource).not.toMatch(/schedule-cluster:focus-within/)
    expect(styleSource).not.toMatch(/schedule-stack-card:focus-within/)
    expect(styleSource).not.toMatch(/schedule-stack-card:focus-visible/)
    expect(styleSource).toMatch(/schedule-stack-card:hover/)
    expect(styleSource).toMatch(/schedule-stack-face/)
    expect(styleSource).not.toMatch(/schedule-hover-detail/)
    expect(styleSource).not.toMatch(/schedule-detail-overlay/)
    expect(styleSource).not.toMatch(/schedule-detail-panel/)
    expect(styleSource).not.toMatch(/schedule-lane-card/)
    expect(styleSource).toMatch(/position:\s*absolute/)
    expect(styleSource).toMatch(/left:\s*calc\(/)
    expect(styleSource).toMatch(/width:\s*max\(44px, calc\(var\(--course-lane-width/)
    expect(styleSource).not.toMatch(/right:\s*calc\(/)
    expect(styleSource).toMatch(/--course-lane-left/)
    expect(styleSource).toMatch(/--course-lane-width/)
    expect(styleSource).toMatch(/\.schedule-course-content\s*\{[\s\S]*grid-template-rows:\s*auto auto/)
    expect(styleSource).toMatch(/place-content:\s*center/)
    expect(styleSource).not.toMatch(/schedule-nested-course/)
    expect(styleSource).not.toMatch(/schedule-overlap-slot/)
    expect(styleSource).not.toMatch(/\.schedule-cluster-card-time/)
    expect(styleSource).not.toMatch(/schedule-overlap-child/)
    expect(styleSource).not.toMatch(/schedule-overlap-base/)
    const personPanelHoverRule = styleSource.match(/\.schedule-person-panel-button:hover\s*\{[^}]*\}/)?.[0] ?? ''
    expect(personPanelHoverRule).not.toMatch(/translateY/)
  })

  it('lays out partial and exact overlaps without trimming section ranges', () => {
    const partial = buildScheduleCourseLayouts(
      [
        { id: 'one-to-three', startSection: 1, endSection: 3 },
        { id: 'three-to-five', startSection: 3, endSection: 5 },
      ],
      { startSection: 1, endSection: 5 },
    )

    expect(partial).toEqual([
      expect.objectContaining({ id: 'one-to-three', topPercent: 0, heightPercent: 60, laneIndex: 0, laneCount: 2, stackIndex: 0, stackCount: 2 }),
      expect.objectContaining({ id: 'three-to-five', topPercent: 40, heightPercent: 60, laneIndex: 1, laneCount: 2, stackIndex: 1, stackCount: 2 }),
    ])

    const exact = buildScheduleCourseLayouts(
      [
        { id: 'first', startSection: 1, endSection: 3 },
        { id: 'second', startSection: 1, endSection: 3 },
        { id: 'third', startSection: 1, endSection: 3 },
      ],
      { startSection: 1, endSection: 3 },
    )

    expect(exact.map((item) => item.topPercent)).toEqual([0, 0, 0])
    expect(exact.map((item) => item.heightPercent)).toEqual([100, 100, 100])
    expect(exact.map((item) => item.laneIndex)).toEqual([0, 1, 2])
    expect(exact.every((item) => item.laneCount === 3)).toBe(true)
    expect(exact.map((item) => item.stackIndex)).toEqual([0, 1, 2])
    expect(exact.every((item) => item.stackCount === 3)).toBe(true)
  })

  it('filters schedules by current week and fixes the timetable grid placement explicitly', () => {
    const source = readFileSync(join(process.cwd(), 'src/views/Productivity.tsx'), 'utf8')
    const styleSource = readFileSync(join(process.cwd(), 'css/style.css'), 'utf8')

    expect(source).toMatch(/DEFAULT_TERM_START_DATE = '2026-03-02'/)
    expect(source).toMatch(/filter\(\(entry\) => weekTextApplies\(entry\.weeksText, currentWeek\)\)/)
    expect(source).not.toMatch(/scheduleScope/)
    expect(source).not.toMatch(/onScheduleScopeChange/)
    expect(source).toMatch(/DatePicker/)
    expect(source).not.toMatch(/type="date"/)
    expect(source).toMatch(/schedule-week-menu/)
    expect(source).toMatch(/schedule-week-panel/)
    expect(source).toMatch(/schedule-week-field/)
    expect(source).not.toMatch(/schedule-term-start/)
    expect(source).toMatch(/visibleWeekdays/)
    expect(source).toMatch(/dayOfWeek >= 6/)
    expect(source).toMatch(/'--schedule-day-count': visibleWeekdays\.length/)
    expect(source).toMatch(/gridColumn: 1, gridRow: section \+ 1/)
    expect(source).not.toMatch(/'--schedule-row-h'/)
    expect(source).not.toMatch(/schedule-row-fragment/)
    expect(source).not.toMatch(/courseGroup\.location/)
    expect(source).not.toMatch(/courseGroup\.teacher/)
    expect(styleSource).toMatch(/repeat\(var\(--schedule-day-count\), minmax\(168px, 1fr\)\)/)
    expect(styleSource).toMatch(/grid-template-rows:\s*46px repeat\(12, minmax\(0, 1fr\)\)/)
    expect(styleSource).toMatch(/\.date-picker-popover\s*\{[\s\S]*animation:\s*date-picker-popover-in/)
    expect(styleSource).toMatch(/@keyframes date-picker-popover-in/)
    expect(styleSource).not.toMatch(/--schedule-row-h/)
    expect(styleSource).toMatch(/schedule-stack-name/)
    expect(styleSource).toMatch(/justify-content:\s*center/)
  })

  it('keeps schedule management local-first with add, delete, export, and live date refresh', () => {
    const source = readFileSync(join(process.cwd(), 'src/views/Productivity.tsx'), 'utf8')
    const styleSource = readFileSync(join(process.cwd(), 'css/style.css'), 'utf8')
    const parserSource = readFileSync(join(process.cwd(), 'src/features/productivity/schedulePdfParser.ts'), 'utf8')
    const viteConfigSource = readFileSync(join(process.cwd(), 'vite.config.ts'), 'utf8')

    expect(source).toMatch(/useTodayDate/)
    expect(source).toMatch(/ScheduleEntryDialog/)
    expect(source).toMatch(/buildScheduleOwnerSummaries/)
    expect(source).toMatch(/handleExportSchedules/)
    expect(source).toMatch(/handleDeleteSchedulesForPerson/)
    expect(source).toMatch(/课表管理/)
    expect(source).toMatch(/ScheduleManagementMenu/)
    expect(source).toMatch(/schedule-management-menu/)
    expect(source).toMatch(/schedule-management-panel/)
    expect(source).toMatch(/<ScheduleManagementMenu[\s\S]*onClick=\{\(\) => setShowScheduleDialog\(true\)\}>添加/)
    expect(source).toMatch(/onClick=\{\(\) => handleExportSchedules\(\)\}>导出全部/)
    expect(source).not.toMatch(/schedule-management-list/)
    expect(source).not.toMatch(/setForm\(\(current\) => \(\{ \.\.\.current,[^}]*event\.currentTarget/)
    expect(source).toMatch(/const value = event\.currentTarget\.value/)
    expect(styleSource).toMatch(/\.productivity-subbar\s*\{[\s\S]*flex-wrap:\s*wrap/)
    expect(styleSource).toMatch(/\.schedule-management-menu\s*\{/)
    expect(styleSource).toMatch(/\.schedule-management-panel\s*\{/)
    expect(parserSource).not.toMatch(/cdn\.jsdelivr\.net/)
    expect(parserSource).toMatch(/cMapUrl:\s*getPdfCMapUrl\(\)/)
    expect(parserSource).toMatch(/cMapPacked:\s*true/)
    expect(viteConfigSource).toMatch(/pdfjsCMapPlugin/)
    expect(viteConfigSource).toMatch(/pdfjs\/cmaps/)
  })

  it('parses the current school schedule text item shape', () => {
    const parsed = parseScheduleTextItems([
      { str: '2025-2026学年第2学期', x: 42, y: 21 },
      { str: '学号：2408240116', x: 42, y: 701 },
      { str: '陈怡盈课表', x: 50, y: 361 },
      { str: '星期一', x: 74, y: 133 },
      { str: '星期二', x: 74, y: 237 },
      { str: '星期三', x: 74, y: 341 },
      { str: '星期四', x: 74, y: 445 },
      { str: '星期五', x: 74, y: 548 },
      { str: '星期六', x: 74, y: 652 },
      { str: '星期日', x: 74, y: 756 },
      { str: '动画基础◆', x: 90, y: 208 },
      { str: '(1-5节)1-4周/校区:下沙/场', x: 102, y: 208 },
      { str: '地:艺术楼417/教师:郑妙/教', x: 114, y: 208 },
      { str: '学班:(2025-2026-2)-DMA072-02/教学班组成:数媒2403/考核方式:考查', x: 126, y: 208 },
      { str: '马克思主义基本原理◆', x: 201, y: 519 },
      { str: '(3-5节)1-16周/校区:下沙/场地:D219/教师:肖小芳/教学班:(2025-2026-2)-IPT012-26/教学班组成:无专业/考核方式:未安排', x: 213, y: 519 },
    ])

    expect(parsed).toMatchObject({
      personName: '陈怡盈',
      studentNo: '2408240116',
      className: '数媒2403',
    })
    expect(parsed.entries).toEqual([
      expect.objectContaining({
        courseName: '动画基础',
        dayOfWeek: 2,
        startSection: 1,
        endSection: 5,
        weeksText: '1-4周',
        location: '艺术楼417',
        teacher: '郑妙',
      }),
      expect.objectContaining({
        courseName: '马克思主义基本原理',
        dayOfWeek: 5,
        startSection: 3,
        endSection: 5,
        weeksText: '1-16周',
      }),
    ])
  })

  it('rebuilds course names split before a PDF course marker', () => {
    const parsed = parseScheduleTextItems([
      { str: '2025-2026学年第2学期', x: 42, y: 21 },
      { str: '学号：2308240116', x: 42, y: 701 },
      { str: '刘永元课表', x: 50, y: 361 },
      { str: '星期一', x: 74, y: 133 },
      { str: '星期二', x: 74, y: 237 },
      { str: '星期三', x: 74, y: 341 },
      { str: '星期四', x: 74, y: 445 },
      { str: '星期五', x: 74, y: 548 },
      { str: '星期六', x: 74, y: 652 },
      { str: '星期日', x: 74, y: 756 },
      { str: '大学生就业与创业指导', x: 143, y: 104 },
      { str: '◆', x: 156, y: 104 },
      { str: '(6-7节)1-8周/校区:下沙/场', x: 168, y: 104 },
      { str: '地:管理225/教师:冯鹏举/教', x: 180, y: 104 },
      { str: '学班:(2025-2026-2)-CDE002-52/教学班组成:数媒2301', x: 192, y: 104 },
      { str: '美学导论—从科学走向', x: 143, y: 416 },
      { str: '艺术◆', x: 156, y: 416 },
      { str: '(6-8节)1-8周,10-12周(双)/校区:下沙/场地:D224/教师:竺乐庆/教学班:(2025-2026-2)-GENNET063-01', x: 168, y: 416 },
      { str: '大脑的奥秘：神经科学', x: 143, y: 519 },
      { str: '导论◆', x: 156, y: 519 },
      { str: '(6-8节)1-16周/校区:下沙/场地:D225/教师:测试', x: 168, y: 519 },
    ])

    expect(parsed.entries).toEqual([
      expect.objectContaining({
        courseName: '大学生就业与创业指导',
        dayOfWeek: 1,
        startSection: 6,
        endSection: 7,
        weeksText: '1-8周',
      }),
      expect.objectContaining({
        courseName: '美学导论—从科学走向艺术',
        dayOfWeek: 4,
        startSection: 6,
        endSection: 8,
        weeksText: '1-8周,10-12周(双)',
      }),
      expect.objectContaining({
        courseName: '大脑的奥秘：神经科学导论',
        dayOfWeek: 5,
        startSection: 6,
        endSection: 8,
        weeksText: '1-16周',
      }),
    ])
  })

  it('parses section ranges with full-width punctuation from schedule PDFs', () => {
    const parsed = parseScheduleTextItems([
      { str: '2025-2026学年第2学期', x: 42, y: 21 },
      { str: '学号：2408240116', x: 42, y: 701 },
      { str: '陈怡盈课表', x: 50, y: 361 },
      { str: '星期一', x: 74, y: 133 },
      { str: '星期二', x: 74, y: 237 },
      { str: '星期三', x: 74, y: 341 },
      { str: '星期四', x: 74, y: 445 },
      { str: '星期五', x: 74, y: 548 },
      { str: '星期六', x: 74, y: 652 },
      { str: '星期日', x: 74, y: 756 },
      { str: '视觉设计◆', x: 90, y: 208 },
      { str: '（1－3节）1-8周/校区:下沙/场 地 :A101/教师 :郑 妙', x: 102, y: 208 },
      { str: '交互设计◆', x: 201, y: 519 },
      { str: '（3—5节）1-16周/校区:下沙/场地:D219/教师:肖小芳', x: 213, y: 519 },
    ])

    expect(parsed.entries).toEqual([
      expect.objectContaining({
        courseName: '视觉设计',
        dayOfWeek: 2,
        startSection: 1,
        endSection: 3,
        teacher: '郑妙',
      }),
      expect.objectContaining({
        courseName: '交互设计',
        dayOfWeek: 5,
        startSection: 3,
        endSection: 5,
      }),
    ])
  })

  it('parses representative rows extracted from the three real schedule PDFs', () => {
    const sharedHeaders = [
      { str: '2025-2026学年第2学期', x: 42, y: 21 },
      { str: '星期一', x: 74, y: 133 },
      { str: '星期二', x: 74, y: 237 },
      { str: '星期三', x: 74, y: 341 },
      { str: '星期四', x: 74, y: 445 },
      { str: '星期五', x: 74, y: 548 },
      { str: '星期六', x: 74, y: 652 },
      { str: '星期日', x: 74, y: 756 },
    ]

    const chen = parseScheduleTextItems([
      ...sharedHeaders,
      { str: '学号：2408240116', x: 42, y: 701 },
      { str: '陈怡盈课表', x: 50, y: 361 },
      { str: '文化创意策划与设计◆', x: 89.5, y: 519.46 },
      { str: '(1-2节)1-16周/校区:下沙/场地:艺术楼109/教师:杨馨/教学班:(2025-2026-2)-ADP024-02/教学班组成:数媒2402;数媒2403;视传2403', x: 101.5, y: 519.46 },
      { str: '马克思主义基本原理◆', x: 201, y: 519.46 },
      { str: '(3-5节)1-16周/校区:下沙/场地:D219/教师:肖小芳/教学班:(2025-2026-2)-IPT012-26/教学班组成:数媒2403', x: 213, y: 519.46 },
    ])
    expect(chen.entries).toEqual([
      expect.objectContaining({ courseName: '文化创意策划与设计', dayOfWeek: 5, startSection: 1, endSection: 2, teacher: '杨馨' }),
      expect.objectContaining({ courseName: '马克思主义基本原理', dayOfWeek: 5, startSection: 3, endSection: 5 }),
    ])

    const kong = parseScheduleTextItems([
      ...sharedHeaders,
      { str: '学号：2408240124', x: 42, y: 701 },
      { str: '孔云丽课表', x: 50, y: 361 },
      { str: '数字标志设计◆', x: 89.5, y: 207.92 },
      { str: '(1-5节)1-4周/校区:下沙/场地:艺术楼416/教师:王怡/教学班:(2025-2026-2)-VCD047-02/教学班组成:视传2402', x: 101.5, y: 207.92 },
      { str: '用户研究与设计策略◆', x: 211, y: 207.92 },
      { str: '(1-5节)5-7周(单),8周/校区:下沙/场地:艺术楼416/教师:李朝胜/教学班:(2025-2026-2)-VCD049-02/教学班组成:视传2402', x: 223, y: 207.92 },
    ])
    expect(kong.entries).toEqual([
      expect.objectContaining({ courseName: '数字标志设计', dayOfWeek: 2, startSection: 1, endSection: 5 }),
      expect.objectContaining({ courseName: '用户研究与设计策略', dayOfWeek: 2, startSection: 1, endSection: 5, weeksText: '5-7周(单),8周' }),
    ])

    const liu = parseScheduleTextItems([
      ...sharedHeaders,
      { str: '学号：2308240205', x: 42, y: 701 },
      { str: '刘永元课表', x: 50, y: 361 },
      { str: '大学生就业与创业指导', x: 142.5, y: 104.08, pageIndex: 2 },
      { str: '◆', x: 156, y: 104.08, pageIndex: 2 },
      { str: '(6-7节)1-8周/校区:下沙/场地:管理225/教师:冯鹏举/教学班:(2025-2026-2)-CDE002-52/教学班组成:数媒2301', x: 168, y: 104.08, pageIndex: 2 },
      { str: '世界遗产概论◆', x: 405.5, y: 415.62, pageIndex: 2 },
      { str: '(10-10节)6周/校区:下沙/场地:管理201/教师:郭万平/教学班:(2025-2026-2)-GENARC056-1/教学班组成:无专业', x: 417.5, y: 415.62, pageIndex: 2 },
      { str: '世界遗产概论◆', x: 527, y: 415.62, pageIndex: 2 },
      { str: '(10-12节)1-5周/校区:下沙/场地:管理201/教师:郭万平/教学班:(2025-2026-2)-GENARC056-1/教学班组成:无专业', x: 539, y: 415.62, pageIndex: 2 },
    ])
    expect(liu.entries).toEqual([
      expect.objectContaining({ courseName: '大学生就业与创业指导', dayOfWeek: 1, startSection: 6, endSection: 7 }),
      expect.objectContaining({ courseName: '世界遗产概论', dayOfWeek: 4, startSection: 10, endSection: 10 }),
      expect.objectContaining({ courseName: '世界遗产概论', dayOfWeek: 4, startSection: 10, endSection: 12 }),
    ])
  })

  it('parses the three real imported schedule PDFs without shortening course titles', async () => {
    const [kong, chen, liu] = await Promise.all([
      parseScheduleFixture('kong-yunli-2025-2026-2.pdf'),
      parseScheduleFixture('chen-yiying-2025-2026-2.pdf'),
      parseScheduleFixture('liu-yongyuan-2025-2026-2.pdf'),
    ])

    expect(kong).toMatchObject({
      personName: '孔云丽',
      studentNo: '2408160302',
      className: '视传2402',
    })
    expect(kong.entries).toEqual(expect.arrayContaining([
      expect.objectContaining({ courseName: '数字媒体技术Ⅱ', dayOfWeek: 4, startSection: 1, endSection: 5, weeksText: '9-12周' }),
      expect.objectContaining({ courseName: '社会性别学', dayOfWeek: 4, startSection: 6, endSection: 8, weeksText: '1-10周' }),
    ]))

    expect(chen).toMatchObject({
      personName: '陈怡盈',
      studentNo: '2408240116',
      className: '数媒2403',
    })
    expect(chen.entries).toEqual(expect.arrayContaining([
      expect.objectContaining({ courseName: '原画创意', dayOfWeek: 4, startSection: 1, endSection: 4, weeksText: '9-12周' }),
      expect.objectContaining({ courseName: '大学生音乐素质拓展', dayOfWeek: 4, startSection: 6, endSection: 8, weeksText: '1-10周' }),
      expect.objectContaining({ courseName: '马克思主义基本原理', dayOfWeek: 5, startSection: 3, endSection: 5, weeksText: '1-16周' }),
    ]))

    expect(liu).toMatchObject({
      personName: '刘永元',
      studentNo: '2308240205',
      className: '数媒2301',
    })
    expect(liu.entries).toEqual(expect.arrayContaining([
      expect.objectContaining({ courseName: '智媒影像艺术模块(1)', dayOfWeek: 4, startSection: 3, endSection: 5, weeksText: '9-12周' }),
      expect.objectContaining({ courseName: '美学导论—从科学走向艺术', dayOfWeek: 4, startSection: 6, endSection: 8, weeksText: '1-8周,10-12周(双)' }),
      expect.objectContaining({ courseName: '美学导论—从科学走向艺术', dayOfWeek: 4, startSection: 6, endSection: 7, weeksText: '11周' }),
    ]))
  })
})
