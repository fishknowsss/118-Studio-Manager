import { useEffect, useMemo, useState } from 'react'
import { formatLocalDateKey } from './utils'

export function useTodayDate() {
  const [todayDate, setTodayDate] = useState(() => new Date())

  useEffect(() => {
    const now = new Date()
    const nextMidnight = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
      0,
      0,
      0,
      0,
    )
    const timer = window.setTimeout(() => {
      setTodayDate(new Date())
    }, nextMidnight.getTime() - now.getTime())

    return () => window.clearTimeout(timer)
  }, [todayDate])

  return todayDate
}

export function useTodayKey() {
  const todayDate = useTodayDate()
  return useMemo(() => formatLocalDateKey(todayDate), [todayDate])
}
