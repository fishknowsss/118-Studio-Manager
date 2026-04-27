export type ScheduleTextItem = {
  str: string
  x: number
  y: number
  pageIndex?: number
}

export type ParsedScheduleEntry = {
  courseName: string
  dayOfWeek: number
  startSection: number
  endSection: number
  weeksText: string
  location: string
  teacher: string
}

export type ParsedSchedulePdf = {
  personName: string
  studentNo: string
  className: string
  entries: ParsedScheduleEntry[]
}

const WEEKDAYS = ['星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日']
const COURSE_MARK_RE = /◆/
const COURSE_TITLE_FRAGMENT_MAX_GAP = 18
const COURSE_METADATA_RE = /[:：/]|^\d+$|^(上午|下午|晚上|节次|时间段)$|校区|场地?|教师|教学班|教学班组成|考核|选课|备注|课程学时|周学时|总学时|学分|理论|实验|实习|劳动|未安排/
type DayAxis = 'x' | 'y'

function normalizeText(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

function normalizeSchedulePunctuation(value: string) {
  return value
    .replace(/[（]/g, '(')
    .replace(/[）]/g, ')')
    .replace(/[－—–−]/g, '-')
}

function cleanCourseName(value: string) {
  return normalizeText(value.replace(COURSE_MARK_RE, '').replace(/[◆◇]+/g, ''))
}

function getPrimaryCourseName(value: string) {
  const courseName = cleanCourseName(value)
  const mainTitle = courseName.split(/[—–]/)[0]?.trim()
  return mainTitle && /[\u4e00-\u9fa5A-Za-z]/.test(mainTitle) ? mainTitle : courseName
}

function isCourseTitleFragment(value: string) {
  const text = cleanCourseName(value)
  return Boolean(text && !WEEKDAYS.includes(text) && /[\u4e00-\u9fa5A-Za-z]/.test(text) && !COURSE_METADATA_RE.test(text))
}

function getDayHeaders(items: ScheduleTextItem[]) {
  const headers = WEEKDAYS
    .map((label, index) => {
      const item = items.find((candidate) => normalizeText(candidate.str) === label)
      return item ? { dayOfWeek: index + 1, x: item.x, y: item.y } : null
    })
    .filter((item): item is { dayOfWeek: number; x: number; y: number } => Boolean(item))

  const xRange = Math.max(...headers.map((item) => item.x)) - Math.min(...headers.map((item) => item.x))
  const yRange = Math.max(...headers.map((item) => item.y)) - Math.min(...headers.map((item) => item.y))
  const axis: DayAxis = yRange > xRange ? 'y' : 'x'

  return {
    axis,
    headers: headers
      .map((item) => ({ dayOfWeek: item.dayOfWeek, coord: item[axis] }))
      .sort((left, right) => left.coord - right.coord),
  }
}

function getDayByCoord(headers: Array<{ dayOfWeek: number; coord: number }>, coord: number) {
  if (!headers.length) return null
  for (let index = 0; index < headers.length; index += 1) {
    const leftBoundary = index === 0 ? headers[index].coord - 48 : (headers[index - 1].coord + headers[index].coord) / 2
    const rightBoundary = index === headers.length - 1 ? headers[index].coord + 48 : (headers[index].coord + headers[index + 1].coord) / 2
    if (coord >= leftBoundary && coord < rightBoundary) return headers[index].dayOfWeek
  }
  return null
}

function getDayCoord(item: ScheduleTextItem, axis: DayAxis) {
  return axis === 'x' ? item.x : item.y
}

function getLineCoord(item: ScheduleTextItem, axis: DayAxis) {
  return (item.pageIndex || 0) * 10000 + (axis === 'x' ? item.y : item.x)
}

function getMarkedCourseName(sameDayItems: ScheduleTextItem[], startIndex: number, axis: DayAxis) {
  const item = sameDayItems[startIndex]
  const fragments = cleanCourseName(item.str) ? [cleanCourseName(item.str)] : []
  let previousIndex = startIndex - 1
  let currentCoord = getLineCoord(item, axis)

  while (previousIndex >= 0) {
    const previous = sameDayItems[previousIndex]
    const gap = currentCoord - getLineCoord(previous, axis)
    if (gap < -0.5 || gap > COURSE_TITLE_FRAGMENT_MAX_GAP) break
    if (COURSE_MARK_RE.test(previous.str)) break
    if (!isCourseTitleFragment(previous.str)) break

    fragments.unshift(cleanCourseName(previous.str))
    currentCoord = getLineCoord(previous, axis)
    previousIndex -= 1
  }

  return getPrimaryCourseName(fragments.join(''))
}

function compareReadingOrder(axis: DayAxis) {
  return (left: ScheduleTextItem, right: ScheduleTextItem) => {
    const lineGap = getLineCoord(left, axis) - getLineCoord(right, axis)
    if (Math.abs(lineGap) > 0.5) return lineGap
    return getDayCoord(left, axis) - getDayCoord(right, axis)
  }
}

function extractClassName(text: string) {
  const compactText = text.replace(/\s+/g, '')
  const classCounts = new Map<string, number>()
  for (const match of compactText.matchAll(/教学班组成[:：]([^/]+)/g)) {
    for (const classMatch of match[1].matchAll(/[\u4e00-\u9fa5]{1,4}\d{4}/g)) {
      classCounts.set(classMatch[0], (classCounts.get(classMatch[0]) || 0) + 1)
    }
  }
  const frequentClass = Array.from(classCounts.entries())
    .sort((left, right) => right[1] - left[1])
    .at(0)?.[0]
  if (frequentClass) return frequentClass

  const classMatch = compactText.match(/[\u4e00-\u9fa5]{1,4}\d{4}/)
  return classMatch?.[0] || ''
}

function extractField(text: string, pattern: RegExp) {
  return normalizeText(text.match(pattern)?.[1] || '').replace(/([\u4e00-\u9fa5])\s+([\u4e00-\u9fa5])/g, '$1$2')
}

function getPdfCMapUrl() {
  const baseUrl = import.meta.env.BASE_URL || '/'
  return `${baseUrl.replace(/\/?$/, '/')}pdfjs/cmaps/`
}

export function parseScheduleTextItems(items: ScheduleTextItem[]): ParsedSchedulePdf {
  const normalizedItems = items
    .map((item) => ({ ...item, str: normalizeText(item.str) }))
    .filter((item) => item.str)
    .sort((left, right) => right.y - left.y || left.x - right.x)

  const fullText = normalizedItems.map((item) => item.str).join(' ')
  const studentNo = fullText.match(/学号[:：]\s*(\d+)/)?.[1] || ''
  const personName = fullText.match(/([^\s]{2,6})课表/)?.[1] || ''
  const dayLayout = getDayHeaders(normalizedItems)
  const entries: ParsedScheduleEntry[] = []
  const seenKeys = new Set<string>()

  for (const item of normalizedItems) {
    if (!COURSE_MARK_RE.test(item.str)) continue

    const dayOfWeek = getDayByCoord(dayLayout.headers, getDayCoord(item, dayLayout.axis))
    if (!dayOfWeek) continue

    const sameDayItems = normalizedItems
      .filter((candidate) => getDayByCoord(dayLayout.headers, getDayCoord(candidate, dayLayout.axis)) === dayOfWeek)
      .sort(compareReadingOrder(dayLayout.axis))
    const startIndex = sameDayItems.findIndex((candidate) => candidate === item)
    const courseName = getMarkedCourseName(sameDayItems, startIndex, dayLayout.axis)
    if (!courseName || courseName.includes('课表')) continue

    const contextItems = sameDayItems.slice(startIndex, startIndex + 24)
    const nextCourseIndex = contextItems.slice(1).findIndex((candidate) => COURSE_MARK_RE.test(candidate.str))
    const context = contextItems
      .slice(0, nextCourseIndex >= 0 ? nextCourseIndex + 1 : contextItems.length)
      .map((candidate) => candidate.str)
      .join(' ')
    const normalizedContext = normalizeSchedulePunctuation(context)

    const sectionMatch = normalizedContext.match(/\(\s*(\d+)\s*-\s*(\d+)\s*节\s*\)\s*([^/]+?周(?:\([^)]+\))?(?:[,，]\s*\d+(?:-\d+)?周(?:\([^)]+\))?)*)/)
    if (!sectionMatch) continue

    const startSection = Number(sectionMatch[1])
    const endSection = Number(sectionMatch[2])
    if (!Number.isInteger(startSection) || !Number.isInteger(endSection)) continue

    const weeksText = normalizeText(sectionMatch[3])
    const location = extractField(context, /场\s*地\s*[:：]\s*([^/]+?)(?:\/教\s*师|\/教\s*学\s*班|$)/)
    const teacher = extractField(context, /教\s*师\s*[:：]\s*([^/]+?)(?:\/教\s*学\s*班|\/考核|$)/)
    const key = `${courseName}-${dayOfWeek}-${startSection}-${endSection}-${weeksText}`
    if (seenKeys.has(key)) continue
    seenKeys.add(key)

    entries.push({
      courseName,
      dayOfWeek,
      startSection,
      endSection,
      weeksText,
      location,
      teacher,
    })
  }

  return {
    personName,
    studentNo,
    className: extractClassName(fullText),
    entries: entries.sort((left, right) => left.dayOfWeek - right.dayOfWeek || left.startSection - right.startSection),
  }
}

export async function extractSchedulePdf(file: File) {
  const [pdfjsLib, workerModule] = await Promise.all([
    import('pdfjs-dist/legacy/build/pdf.mjs'),
    import('pdfjs-dist/legacy/build/pdf.worker.mjs?url'),
  ])

  pdfjsLib.GlobalWorkerOptions.workerSrc = workerModule.default

  const data = new Uint8Array(await file.arrayBuffer())
  const loadingTask = pdfjsLib.getDocument({
    data,
    cMapUrl: getPdfCMapUrl(),
    cMapPacked: true,
  })
  const pdf = await loadingTask.promise
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
