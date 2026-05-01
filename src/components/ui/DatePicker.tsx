import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']
const POPOVER_WIDTH = 314
const POPOVER_HEIGHT = 330
const POPOVER_GAP = 8
const VIEWPORT_PADDING = 12

function pad(value: number) {
  return String(value).padStart(2, '0')
}

function formatDateKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function parseDateKey(value: string | null) {
  if (!value) return null
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2]) - 1
  const day = Number(match[3])
  const date = new Date(year, month, day)

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month ||
    date.getDate() !== day
  ) {
    return null
  }

  return date
}

function getMonthLabel(date: Date) {
  return `${date.getFullYear()}年${date.getMonth() + 1}月`
}

function shiftMonth(date: Date, offset: number) {
  return new Date(date.getFullYear(), date.getMonth() + offset, 1)
}

function buildMonthDays(viewDate: Date) {
  const firstDay = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1)
  const start = new Date(firstDay)
  start.setDate(firstDay.getDate() - firstDay.getDay())

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start)
    date.setDate(start.getDate() + index)
    return {
      date,
      dateKey: formatDateKey(date),
      inCurrentMonth: date.getMonth() === viewDate.getMonth(),
    }
  })
}

export function DatePicker({
  id,
  label,
  onChange,
  value,
}: {
  id: string
  label: string
  onChange: (value: string | null) => void
  value: string | null
}) {
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const popoverRef = useRef<HTMLDivElement | null>(null)
  const selectedDate = parseDateKey(value)
  const todayKey = formatDateKey(new Date())
  const [open, setOpen] = useState(false)
  const [popoverStyle, setPopoverStyle] = useState<CSSProperties | null>(null)
  const [placement, setPlacement] = useState<'top' | 'bottom'>('bottom')
  const [viewDate, setViewDate] = useState(() => {
    const baseDate = selectedDate ?? new Date()
    return new Date(baseDate.getFullYear(), baseDate.getMonth(), 1)
  })

  useEffect(() => {
    if (!selectedDate) return
    setViewDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1))
  }, [value])

  const updatePopoverPosition = () => {
    const trigger = wrapperRef.current?.querySelector<HTMLButtonElement>('.date-picker-trigger')
    if (!trigger) return

    const rect = trigger.getBoundingClientRect()
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight
    const spaceBelow = viewportHeight - rect.bottom - VIEWPORT_PADDING
    const spaceAbove = rect.top - VIEWPORT_PADDING
    const nextPlacement = spaceBelow < POPOVER_HEIGHT && spaceAbove > spaceBelow ? 'top' : 'bottom'
    const panelHeight = popoverRef.current?.offsetHeight || POPOVER_HEIGHT
    const panelWidth = popoverRef.current?.offsetWidth || POPOVER_WIDTH
    const left = Math.min(
      Math.max(VIEWPORT_PADDING, rect.left),
      Math.max(VIEWPORT_PADDING, viewportWidth - panelWidth - VIEWPORT_PADDING),
    )
    const top = nextPlacement === 'top'
      ? Math.max(VIEWPORT_PADDING, rect.top - panelHeight - POPOVER_GAP)
      : Math.min(rect.bottom + POPOVER_GAP, viewportHeight - panelHeight - VIEWPORT_PADDING)

    setPlacement(nextPlacement)
    setPopoverStyle({
      position: 'fixed',
      top: `${Math.max(VIEWPORT_PADDING, top)}px`,
      left: `${left}px`,
    })
  }

  useEffect(() => {
    if (!open) return
    updatePopoverPosition()
  }, [open, viewDate, value])

  useEffect(() => {
    if (!open) return undefined

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (
        !wrapperRef.current?.contains(target) &&
        !popoverRef.current?.contains(target)
      ) {
        setOpen(false)
      }
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    window.addEventListener('resize', updatePopoverPosition)
    window.addEventListener('scroll', updatePopoverPosition, true)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('resize', updatePopoverPosition)
      window.removeEventListener('scroll', updatePopoverPosition, true)
    }
  }, [open])

  const days = useMemo(() => buildMonthDays(viewDate), [viewDate])
  const selectedKey = value || ''

  const selectDate = (dateKey: string) => {
    onChange(dateKey)
    setOpen(false)
  }

  const jumpToday = () => {
    const today = new Date()
    setViewDate(new Date(today.getFullYear(), today.getMonth(), 1))
    onChange(formatDateKey(today))
    setOpen(false)
  }

  const clearDate = () => {
    onChange(null)
    setOpen(false)
  }

  const popover = open ? (
    <div
      ref={popoverRef}
      className="date-picker-popover"
      role="dialog"
      aria-label={label}
      data-placement={placement}
      style={popoverStyle ?? { position: 'fixed', top: 0, left: 0 }}
    >
      <div className="date-picker-header">
        <button
          className="date-picker-nav"
          type="button"
          aria-label="上个月"
          onClick={() => setViewDate((current) => shiftMonth(current, -1))}
        >
          ‹
        </button>
        <div className="date-picker-month">{getMonthLabel(viewDate)}</div>
        <button
          className="date-picker-nav"
          type="button"
          aria-label="下个月"
          onClick={() => setViewDate((current) => shiftMonth(current, 1))}
        >
          ›
        </button>
      </div>

      <div className="date-picker-weekdays" aria-hidden="true">
        {WEEKDAYS.map((weekday) => (
          <span key={weekday}>{weekday}</span>
        ))}
      </div>

      <div className="date-picker-grid">
        {days.map((day) => (
          <button
            key={day.dateKey}
            className={[
              'date-picker-day',
              day.inCurrentMonth ? '' : 'muted',
              day.dateKey === selectedKey ? 'selected' : '',
              day.dateKey === todayKey ? 'today' : '',
            ].filter(Boolean).join(' ')}
            type="button"
            data-date={day.dateKey}
            onClick={() => selectDate(day.dateKey)}
          >
            {day.date.getDate()}
          </button>
        ))}
      </div>

      <div className="date-picker-actions">
        <button className="date-picker-action" type="button" onClick={jumpToday}>今天</button>
        <button className="date-picker-action" type="button" onClick={clearDate} disabled={!value}>清除</button>
      </div>
    </div>
  ) : null

  return (
    <div ref={wrapperRef} className="date-picker">
      <button
        id={id}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={label}
        className={`form-input date-picker-trigger${value ? '' : ' is-empty'}`}
        type="button"
        onClick={() => setOpen((current) => !current)}
      >
        <span>{value || '选择日期'}</span>
        <span className="date-picker-trigger-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="3" />
            <path d="M8 2v4M16 2v4M3 10h18" />
          </svg>
        </span>
      </button>

      {popover ? createPortal(popover, document.body) : null}
    </div>
  )
}
