import { useMemo, useState, useSyncExternalStore } from 'react'
import { useConfirm } from '../components/feedback/ConfirmProvider'
import { useToast } from '../components/feedback/ToastProvider'
import {
  readPersistedTransferState,
  writePersistedTransferState,
} from '../features/settings/settingsTransferState'
import { useCloudSync } from '../features/sync/SyncProvider'
import {
  clearAllData,
  exportBackupData,
  getUndoHistorySnapshot,
  getUndoHistoryState,
  importBackupText,
  subscribeUndoHistory,
  undoEditOperationById,
} from '../legacy/actions'
import { downloadFile, formatFileDate, toCSV } from '../legacy/utils'
import {
  buildBackupSummary,
  buildEntityMaps,
  buildTaskExportRows,
  formatRecentLogs,
  getNeedsBackup,
} from '../legacy/selectors'
import { useLegacyStoreSnapshot } from '../legacy/useLegacyStore'

type TransferState = {
  action: 'clear' | 'export' | 'import'
  summary: ReturnType<typeof buildBackupSummary>
}

export function Settings() {
  const store = useLegacyStoreSnapshot()
  const { projects, tasks, people, logs } = store
  const { toast } = useToast()
  const { confirm } = useConfirm()
  useSyncExternalStore(subscribeUndoHistory, getUndoHistorySnapshot)
  const {
    state: cloudSyncState,
    statusLabel,
    lastSyncLabel,
    latestSyncLabel,
    manualSync,
    restoreCloudToLocal,
  } = useCloudSync()
  const [transferState, setTransferState] = useState<TransferState | null>(() => readPersistedTransferState())
  const entityMaps = useMemo(() => buildEntityMaps(projects, tasks, people), [people, projects, tasks])
  const needsBackup = useMemo(() => getNeedsBackup(logs, projects), [logs, projects])
  const currentSummary = useMemo(() => buildBackupSummary({ projects, tasks, people, logs, settings: [] }), [logs, people, projects, tasks])
  const recentLogs = useMemo(() => formatRecentLogs(logs), [logs])
  const undoState = getUndoHistoryState()

  const formatUndoTime = (value: string) => {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return '--'
    return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  }

  const handleExportJSON = async () => {
    const result = await exportBackupData()
    downloadFile(JSON.stringify(result.data, null, 2), result.filename)
    const nextState = { action: 'export' as const, summary: result.summary }
    setTransferState(nextState)
    writePersistedTransferState(nextState)
    toast('JSON 已导出', 'success')
  }

  const handleExportProjectsCSV = () => {
    const rows = projects.map((project) => ({
      id: project.id,
      name: project.name,
      status: project.status,
      priority: project.priority,
      ddl: project.ddl,
      description: project.description,
      createdAt: project.createdAt,
    }))
    const csv = toCSV(rows, ['id', 'name', 'status', 'priority', 'ddl', 'description', 'createdAt'])
    downloadFile(csv, `118-projects-${formatFileDate(new Date())}.csv`, 'text/csv;charset=utf-8')
    toast('项目 CSV 已导出', 'success')
  }

  const handleExportTasksCSV = () => {
    const rows = buildTaskExportRows(tasks, entityMaps)
    const csv = toCSV(rows, ['id', 'title', 'project', 'status', 'priority', 'assignee', 'startDate', 'endDate', 'scheduledDate', 'estimatedHours', 'createdAt'])
    downloadFile(csv, `118-tasks-${formatFileDate(new Date())}.csv`, 'text/csv;charset=utf-8')
    toast('任务 CSV 已导出', 'success')
  }

  const handleImportJSON = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (event: Event) => {
      const target = event.target as HTMLInputElement
      const file = target.files?.[0]
      if (!file) return
      const ok = await confirm('确认导入', '导入会用备份内容覆盖当前数据。建议先导出一份当前备份。')
      if (!ok) return

      try {
        const result = await importBackupText(await file.text())
        const nextState = { action: 'import' as const, summary: result.summary }
        setTransferState(nextState)
        writePersistedTransferState(nextState)
        toast('数据已恢复', 'success')
      } catch {
        toast('文件格式错误', 'error')
      }
    }
    input.click()
  }

  const handleClearAll = async () => {
    const ok = await confirm('清空数据', '将清除所有项目、任务、人员和日志，且无法撤销。')
    if (!ok) return
    const summary = await clearAllData()
    const nextState = { action: 'clear' as const, summary }
    setTransferState(nextState)
    writePersistedTransferState(nextState)
    toast('数据已清空', 'error')
  }

  const handleManualSyncAndBackup = async () => {
    try {
      await manualSync()
      const result = await exportBackupData()
      downloadFile(JSON.stringify(result.data, null, 2), result.filename)
      const nextState = { action: 'export' as const, summary: result.summary }
      setTransferState(nextState)
      writePersistedTransferState(nextState)
      toast('已同步到云端，并下载本地备份', 'success')
    } catch (error) {
      toast(error instanceof Error ? error.message : '云端同步失败', 'error')
    }
  }

  const handleRestoreCloud = async () => {
    const ok = await confirm('云端优先，更新本地', '这会用当前云端版本覆盖本地 IndexedDB。建议先导出本地 JSON。', {
      confirmLabel: '继续覆盖',
      tone: 'primary',
    })
    if (!ok) return

    try {
      await restoreCloudToLocal()
      toast('本地已更新到云端版本', 'success')
    } catch (error) {
      toast(error instanceof Error ? error.message : '云端恢复失败', 'error')
    }
  }

  const handleUndoByItem = async (id: string, label: string) => {
    const ok = await confirm('撤回操作', `将撤回「${label}」以及其后的变更，是否继续？`, {
      confirmLabel: '继续撤回',
      tone: 'primary',
    })
    if (!ok) return

    const reverted = await undoEditOperationById(id)
    if (!reverted) {
      toast('该操作已不可撤回', 'info')
      return
    }

    if (reverted.revertedCount > 1) {
      toast(`已撤回：${reverted.label}（同时回退 ${reverted.revertedCount} 步）`, 'success')
      return
    }

    toast(`已撤回：${reverted.label}`, 'success')
  }

  return (
    <div className="view-settings fade-in">
      <div className="view-header">
        <h1 className="view-title">设置与备份</h1>
      </div>

      <div className="settings-layout">
        <div className="settings-body">
          {needsBackup ? (
            <div className="backup-alert">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              您已超过一周未备份，建议导出 JSON。
            </div>
          ) : null}

          <div className="settings-columns">
            <div className="settings-section">
              <div className="settings-section-title">云端同步</div>
              <div className="settings-row">
                <div className="settings-row-info">
                  <div className="settings-row-label">{statusLabel}</div>
                  <div className="settings-row-desc">{lastSyncLabel}</div>
                </div>
                <div className="settings-row-action">
                  <span className={`badge ${cloudSyncState.phase === 'error' ? 'badge-blocked' : 'badge-active'}`}>
                    {cloudSyncState.configured ? '已连接' : '未配置'}
                  </span>
                </div>
                </div>
                <div className="settings-meta-list">
                  <div className="settings-meta-card">
                    <span className="settings-meta-label">最近同步/备份</span>
                    <strong className="settings-meta-value">{latestSyncLabel}</strong>
                  </div>
                </div>
                {cloudSyncState.message && cloudSyncState.phase === 'error' ? (
                  <div className="settings-transfer-note">{cloudSyncState.message}</div>
                ) : null}
            </div>

            <div className="settings-section">
              <div className="settings-section-title">数据导出</div>
              <div className="settings-row">
                <div className="settings-row-info">
                  <div className="settings-row-label">导出 JSON</div>
                  <div className="settings-row-desc">完整备份项目、任务、人员、日志和设置。</div>
                </div>
                <div className="settings-row-action">
                  <button className="btn btn-primary" type="button" onClick={() => void handleExportJSON()}>导出 JSON</button>
                </div>
              </div>
              <div className="settings-row">
                <div className="settings-row-info">
                  <div className="settings-row-label">导出 CSV</div>
                  <div className="settings-row-desc">导出项目或任务列表，方便整理和分享。</div>
                </div>
                <div className="settings-row-action">
                  <div className="settings-inline-actions">
                    <button className="btn btn-secondary btn-sm" type="button" onClick={handleExportProjectsCSV}>项目</button>
                    <button className="btn btn-secondary btn-sm" type="button" onClick={handleExportTasksCSV}>任务</button>
                  </div>
                </div>
              </div>
            </div>

            <div className="settings-section">
              <div className="settings-section-title">手动操作</div>
              <div className="settings-row">
                <div className="settings-row-info">
                  <div className="settings-row-label">手动同步并备份</div>
                  <div className="settings-row-desc">立即同步到云端，并下载一份当前 JSON 到本地。</div>
                </div>
                <div className="settings-row-action">
                  <button className="btn btn-primary" type="button" onClick={() => void handleManualSyncAndBackup()} disabled={!cloudSyncState.configured}>
                    同步并备份
                  </button>
                </div>
              </div>
            </div>

            <div className="settings-section">
              <div className="settings-section-title">数据导入</div>
              <div className="settings-row">
                <div className="settings-row-info">
                  <div className="settings-row-label">从 JSON 恢复</div>
                  <div className="settings-row-desc">导入前会提示确认，导入后会显示恢复摘要。</div>
                </div>
                <div className="settings-row-action">
                  <button className="btn btn-secondary" type="button" onClick={handleImportJSON}>导入备份</button>
                </div>
              </div>
            </div>

            <div className="settings-section">
              <div className="settings-section-title">云端恢复</div>
              <div className="settings-row">
                <div className="settings-row-info">
                  <div className="settings-row-label">云端优先，更新本地</div>
                  <div className="settings-row-desc">拉取当前云端主数据，并覆盖本地数据。</div>
                </div>
                <div className="settings-row-action">
                  <button className="btn btn-secondary" type="button" onClick={() => void handleRestoreCloud()} disabled={!cloudSyncState.configured || !cloudSyncState.hasCloudData}>
                    更新本地
                  </button>
                </div>
              </div>
            </div>

            <div className="settings-section">
              <div className="settings-section-title">危险操作</div>
              <div className="settings-row">
                <div className="settings-row-info">
                  <div className="settings-row-label danger-text">清空所有数据</div>
                  <div className="settings-row-desc">删除全部项目、任务、人员和日志。建议先备份。</div>
                </div>
                <div className="settings-row-action">
                  <button className="btn btn-danger" type="button" onClick={() => void handleClearAll()}>清空</button>
                </div>
              </div>
            </div>

            <div className="settings-section">
              <div className="settings-section-title">当前数据</div>
              <div className="settings-summary-grid">
                <div className="settings-summary-item"><span>项目</span><strong>{currentSummary.projectCount}</strong></div>
                <div className="settings-summary-item"><span>任务</span><strong>{currentSummary.taskCount}</strong></div>
                <div className="settings-summary-item"><span>人员</span><strong>{currentSummary.personCount}</strong></div>
                <div className="settings-summary-item"><span>日志</span><strong>{currentSummary.logCount}</strong></div>
              </div>
              {transferState ? (
                <div className="settings-transfer-note">
                  最近一次{transferState.action === 'export' ? '导出' : transferState.action === 'import' ? '导入' : '清空'}：
                  {transferState.summary.projectCount} 项目 · {transferState.summary.taskCount} 任务 · {transferState.summary.personCount} 人员 · {transferState.summary.logCount} 日志
                </div>
              ) : null}
            </div>

            <div className="settings-section">
              <div className="settings-section-title">关于</div>
              <div className="settings-row">
                <div className="settings-row-info">
                  <div className="settings-row-label">118 Studio Manager VC</div>
                  <div className="settings-row-desc">本地优先，数据存于 IndexedDB，可选接入 Cloudflare Worker 云同步。</div>
                </div>
                <div className="settings-row-action">
                  <span className="badge badge-active">v1.1</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="settings-log-panel">
          <div className="settings-section-title settings-log-title">最近操作</div>
          {undoState.count > 0 ? (
            <div className="settings-log-hint">可撤回最近 {undoState.count} 条编辑</div>
          ) : null}
          <div className="log-list">
            {undoState.items.length > 0 ? (
              undoState.items.map((item) => (
                <div key={item.id} className="log-item log-item-undo">
                  <div className="log-item-main">
                    <span className="log-time">{formatUndoTime(item.createdAt)}</span>
                    <span className="log-text">{item.label}</span>
                  </div>
                  <button className="btn btn-secondary btn-xs log-undo-btn" type="button" onClick={() => void handleUndoByItem(item.id, item.label)}>
                    撤回
                  </button>
                </div>
              ))
            ) : recentLogs.length === 0 ? (
              <div className="text-muted text-sm">先做一次导入或导出</div>
            ) : (
              recentLogs.map((log) => (
                <div key={log.id} className="log-item">
                  <span className="log-time">{log.date} {log.time}</span>
                  <span className="log-text">{log.text}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
