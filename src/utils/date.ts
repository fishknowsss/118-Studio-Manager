import dayjs from 'dayjs'

export function formatDate(date: string): string {
  return dayjs(date).format('YYYY-MM-DD')
}

export function formatDateTime(date: string): string {
  return dayjs(date).format('YYYY-MM-DD HH:mm')
}

export function formatDateCN(date: string): string {
  return dayjs(date).format('M月D日')
}

export function formatDateFull(date: string): string {
  return dayjs(date).format('YYYY年M月D日')
}

export function today(): string {
  return dayjs().format('YYYY-MM-DD')
}

export function now(): string {
  return dayjs().toISOString()
}

export function isOverdue(date: string): boolean {
  return dayjs(date).isBefore(dayjs(), 'day')
}

export function isToday(date: string): boolean {
  return dayjs(date).isSame(dayjs(), 'day')
}

export function isWithinDays(date: string, days: number): boolean {
  const target = dayjs(date)
  const start = dayjs().startOf('day')
  const end = dayjs().add(days, 'day').endOf('day')
  return target.isAfter(start) && target.isBefore(end)
}

export function daysUntil(date: string): number {
  return dayjs(date).diff(dayjs(), 'day')
}

export function toISODate(date: string): string {
  return dayjs(date).format('YYYY-MM-DD')
}
