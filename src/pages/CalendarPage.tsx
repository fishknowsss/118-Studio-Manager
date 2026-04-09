import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/database'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import type { DateClickArg } from '@fullcalendar/interaction'
import type { EventClickArg, EventInput } from '@fullcalendar/core'
import { PageHeader } from '../components/PageHeader'

export function CalendarPage() {
  const navigate = useNavigate()

  const events = useLiveQuery(async (): Promise<EventInput[]> => {
    const projects = await db.projects.toArray()
    const milestones = await db.milestones.toArray()

    const deadlineEvents: EventInput[] = projects
      .filter(p => p.deadline && p.status !== 'completed')
      .map(p => ({
        id: `ddl-${p.id}`,
        title: `DDL: ${p.name}`,
        date: p.deadline,
        backgroundColor: p.color || '#4166F5',
        borderColor: p.color || '#4166F5',
        textColor: '#ffffff',
        extendedProps: { type: 'deadline', projectId: p.id },
      }))

    const milestoneEvents: EventInput[] = milestones.map(m => {
      return {
        id: `ms-${m.id}`,
        title: `${m.title}`,
        date: m.date,
        backgroundColor: 'transparent',
        borderColor: '#39C5BB',
        textColor: '#39C5BB',
        extendedProps: { type: 'milestone' },
      }
    })

    return [...deadlineEvents, ...milestoneEvents]
  }) ?? []

  const handleDateClick = (info: DateClickArg) => {
    navigate(`/planner/${info.dateStr}`)
  }

  const handleEventClick = (info: EventClickArg) => {
    const eventType = info.event.extendedProps.type
    const projectId = info.event.extendedProps.projectId as string | undefined

    if (eventType === 'deadline' && projectId) {
      navigate(`/projects/${projectId}`)
      return
    }

    navigate(`/planner/${info.event.startStr.slice(0, 10)}`)
  }

  return (
    <>
      <PageHeader title="日历" subtitle="查看项目截止日期和里程碑" />

      <div className="flex gap-3 mb-4">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-primary" />
          <span className="text-xs text-text-secondary">项目 DDL</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm border-2 border-accent-teal" />
          <span className="text-xs text-text-secondary">里程碑</span>
        </div>
        <span className="text-xs text-text-muted">点击日期查看当日安排</span>
        <span className="text-xs text-text-muted">点击事件可快速打开项目或当天日计划</span>
      </div>

      <div className="bg-bg-card border border-border rounded-lg p-4 calendar-container">
        <FullCalendar
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          locale="zh-cn"
          events={events}
          dateClick={handleDateClick}
          eventClick={handleEventClick}
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: '',
          }}
          buttonText={{
            today: '今天',
          }}
          height="auto"
          dayMaxEvents={3}
          fixedWeekCount={false}
        />
      </div>
    </>
  )
}
