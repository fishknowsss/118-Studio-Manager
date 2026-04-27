import type { ClassScheduleEntry } from '../../legacy/store'

export type ScheduleCourseGroup = {
  id: string
  courseName: string
  weeksText: string
  entries: ClassScheduleEntry[]
}

export type ScheduleBaseGroup = {
  dayOfWeek: number
  startSection: number
  endSection: number
  courseGroups: ScheduleCourseGroup[]
}

export type ScheduleCluster = {
  id: string
  dayOfWeek: number
  startSection: number
  endSection: number
  groups: ScheduleBaseGroup[]
}

export type ScheduleLayoutCourseInput = {
  id: string
  startSection: number
  endSection: number
}

export type ScheduleCourseLayout<T extends ScheduleLayoutCourseInput = ScheduleLayoutCourseInput> = T & {
  topPercent: number
  heightPercent: number
  laneIndex: number
  laneCount: number
  stackIndex: number
  stackCount: number
}

export function getWeekNumber(termStartDate: string, currentDate = new Date()) {
  const start = new Date(`${termStartDate}T12:00:00`)
  if (Number.isNaN(start.getTime())) return 1
  const current = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), 12, 0, 0)
  const days = Math.floor((current.getTime() - start.getTime()) / 86400000)
  return Math.max(1, Math.floor(days / 7) + 1)
}

export function weekTextApplies(weeksText: string, weekNumber: number) {
  const matches = Array.from(weeksText.matchAll(/(\d+)(?:-(\d+))?周(?:[（(](单|双)[）)])?/g))
  if (!matches.length) return true

  return matches.some((match) => {
    const start = Number(match[1])
    const end = Number(match[2] || match[1])
    const parity = match[3]
    if (weekNumber < start || weekNumber > end) return false
    if (parity === '单') return weekNumber % 2 === 1
    if (parity === '双') return weekNumber % 2 === 0
    return true
  })
}

export function mergeScheduleEntries(entries: ClassScheduleEntry[]) {
  const merged = new Map<string, ClassScheduleEntry>()

  for (const entry of entries) {
    const key = [
      entry.personId,
      entry.dayOfWeek,
      entry.startSection,
      entry.endSection,
      entry.courseName,
      entry.location || '',
      entry.teacher || '',
    ].join('|')
    const existing = merged.get(key)
    if (!existing) {
      merged.set(key, entry)
      continue
    }

    const weeks = Array.from(new Set([...existing.weeksText.split(' / '), entry.weeksText].filter(Boolean)))
    merged.set(key, {
      ...existing,
      weeksText: weeks.join(' / '),
    })
  }

  return Array.from(merged.values())
}

export function groupScheduleCourses(entries: ClassScheduleEntry[]) {
  const courseGroups = new Map<string, ScheduleCourseGroup>()

  for (const entry of entries) {
    const key = entry.courseName
    const existing = courseGroups.get(key)
    if (!existing) {
      courseGroups.set(key, {
        id: key,
        courseName: entry.courseName,
        weeksText: entry.weeksText,
        entries: [entry],
      })
      continue
    }

    existing.entries.push(entry)
    existing.weeksText = Array.from(new Set([...existing.weeksText.split(' / '), entry.weeksText].filter(Boolean))).join(' / ')
  }

  return Array.from(courseGroups.values()).sort((left, right) =>
    left.courseName.localeCompare(right.courseName, 'zh-CN') ||
    left.entries[0]?.personName.localeCompare(right.entries[0]?.personName || '', 'zh-CN'),
  )
}

export function scheduleGroupKey(group: { dayOfWeek: number; startSection: number; endSection: number }) {
  return `${group.dayOfWeek}-${group.startSection}-${group.endSection}`
}

function sectionsOverlap(
  left: { startSection: number; endSection: number },
  right: { startSection: number; endSection: number },
) {
  return left.startSection <= right.endSection && right.startSection <= left.endSection
}

function sortScheduleGroups<T extends { startSection: number; endSection: number }>(groups: T[]) {
  return [...groups].sort((left, right) => left.startSection - right.startSection || left.endSection - right.endSection)
}

export function buildScheduleClusters(groups: ScheduleBaseGroup[]) {
  const clusters: ScheduleCluster[] = []

  for (let dayOfWeek = 1; dayOfWeek <= 7; dayOfWeek += 1) {
    const remaining = new Set(sortScheduleGroups(groups.filter((group) => group.dayOfWeek === dayOfWeek)))

    while (remaining.size > 0) {
      const seed = remaining.values().next().value as ScheduleBaseGroup
      const component: ScheduleBaseGroup[] = [seed]
      const queue: ScheduleBaseGroup[] = [seed]
      remaining.delete(seed)

      while (queue.length > 0) {
        const current = queue.shift()!
        for (const candidate of Array.from(remaining)) {
          if (!sectionsOverlap(current, candidate)) continue
          remaining.delete(candidate)
          component.push(candidate)
          queue.push(candidate)
        }
      }

      const sortedComponent = sortScheduleGroups(component)
      const startSection = Math.min(...sortedComponent.map((group) => group.startSection))
      const endSection = Math.max(...sortedComponent.map((group) => group.endSection))

      clusters.push({
        id: `${dayOfWeek}-${startSection}-${endSection}-${sortedComponent.map(scheduleGroupKey).join('_')}`,
        dayOfWeek,
        startSection,
        endSection,
        groups: sortedComponent,
      })
    }
  }

  return clusters.sort((left, right) => left.dayOfWeek - right.dayOfWeek || left.startSection - right.startSection)
}

export function getClusterPersonIds(cluster: ScheduleCluster) {
  return Array.from(new Set(
    cluster.groups.flatMap((group) =>
      group.courseGroups.flatMap((courseGroup) => courseGroup.entries.map((entry) => entry.personId)),
    ),
  ))
}

export function buildScheduleCourseLayouts<T extends ScheduleLayoutCourseInput>(
  courses: T[],
  cluster: { startSection: number; endSection: number },
): ScheduleCourseLayout<T>[] {
  const sortedCourses = [...courses].sort((left, right) =>
    left.startSection - right.startSection ||
    left.endSection - right.endSection ||
    left.id.localeCompare(right.id, 'zh-CN'),
  )
  const laneEndSections: number[] = []
  const span = Math.max(1, cluster.endSection - cluster.startSection + 1)

  const layouts = sortedCourses.map((course) => {
    const laneIndex = laneEndSections.findIndex((endSection) => endSection < course.startSection)
    const resolvedLaneIndex = laneIndex >= 0 ? laneIndex : laneEndSections.length
    laneEndSections[resolvedLaneIndex] = course.endSection

    const startSection = Math.max(cluster.startSection, course.startSection)
    const endSection = Math.min(cluster.endSection, course.endSection)

    return {
      ...course,
      topPercent: ((startSection - cluster.startSection) / span) * 100,
      heightPercent: (Math.max(1, endSection - startSection + 1) / span) * 100,
      laneIndex: resolvedLaneIndex,
      laneCount: 1,
      stackIndex: resolvedLaneIndex,
      stackCount: 1,
    }
  })

  const laneCount = Math.max(1, laneEndSections.length)
  return layouts.map((layout) => ({
    ...layout,
    laneCount,
    stackCount: laneCount,
  }))
}
