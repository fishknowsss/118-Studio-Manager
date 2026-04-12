import React, { useState, useMemo, useSyncExternalStore } from 'react'
import { store, type LegacyProject } from '../legacy/store'
import { getRandQuote, getRandMotivation } from '../../js/quotes'
import {
  today, daysUntil, urgencyClass, ddlLabel, formatDate, initials,
  sortByUrgency, getCalendarDays, dateToStr
} from '../../js/utils'
import { openPlanner } from '../../js/views/calendar'

const URGENCY_TEXT: Record<string, string> = {
  'urg-overdue': '逾期',
  'urg-today': '今日截止',
  'urg-soon': '3天内',
  'urg-near': '7天内',
  '': '未迫近',
}

export function Dashboard() {
  useSyncExternalStore(store.subscribe, () => store.getSnapshot())
  const { projects, tasks, people } = store

  const [calDate, setCalDate] = useState(() => new Date())
  const quote = useMemo(() => getRandQuote(), [])
  const motivation = useMemo(() => getRandMotivation(), [])

  const dateObj = new Date()
  const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
  const months = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']

  const activeProjects = useMemo(() => {
    return projects.filter(p => p.status !== 'cancelled' && p.status !== 'completed')
  }, [projects])

  const sortedProjects = useMemo(() => sortByUrgency(activeProjects), [activeProjects])
  const topProjects = sortedProjects.slice(0, 8)

  const taskPool = useMemo(() => {
    const PRIO_ORDER: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 }
    return tasks
      .filter(t => ((t.status as any) !== 'done' && (t.status as any) !== 'blocked') || t.status === 'in-progress')
      .sort((a, b) => {
        const po = (PRIO_ORDER[a.priority || 'medium']) - (PRIO_ORDER[b.priority || 'medium'])
        if (po !== 0) return po
        return (a.endDate || '9999').localeCompare(b.endDate || '9999')
      })
      .slice(0, 20)
  }, [tasks])

  const activePeople = useMemo(() => people.filter(p => p.status === 'active'), [people])

  const calendarDays = useMemo(() => {
    return getCalendarDays(calDate.getFullYear(), calDate.getMonth())
  }, [calDate])

  const eventMap = useMemo(() => {
    const map: Record<string, { hasDdl?: boolean; hasMs?: boolean; urgent?: boolean }> = {}
    projects.forEach((proj: any) => {
      if (proj.ddl) {
        if (!map[proj.ddl]) map[proj.ddl] = {}
        map[proj.ddl].hasDdl = true
        if (urgencyClass(proj.ddl, proj.status || 'active').includes('overdue')) map[proj.ddl].urgent = true
      }
      (proj.milestones || []).forEach((ms: any) => {
        if (ms.date) {
          if (!map[ms.date]) map[ms.date] = {}
          map[ms.date].hasMs = true
        }
      })
    })
    return map
  }, [projects])

  const navigate = (view: string) => {
    window.location.hash = '#' + view
  }

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/task-id', taskId)
  }

  const handleDrop = async (e: React.DragEvent, personId: string) => {
    e.preventDefault()
    const taskId = e.dataTransfer.getData('text/task-id')
    if (!taskId) return
    const task = store.getTask(taskId)
    const person = store.getPerson(personId)
    if (!task || !person) return

    const updatedTask = {
      ...task,
      assigneeId: personId,
      updatedAt: new Date().toISOString()
    }
    await store.saveTask(updatedTask)
    await store.addLog(`分配任务「${task.title}」给 ${person.name}`)
  }

  const focusProj = topProjects[0] as LegacyProject | undefined
  const focusData = useMemo(() => {
    if (!focusProj) return null
    const todayStr = today()
    const pTasks = tasks.filter(t => t.projectId === focusProj.id)
    const nextMs = (focusProj.milestones || [])
      .filter((m: any) => !m.completed && m.date! >= todayStr)
      .sort((a: any, b: any) => a.date!.localeCompare(b.date!))[0]
    const days = daysUntil(focusProj.ddl)
    
    let brief = '该项目未设置 DDL，请尽快补齐时间点。'
    if (days !== null) {
      if (days < 0) brief = `已逾期 ${Math.abs(days)} 天，建议立即处理交付风险。`
      else if (days === 0) brief = '今天截止，请优先完成最终交付与确认。'
      else if (days <= 3) brief = `距离截止 ${days} 天，进入冲刺窗口。`
      else if (days <= 7) brief = `距离截止 ${days} 天，请锁定关键里程碑。`
      else brief = `距离截止 ${days} 天，保持节奏推进。`
    }

    return {
      uc: urgencyClass(focusProj.ddl, focusProj.status || 'active'),
      todayCount: pTasks.filter(t => t.scheduledDate === todayStr && t.status !== 'done').length,
      overdueCount: pTasks.filter(t => t.endDate && t.endDate < todayStr && t.status !== 'done').length,
      remainingCount: pTasks.filter(t => t.status !== 'done').length,
      nextMs,
      brief
    }
  }, [focusProj, tasks])

  return (
    <div className="dashboard fade-in">
      <div className="dash-header">
        <div className="dash-date-block">
          <div className="dash-date-big">{dateObj.getMonth() + 1}月{dateObj.getDate()}日</div>
          <div className="dash-date-weekday">{dateObj.getFullYear()} · {weekdays[dateObj.getDay()]}</div>
        </div>
        <div className="dash-quote-block">
          <div className="dash-quote-text">"{quote.text}"</div>
          <div className="dash-quote-src">— {quote.src}</div>
          <div className="dash-motivation">{motivation}</div>
        </div>
      </div>

      <div className="today-focus">
        <div className="focus-label">今日焦点</div>
        <div className="focus-cards">
          {!focusProj ? (
            <div className="focus-empty">暂无活跃项目 — 新建一个开始吧</div>
          ) : (
            <>
              <div 
                className={`focus-highlight ${focusData?.uc}`}
                onClick={() => navigate('projects')}
              >
                <div className="focus-highlight-head">
                  <div>
                    <div className="focus-highlight-label">最紧急项目</div>
                    <div className="focus-highlight-name">{focusProj.name}</div>
                    <div className="focus-highlight-ddl">{ddlLabel(focusProj.ddl, focusProj.status || 'active')}</div>
                  </div>
                  <div className="focus-highlight-tier">{URGENCY_TEXT[focusData?.uc || ''] || '未迫近'}</div>
                </div>
                <div className="focus-highlight-brief">{focusData?.brief}</div>
                <div className="focus-highlight-meta">
                  <span>今日事项 {focusData?.todayCount}</span>
                  <span>逾期任务 {focusData?.overdueCount}</span>
                  <span>未完成 {focusData?.remainingCount}</span>
                  {focusData?.nextMs ? (
                    <span>关键节点 {focusData.nextMs.title} · {formatDate(focusData.nextMs.date)}</span>
                  ) : (
                    <span>关键节点 暂无</span>
                  )}
                </div>
              </div>
              <div className="focus-secondary-list">
                {topProjects.slice(1).map((proj: any) => {
                  const uc = urgencyClass(proj.ddl, proj.status || 'active')
                  const pTasks = tasks.filter(t => t.projectId === proj.id)
                  const nextMs = (proj.milestones || [])
                    .filter((m: any) => !m.completed && m.date! >= today())
                    .sort((a: any, b: any) => a.date!.localeCompare(b.date!))[0]
                  return (
                    <div 
                      key={proj.id} 
                      className={`focus-card ${uc}`}
                      onClick={() => navigate('projects')}
                    >
                      <div className="focus-card-name">{proj.name}</div>
                      <div className="focus-card-ddl">{ddlLabel(proj.ddl, proj.status || 'active')}</div>
                      <div className="focus-card-meta">
                        <span>{URGENCY_TEXT[uc] || '未迫近'}</span>
                        <span>{pTasks.filter(t => t.status !== 'done').length} 个任务</span>
                      </div>
                      {nextMs && (
                        <div className="focus-card-milestone">◆ {nextMs.title} · {formatDate(nextMs.date)}</div>
                      )}
                    </div>
                  )
                })}
                {topProjects.length === 1 && <div className="focus-empty">当前仅 1 个活跃项目</div>}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="dash-bottom">
        <div className="dash-left">
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">任务池</span>
              <span className="panel-action" onClick={() => navigate('tasks')}>全部任务 →</span>
            </div>
            <div className="panel-body">
              {taskPool.length === 0 ? (
                <div className="empty-state"><div className="empty-text">暂无待处理任务</div></div>
              ) : (
                taskPool.map(t => {
                  const proj = projects.find(p => p.id === t.projectId)
                  const person = t.assigneeId ? people.find(p => p.id === t.assigneeId) : null
                  const isOverdue = t.endDate && t.endDate < today() && t.status !== 'done'
                  return (
                    <div 
                      key={t.id} 
                      className="task-row" 
                      draggable 
                      onDragStart={(e) => handleDragStart(e, t.id)}
                    >
                      <div className={`prio-dot ${t.priority || 'medium'}`}></div>
                      <span className="task-title-text">{t.title}</span>
                      {proj && <span className="task-proj-tag">{proj.name}</span>}
                      {person && <span className="task-assignee-tag">{initials(person.name || '')}</span>}
                      {isOverdue && <span className="date-chip overdue">{formatDate(t.endDate)}</span>}
                    </div>
                  )
                })
              )}
            </div>
          </div>
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">人员</span>
              <span className="panel-action" onClick={() => navigate('people')}>管理 →</span>
            </div>
            <div className="panel-body">
              {activePeople.length === 0 ? (
                <div className="empty-state"><div className="empty-text">暂无人员</div></div>
              ) : (
                activePeople.map(p => {
                  const tCount = tasks.filter(t => t.assigneeId === p.id && t.status !== 'done').length
                  return (
                    <div 
                      key={p.id} 
                      className="person-row"
                      onDragOver={(e) => {
                        e.preventDefault()
                        e.currentTarget.classList.add('drop-zone-active')
                      }}
                      onDragLeave={(e) => {
                        e.currentTarget.classList.remove('drop-zone-active')
                      }}
                      onDrop={(e) => {
                        e.currentTarget.classList.remove('drop-zone-active')
                        handleDrop(e, p.id)
                      }}
                    >
                      <div className="avatar">{initials(p.name || '')}</div>
                      <div className="person-info">
                        <div className="person-name">{p.name}</div>
                        <div className="person-skills">{(p.skills || []).slice(0, 3).join(' · ')}</div>
                      </div>
                      <span className="person-task-count">{tCount} 任务</span>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>

        <div className="dash-right">
          <div className="mini-cal-header">
            <span className="mini-cal-title">{calDate.getFullYear()} · {months[calDate.getMonth()]}</span>
            <div className="mini-cal-nav">
              <button 
                className="mini-cal-btn" 
                title="上月"
                onClick={() => setCalDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <button 
                className="mini-cal-btn" 
                title="下月"
                onClick={() => setCalDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>
          </div>
          <div className="mini-cal-grid">
            {['日', '一', '二', '三', '四', '五', '六'].map(d => (
              <div key={d} className="mini-cal-dow">{d}</div>
            ))}
            {calendarDays.map(({ date, otherMonth }, idx) => {
              const ds = dateToStr(date)
              const ev = eventMap[ds] || {}
              const isToday = ds === today()
              const cls = [
                'mini-cal-day',
                isToday ? 'today' : '',
                otherMonth ? 'other-month' : '',
                ev.hasDdl || ev.hasMs ? 'has-events' : '',
                ev.urgent ? 'has-urgent' : '',
              ].filter(Boolean).join(' ')
              return (
                <div 
                  key={idx} 
                  className={cls}
                  onClick={() => openPlanner(ds)}
                >
                  {date.getDate()}
                </div>
              )
            })}
          </div>
          <div className="cal-legend">
            <div className="cal-legend-item">
              <div className="cal-legend-dot" style={{ background: 'var(--c-overdue)' }}></div> DDL
            </div>
            <div className="cal-legend-item">
              <div className="cal-legend-dot" style={{ background: 'var(--c-primary)' }}></div> 里程碑
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
