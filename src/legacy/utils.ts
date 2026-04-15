export const uid = () => crypto.randomUUID()
export const now = () => new Date().toISOString()

export type BackupRecord = Record<string, unknown>

export type BackupPayload = {
  schemaVersion: number
  exportedAt: string
  projects: BackupRecord[]
  tasks: BackupRecord[]
  people: BackupRecord[]
  logs: BackupRecord[]
  settings: BackupRecord[]
}

export const BACKUP_SCHEMA_VERSION = 2

function pad(value: number) {
  return String(value).padStart(2, '0')
}

export function formatLocalDateKey(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function coerceToLocalDateKey(value: string | Date | null | undefined) {
  if (!value) return null
  if (value instanceof Date) return formatLocalDateKey(value)
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return formatLocalDateKey(parsed)
}

export function formatFileDate(date = new Date()) {
  return formatLocalDateKey(date)
}

export function parseLocalDateKey(dateStr: string | null | undefined) {
  if (!dateStr) return null
  const [yearText, monthText, dayText] = dateStr.split('-')
  const year = Number(yearText)
  const month = Number(monthText)
  const day = Number(dayText)

  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return null
  }

  return new Date(year, month - 1, day, 12, 0, 0, 0)
}

export function shiftLocalDateKey(date = new Date(), offsetDays = 0) {
  const next = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    12,
    0,
    0,
    0,
  )
  next.setDate(next.getDate() + offsetDays)
  return formatLocalDateKey(next)
}

export function today() {
  return formatLocalDateKey(new Date())
}

export function daysUntil(dateStr: string | null | undefined) {
  if (!dateStr) return null
  const d = parseLocalDateKey(dateStr)
  if (!d) return null
  const t = new Date()
  t.setHours(12, 0, 0, 0)
  return Math.round((d.getTime() - t.getTime()) / 86400000)
}

export function urgencyClass(dateStr: string | null | undefined, status: string) {
  if (status === 'completed' || status === 'cancelled') return 'urg-done'
  if (!dateStr) return ''
  const d = daysUntil(dateStr)
  if (d === null) return ''
  if (d < 0) return 'urg-overdue'
  if (d === 0) return 'urg-today'
  if (d <= 3) return 'urg-soon'
  if (d <= 7) return 'urg-near'
  return ''
}

export function ddlLabel(dateStr: string | null | undefined, status: string) {
  if (status === 'completed') return '已完成'
  if (status === 'cancelled') return '已取消'
  if (!dateStr) return '—'
  const d = daysUntil(dateStr)
  if (d === null) return '—'
  if (d < 0) return `逾期 ${Math.abs(d)} 天`
  if (d === 0) return '今日截止'
  if (d <= 7) return `还剩 ${d} 天`
  return `DDL ${formatDate(dateStr)}`
}

export function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return ''
  const [, month, day] = dateStr.split('-')
  return `${parseInt(month, 10)}/${parseInt(day, 10)}`
}

export function formatDateFull(dateStr: string | null | undefined) {
  if (!dateStr) return ''
  const dt = parseLocalDateKey(dateStr)
  if (!dt) return ''
  return dt.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' })
}

export function weekdayLabel(dateStr: string) {
  const dt = parseLocalDateKey(dateStr)
  if (!dt) return ''
  return ['日', '一', '二', '三', '四', '五', '六'][dt.getDay()]
}

export function initials(name: string) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  if (name.length >= 2 && /[\u4e00-\u9fa5]/.test(name)) return name.slice(-2)
  return name[0].toUpperCase()
}

export const STATUS_LABELS: Record<string, string> = {
  active: '进行中',
  completed: '已完成',
  paused: '暂停',
  cancelled: '已取消',
  todo: '待处理',
  'in-progress': '进行中',
  done: '完成',
  blocked: '受阻',
}

export const PRIORITY_LABELS: Record<string, string> = {
  urgent: '紧急',
  high: '高',
  medium: '中',
  low: '低',
}

export function sortByUrgency<T extends { ddl?: string | null; status?: string }>(projects: T[]) {
  const order: Record<string, number> = {
    'urg-overdue': 0,
    'urg-today': 1,
    'urg-soon': 2,
    'urg-near': 3,
    '': 4,
    'urg-done': 5,
  }
  return [...projects].sort((a, b) => {
    const aOrder = order[urgencyClass(a.ddl, a.status || 'active')] ?? 4
    const bOrder = order[urgencyClass(b.ddl, b.status || 'active')] ?? 4
    return aOrder !== bOrder ? aOrder - bOrder : (a.ddl || '').localeCompare(b.ddl || '')
  })
}

export function getCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrevMonth = new Date(year, month, 0).getDate()
  const days: Array<{ date: Date; otherMonth: boolean }> = []

  for (let i = firstDay - 1; i >= 0; i -= 1) {
    days.push({ date: new Date(year, month - 1, daysInPrevMonth - i), otherMonth: true })
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    days.push({ date: new Date(year, month, day), otherMonth: false })
  }

  while (days.length < 42) {
    days.push({ date: new Date(year, month + 1, days.length - firstDay - daysInMonth + 1), otherMonth: true })
  }

  return days
}

export function dateToStr(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function toCSV(rows: Record<string, unknown>[], headers: string[]) {
  const escape = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`
  return [headers.map(escape).join(','), ...rows.map(row => headers.map(header => escape(row[header])).join(','))].join('\n')
}

export function buildBackupPayload(data: Partial<BackupPayload>): BackupPayload {
  return {
    schemaVersion: data.schemaVersion ?? BACKUP_SCHEMA_VERSION,
    exportedAt: data.exportedAt ?? now(),
    projects: Array.isArray(data.projects) ? data.projects : [],
    tasks: Array.isArray(data.tasks) ? data.tasks : [],
    people: Array.isArray(data.people) ? data.people : [],
    logs: Array.isArray(data.logs) ? data.logs : [],
    settings: Array.isArray(data.settings) ? data.settings : [],
  }
}

export function normalizeImportedBackup(data: unknown): BackupPayload {
  if (!data || typeof data !== 'object') {
    throw new Error('备份文件格式无效')
  }

  const payload = data as Partial<BackupPayload>
  const hasKnownCollection = ['projects', 'tasks', 'people', 'logs', 'settings'].some((key) =>
    Array.isArray(payload[key as keyof BackupPayload]),
  )

  if (!hasKnownCollection) {
    throw new Error('备份文件缺少可识别的数据表')
  }

  return buildBackupPayload({
    schemaVersion: typeof payload.schemaVersion === 'number' ? payload.schemaVersion : BACKUP_SCHEMA_VERSION,
    exportedAt: typeof payload.exportedAt === 'string' ? payload.exportedAt : now(),
    projects: payload.projects,
    tasks: payload.tasks,
    people: payload.people,
    logs: payload.logs,
    settings: payload.settings,
  })
}

export function downloadFile(content: string, filename: string, mime = 'application/json') {
  const url = URL.createObjectURL(new Blob([content], { type: mime }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
