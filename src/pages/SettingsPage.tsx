import { useEffect, useRef, useState } from 'react'
import { useSettings } from '../hooks/useSettings'
import { useProjects } from '../hooks/useProjects'
import { useTasks } from '../hooks/useTasks'
import { useAssignments } from '../hooks/useAssignments'
import { usePeople } from '../hooks/usePeople'
import { PageHeader } from '../components/PageHeader'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { Modal } from '../components/Modal'
import { FormField } from '../components/FormField'
import { inputClass } from '../components/formFieldClasses'
import { exportFullJSON, parseImportFile, importFullJSON, downloadJSON, type ImportSummary } from '../services/backupService'
import { arrayToCSV, downloadCSV } from '../utils/csv'
import { formatDateTime, today } from '../utils/date'
import { ASSIGNMENT_STATUS_LABELS, DEFAULT_VIEW_OPTIONS, PRIORITY_LABELS, PROJECT_STATUS_LABELS, TASK_STATUS_LABELS } from '../constants'
import dayjs from 'dayjs'

export function SettingsPage() {
  const { setting, updateSetting, updateLastBackup } = useSettings()
  const { projects } = useProjects()
  const { tasks } = useTasks()
  const { assignments } = useAssignments(today())
  const { people } = usePeople()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null)
  const [importRawData, setImportRawData] = useState('')
  const [importError, setImportError] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)
  const [message, setMessage] = useState('')
  const [studioName, setStudioName] = useState('')
  const [defaultView, setDefaultView] = useState('dashboard')
  const [backupReminderDays, setBackupReminderDays] = useState(7)
  const [savingName, setSavingName] = useState(false)

  useEffect(() => {
    if (!setting) return
    setStudioName(setting.studioName)
    setDefaultView(setting.defaultView)
    setBackupReminderDays(setting.backupReminderDays)
    document.title = setting.studioName
  }, [setting])

  const handleSaveStudioName = async () => {
    const nextName = studioName.trim()
    if (!nextName) {
      setMessage('应用名称不能为空')
      return
    }

    try {
      setSavingName(true)
      await updateSetting({
        studioName: nextName,
        defaultView,
        backupReminderDays: Math.max(1, backupReminderDays),
      })
      document.title = nextName
      setMessage('应用设置已保存')
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      setMessage('保存失败: ' + String(err))
    } finally {
      setSavingName(false)
    }
  }

  const handleExportJSON = async () => {
    try {
      const json = await exportFullJSON()
      const filename = `118StudioManager_backup_${dayjs().format('YYYYMMDD_HHmmss')}.json`
      downloadJSON(json, filename)
      await updateLastBackup()
      setMessage('JSON 备份已导出')
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      setMessage('导出失败: ' + String(err))
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImportError('')

    try {
      const text = await file.text()
      const result = await parseImportFile(text)

      if ('error' in result) {
        setImportSummary(null)
        setImportRawData('')
        setImportError(result.error)
        setShowConfirm(false)
        return
      }

      setImportSummary(result.summary)
      setImportRawData(result.rawData)
      setShowConfirm(true)
    } catch (err) {
      setImportSummary(null)
      setImportRawData('')
      setImportError('读取文件失败: ' + String(err))
      setShowConfirm(false)
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleImportConfirm = async () => {
    try {
      setImporting(true)
      await importFullJSON(importRawData)
      setShowConfirm(false)
      setImportSummary(null)
      setImportRawData('')
      setMessage('数据恢复成功')
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      setImportError('导入失败: ' + String(err))
    } finally {
      setImporting(false)
    }
  }

  const handleExportProjectsCSV = () => {
    const csv = arrayToCSV(projects.map(project => ({
      ...project,
      statusLabel: PROJECT_STATUS_LABELS[project.status],
      priorityLabel: PRIORITY_LABELS[project.priority],
    })), [
      { key: 'name', label: '项目名称' },
      { key: 'type', label: '类型' },
      { key: 'statusLabel', label: '状态' },
      { key: 'priorityLabel', label: '优先级' },
      { key: 'deadline', label: '截止日期' },
      { key: 'clientOrSource', label: '客户/来源' },
      { key: 'description', label: '描述' },
    ])
    downloadCSV(csv, `projects_${dayjs().format('YYYYMMDD')}.csv`)
  }

  const handleExportTasksCSV = () => {
    const projectMap = new Map(projects.map(p => [p.id, p.name]))
    const tasksWithProject = tasks.map(t => ({
      ...t,
      projectName: projectMap.get(t.projectId) || '',
      statusLabel: TASK_STATUS_LABELS[t.status],
      priorityLabel: PRIORITY_LABELS[t.priority],
    }))
    const csv = arrayToCSV(tasksWithProject, [
      { key: 'title', label: '任务标题' },
      { key: 'projectName', label: '所属项目' },
      { key: 'statusLabel', label: '状态' },
      { key: 'priorityLabel', label: '优先级' },
      { key: 'dueDate', label: '截止日期' },
      { key: 'estimatedHours', label: '预估工时' },
      { key: 'description', label: '描述' },
    ])
    downloadCSV(csv, `tasks_${dayjs().format('YYYYMMDD')}.csv`)
  }

  const handleExportDailyCSV = () => {
    const taskMap = new Map(tasks.map(task => [task.id, task.title]))
    const projectMap = new Map(projects.map(project => [project.id, project.name]))
    const personMap = new Map(people.map(person => [person.id, person.name]))
    const csv = arrayToCSV(assignments.map(assignment => ({
      ...assignment,
      projectName: projectMap.get(assignment.projectId) || assignment.projectId,
      taskTitle: taskMap.get(assignment.taskId) || assignment.taskId,
      personName: personMap.get(assignment.personId) || assignment.personId,
      assignmentStatusLabel: ASSIGNMENT_STATUS_LABELS[assignment.assignmentStatus],
    })), [
      { key: 'date', label: '日期' },
      { key: 'projectName', label: '项目' },
      { key: 'taskTitle', label: '任务' },
      { key: 'personName', label: '人员' },
      { key: 'assignmentStatusLabel', label: '状态' },
      { key: 'note', label: '备注' },
    ])
    downloadCSV(csv, `daily_${today()}.csv`)
  }

  return (
    <>
      <PageHeader title="设置与备份" subtitle="管理数据备份和恢复" />

      {message && (
        <div className="mb-4 p-3 rounded-md bg-accent-teal/10 text-accent-teal text-sm">
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card className="p-5">
          <h3 className="text-base font-medium mb-1">应用信息</h3>
          <p className="text-xs text-text-secondary mb-4">配置应用标题、默认首页和备份提醒偏好</p>

          <div className="space-y-4">
            <FormField label="应用名称" required>
              <input
                type="text"
                value={studioName}
                onChange={e => setStudioName(e.target.value)}
                placeholder="请输入应用名称"
                className={inputClass}
              />
            </FormField>

            <FormField label="默认打开页面">
              <select
                className={inputClass}
                value={defaultView}
                onChange={e => setDefaultView(e.target.value)}
              >
                {DEFAULT_VIEW_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </FormField>

            <FormField label="备份提醒天数">
              <input
                type="number"
                min={1}
                max={365}
                value={backupReminderDays}
                onChange={e => setBackupReminderDays(Math.max(1, Number(e.target.value) || 1))}
                className={inputClass}
              />
            </FormField>

            {setting?.lastOpenedDate && (
              <p className="text-xs text-text-muted">最近打开的日计划: {setting.lastOpenedDate}</p>
            )}

            <div className="flex justify-end">
              <Button onClick={handleSaveStudioName} disabled={savingName || !studioName.trim()}>
                {savingName ? '保存中...' : '保存设置'}
              </Button>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="text-base font-medium mb-1">JSON 完整备份</h3>
          <p className="text-xs text-text-secondary mb-4">导出包含所有数据的 JSON 文件，可用于完整恢复</p>

          {setting?.lastBackupAt && (
            <p className="text-xs text-text-muted mb-3">
              上次备份: {formatDateTime(setting.lastBackupAt)}
            </p>
          )}

          <div className="flex gap-2">
            <Button onClick={handleExportJSON}>导出 JSON</Button>
            <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>导入恢复</Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
          {importError && <p className="text-xs text-danger mt-2">{importError}</p>}
        </Card>

        <Card className="p-5 lg:col-span-2">
          <h3 className="text-base font-medium mb-1">CSV 导出</h3>
          <p className="text-xs text-text-secondary mb-4">导出单独的数据表为 CSV 格式</p>

          <div className="space-y-2">
            <Button variant="secondary" onClick={handleExportProjectsCSV} className="w-full justify-start">
              导出项目列表 ({projects.length})
            </Button>
            <Button variant="secondary" onClick={handleExportTasksCSV} className="w-full justify-start">
              导出任务列表 ({tasks.length})
            </Button>
            <Button variant="secondary" onClick={handleExportDailyCSV} className="w-full justify-start">
              导出今日安排 ({assignments.length})
            </Button>
          </div>
        </Card>
      </div>

      <Modal open={showConfirm} onClose={() => setShowConfirm(false)} title="确认导入">
        <div className="space-y-3">
          <p className="text-sm text-danger font-medium">导入将覆盖当前所有数据，此操作不可撤销！</p>
          <p className="text-sm text-text-secondary">备份文件包含:</p>
          {importSummary && (
            <ul className="text-sm text-text-primary space-y-1 ml-4 list-disc">
              <li>{importSummary.projects} 个项目</li>
              <li>{importSummary.people} 个人员</li>
              <li>{importSummary.tasks} 个任务</li>
              <li>{importSummary.milestones} 个里程碑</li>
              <li>{importSummary.assignments} 条分配记录</li>
              <li>{importSummary.logs} 条操作日志</li>
              <li>{importSummary.settings} 条设置记录</li>
            </ul>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowConfirm(false)}>取消</Button>
            <Button variant="danger" onClick={handleImportConfirm} disabled={importing}>
              {importing ? '导入中...' : '确认覆盖导入'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
