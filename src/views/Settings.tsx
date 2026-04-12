import { useSyncExternalStore, useMemo } from 'react'
import { store } from '../legacy/store'
import { db } from '../legacy/db'
import { toCSV, downloadFile } from '../legacy/utils'
import { toast, confirm } from '../../js/components.js'

export function Settings() {
  useSyncExternalStore(store.subscribe, () => store.getSnapshot())
  const { projects, tasks, people, logs } = store

  // Backup reminder: check if any log contains "JSON 已导出" in the last 7 days
  const needsBackup = useMemo(() => {
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const recentExport = logs.find(l => 
      l.text.includes('JSON 已导出') && new Date(l.ts) > sevenDaysAgo
    )
    return !recentExport && projects.length > 0
  }, [logs, projects])

  const handleExportJSON = async () => {
    const data = await db.exportAll()
    const json = JSON.stringify(data, null, 2)
    const ts = new Date().toISOString().slice(0, 10)
    downloadFile(json, `118studio-backup-${ts}.json`)
    await store.addLog('JSON 已导出（全量备份）')
    toast('JSON 已导出', 'success')
  }

  const handleExportProjectsCSV = () => {
    const rows = projects.map(p => ({
      id: p.id, name: p.name, status: p.status, priority: p.priority,
      ddl: p.ddl, description: p.description, createdAt: p.createdAt,
    }))
    const csv = toCSV(rows, ['id','name','status','priority','ddl','description','createdAt'])
    downloadFile(csv, `118-projects-${new Date().toISOString().slice(0,10)}.csv`, 'text/csv;charset=utf-8')
    toast('项目 CSV 已导出', 'success')
  }

  const handleExportTasksCSV = () => {
    const rows = tasks.map(t => {
      const proj = projects.find(p => p.id === t.projectId)
      const person = people.find(p => p.id === t.assigneeId)
      return {
        id: t.id, title: t.title, project: proj?.name || '',
        status: t.status, priority: t.priority,
        assignee: person?.name || '', startDate: t.startDate,
        endDate: t.endDate, scheduledDate: t.scheduledDate,
        estimatedHours: t.estimatedHours, createdAt: t.createdAt,
      }
    })
    const csv = toCSV(rows, ['id','title','project','status','priority','assignee','startDate','endDate','scheduledDate','estimatedHours','createdAt'])
    downloadFile(csv, `118-tasks-${new Date().toISOString().slice(0,10)}.csv`, 'text/csv;charset=utf-8')
    toast('任务 CSV 已导出', 'success')
  }

  const handleImportJSON = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e: any) => {
      const file = e.target.files[0]
      if (!file) return
      const ok = await confirm('确认导入', '导入将清空现有所有数据，用文件内容替换。建议先导出备份。确认继续？')
      if (!ok) return
      try {
        const text = await file.text()
        const data = JSON.parse(text)
        await db.importAll(data)
        await store.loadAll()
        toast('数据已恢复', 'success')
      } catch {
        toast('文件格式错误', 'error')
      }
    }
    input.click()
  }

  const handleClearAll = async () => {
    const ok = await confirm('清空数据', '将清除所有项目、任务和人员数据，且无法撤销。是否继续？')
    if (!ok) return
    await db.clearAll()
    await store.loadAll()
    toast('数据已清空', 'error')
  }

  return (
    <div className="view-settings fade-in">
      <div className="view-header">
        <h1 className="view-title">设置与备份</h1>
      </div>

      <div className="settings-layout">
        <div className="settings-body">
          {needsBackup && (
            <div className="backup-alert" style={{ 
              background: 'var(--c-today-bg)', color: 'var(--c-today)', 
              padding: '12px 16px', borderRadius: 'var(--r-md)', marginBottom: '16px',
              fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px',
              border: '1px solid var(--c-today)'
            }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              您已超过一周未进行备份，建议导出 JSON 以确保数据安全。
            </div>
          )}

          <div className="settings-section">
            <div className="settings-section-title">数据导出</div>
            <div className="settings-row">
              <div className="settings-row-info">
                <div className="settings-row-label">导出 JSON（全量备份）</div>
                <div className="settings-row-desc">包含所有项目、任务、人员数据，可用于恢复。</div>
              </div>
              <button className="btn btn-primary" onClick={handleExportJSON}>导出 JSON</button>
            </div>
            <div className="settings-row">
              <div className="settings-row-info">
                <div className="settings-row-label">导出 CSV 列表</div>
                <div className="settings-row-desc">导出项目或任务的表格文件。</div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-secondary btn-sm" onClick={handleExportProjectsCSV}>项目</button>
                <button className="btn btn-secondary btn-sm" onClick={handleExportTasksCSV}>任务</button>
              </div>
            </div>
          </div>

          <div className="settings-section">
            <div className="settings-section-title">数据导入</div>
            <div className="settings-row">
              <div className="settings-row-info">
                <div className="settings-row-label">从 JSON 恢复</div>
                <div className="settings-row-desc">导入前将清空现有数据，请确认后操作。</div>
              </div>
              <button className="btn btn-secondary" onClick={handleImportJSON}>导入备份</button>
            </div>
          </div>

          <div className="settings-section">
            <div className="settings-section-title">危险操作</div>
            <div className="settings-row">
              <div className="settings-row-info">
                <div className="settings-row-label" style={{ color: 'var(--c-overdue)' }}>清空所有数据</div>
                <div className="settings-row-desc">删除全部项目、任务、人员，不可恢复。建议先备份。</div>
              </div>
              <button className="btn btn-danger" onClick={handleClearAll}>清空</button>
            </div>
          </div>

          <div className="settings-section">
            <div className="settings-section-title">关于</div>
            <div className="settings-row">
              <div className="settings-row-info">
                <div className="settings-row-label">118 Studio Manager VC</div>
                <div className="settings-row-desc">本地优先 · 数据存于 IndexedDB · 专为数媒工作室组长设计</div>
              </div>
              <span className="badge badge-active">v1.1</span>
            </div>
            <div className="settings-row">
              <div className="settings-row-info">
                <div className="settings-row-label">当前数据统计</div>
              </div>
              <span className="text-muted text-sm">
                {projects.length} 项目 · {tasks.length} 任务 · {people.length} 人员
              </span>
            </div>
          </div>
        </div>

        <div className="settings-log-panel">
          <div className="settings-section-title" style={{ marginBottom: '10px' }}>最近操作</div>
          <div className="log-list">
            {logs.length === 0 ? (
              <div className="text-muted text-sm">暂无操作记录</div>
            ) : (
              logs.slice(0, 30).map(l => {
                const d = new Date(l.ts)
                const time = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
                const date = `${d.getMonth() + 1}/${d.getDate()}`
                return (
                  <div key={l.id} className="log-item">
                    <span className="log-time">{date} {time}</span>
                    <span className="log-text">{l.text}</span>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
