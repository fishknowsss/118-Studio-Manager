import { db } from './db'
import {
  discardUndoCheckpoint,
  getUndoHistorySnapshot,
  getUndoHistoryState,
  pushUndoCheckpoint,
  subscribeUndoHistory,
  undoEditById,
  undoLastEdit,
} from './editUndo'
import type {
  LegacyMilestone,
  LegacyPerson,
  LegacyProject,
  LegacyTask,
  PersonGender,
  PersonStatus,
  ProjectPriority,
  ProjectStatus,
  TaskPriority,
  TaskStatus,
} from './store'
import { store, getTaskAssigneeIds, syncTaskStatusWithAssignees } from './store'
import { buildBackupSummary } from './selectors'
import { formatFileDate, normalizeImportedBackup, now, uid } from './utils'
import { reloadSyncableViewStateFromDB } from '../features/persistence/syncableViewState'

export type ProjectFormInput = {
  name: string | null
  status: ProjectStatus | null
  priority: ProjectPriority | null
  ddl: string | null
  description: string | null
  milestones: LegacyMilestone[]
}

export type TaskFormInput = {
  title: string | null
  projectId: string | null
  status: TaskStatus | null
  priority: TaskPriority | null
  assigneeIds: string[]
  scheduledDate: string | null
  startDate: string | null
  endDate: string | null
  estimatedHours: number | null
  description: string | null
}

export type PersonFormInput = {
  name: string | null
  gender: PersonGender | '' | null
  status: PersonStatus | null
  skills: string[]
  notes: string | null
}

async function runWithUndo<T>(label: string, operation: () => Promise<T>) {
  const checkpointId = await pushUndoCheckpoint(label)

  try {
    return await operation()
  } catch (error) {
    discardUndoCheckpoint(checkpointId)
    throw error
  }
}

export function buildProjectRecord(
  project: LegacyProject | null,
  form: ProjectFormInput,
  timestamp = now(),
): LegacyProject {
  return {
    id: project?.id || uid(),
    name: form.name?.trim() || '',
    status: form.status || 'active',
    priority: form.priority || 'medium',
    ddl: form.ddl || null,
    description: form.description || '',
    milestones: form.milestones,
    createdAt: project?.createdAt || timestamp,
    updatedAt: timestamp,
  }
}

export function buildTaskRecord(
  task: LegacyTask | null,
  form: TaskFormInput,
  timestamp = now(),
): LegacyTask {
  const nextTask = {
    id: task?.id || uid(),
    title: form.title?.trim() || '',
    projectId: form.projectId || null,
    status: form.status || 'todo',
    priority: form.priority || 'medium',
    assigneeIds: form.assigneeIds,
    scheduledDate: form.scheduledDate || null,
    startDate: form.startDate || null,
    endDate: form.endDate || null,
    estimatedHours: form.estimatedHours,
    description: form.description || '',
    createdAt: task?.createdAt || timestamp,
    updatedAt: timestamp,
  }

  const hasExplicitStatusChange = task
    ? (form.status || 'todo') !== (task.status || 'todo')
    : Boolean(form.status && form.status !== 'todo')

  return syncTaskStatusWithAssignees(task, nextTask, hasExplicitStatusChange)
}

export function buildPersonRecord(
  person: LegacyPerson | null,
  form: PersonFormInput,
  timestamp = now(),
): LegacyPerson {
  return {
    id: person?.id || uid(),
    name: form.name?.trim() || '',
    gender: form.gender || '',
    status: form.status || 'active',
    skills: form.skills,
    notes: form.notes || '',
    createdAt: person?.createdAt || timestamp,
    updatedAt: timestamp,
  }
}

export async function saveProjectFromForm(project: LegacyProject | null, form: ProjectFormInput) {
  return await runWithUndo(
    `${project ? '编辑' : '创建'}项目「${form.name?.trim() || '未命名项目'}」`,
    async () => {
      const saved = buildProjectRecord(project, form)
      await store.saveProject(saved)
      await store.addLog(`${project ? '编辑' : '创建'}项目「${saved.name}」`)
      return saved
    },
  )
}

export async function saveTaskFromForm(task: LegacyTask | null, form: TaskFormInput) {
  return await runWithUndo(
    `${task ? '编辑' : '创建'}任务「${form.title?.trim() || '未命名任务'}」`,
    async () => {
      const saved = buildTaskRecord(task, form)
      await store.saveTask(saved)
      await store.addLog(`${task ? '编辑' : '创建'}任务「${saved.title}」`)
      return saved
    },
  )
}

export async function savePersonFromForm(person: LegacyPerson | null, form: PersonFormInput) {
  return await runWithUndo(
    `${person ? '编辑' : '新增'}人员「${form.name?.trim() || '未命名人员'}」`,
    async () => {
      const saved = buildPersonRecord(person, form)
      await store.savePerson(saved)
      await store.addLog(`${person ? '编辑' : '新增'}人员「${saved.name}」`)
      return saved
    },
  )
}

export async function deleteProjectWithLog(project: LegacyProject) {
  await runWithUndo(`删除项目「${project.name || '未命名项目'}」`, async () => {
    await store.deleteProject(project.id)
    await store.addLog(`删除项目「${project.name}」`)
  })
}

export async function deleteTaskWithLog(task: LegacyTask) {
  await runWithUndo(`删除任务「${task.title || '未命名任务'}」`, async () => {
    await store.deleteTask(task.id)
    await store.addLog(`删除任务「${task.title}」`)
  })
}

export async function deletePersonWithLog(person: LegacyPerson) {
  await runWithUndo(`删除人员「${person.name || '未命名人员'}」`, async () => {
    await store.deletePerson(person.id)
    await store.addLog(`删除人员「${person.name}」`)
  })
}

export async function toggleTaskStatus(task: LegacyTask) {
  return await runWithUndo(`切换任务状态「${task.title || '未命名任务'}」`, async () => {
    const nextStatus: TaskStatus = task.status === 'done' ? 'todo' : 'done'
    const updated = { ...task, status: nextStatus, updatedAt: now() }
    await store.saveTask(updated)
    await store.addLog(`${nextStatus === 'done' ? '完成' : '重开'}任务「${task.title}」`)
    return updated
  })
}

export async function togglePersonStatus(person: LegacyPerson) {
  return await runWithUndo(`切换人员状态「${person.name || '未命名人员'}」`, async () => {
    const nextStatus: PersonStatus = person.status === 'active' ? 'inactive' : 'active'
    const updated = { ...person, status: nextStatus, updatedAt: now() }
    await store.savePerson(updated)
    await store.addLog(`${nextStatus === 'active' ? '启用' : '停用'}人员「${person.name}」`)
    return updated
  })
}

export async function updateProjectStatus(projectId: string, status: ProjectStatus) {
  const project = store.getProject(projectId)
  if (!project) return null
  return await runWithUndo(`更新项目状态「${project.name || '未命名项目'}」`, async () => {
    const updated = { ...project, status, updatedAt: now() }
    await store.saveProject(updated)
    await store.addLog(`更新项目状态「${project.name}」`)
    return updated
  })
}

export async function updateTaskQuickField(taskId: string, patch: Partial<LegacyTask>) {
  const task = store.getTask(taskId)
  if (!task) return null
  return await runWithUndo(`更新任务「${task.title || '未命名任务'}」`, async () => {
    const nextTask = { ...task, ...patch, updatedAt: now() }
    const hasExplicitStatusChange = Object.prototype.hasOwnProperty.call(patch, 'status')
    const updated = syncTaskStatusWithAssignees(task, nextTask, hasExplicitStatusChange)
    await store.saveTask(updated)
    await store.addLog(`更新任务「${task.title}」`)
    return updated
  })
}

export async function assignTaskToPerson(taskId: string, personId: string) {
  const task = store.getTask(taskId)
  const person = store.getPerson(personId)
  if (!task || !person) return null

  return await runWithUndo(`分配任务「${task.title || '未命名任务'}」`, async () => {
    const currentIds = getTaskAssigneeIds(task)
    const assigneeIds = currentIds.includes(personId) ? currentIds : [...currentIds, personId]
    const updated = syncTaskStatusWithAssignees(task, { ...task, assigneeIds, updatedAt: now() })

    await store.saveTask(updated)
    await store.addLog(`分配任务「${task.title}」给 ${person.name || ''}`)
    return updated
  })
}

export async function exportBackupData() {
  const data = await db.exportAll()
  await store.addLog('JSON 已导出')
  return {
    data,
    filename: `118studio-backup-${formatFileDate(new Date())}.json`,
    summary: buildBackupSummary(data),
  }
}

export async function importBackupText(text: string) {
  return await runWithUndo('导入备份', async () => {
    const parsed = normalizeImportedBackup(JSON.parse(text))
    await db.importAll(parsed)
    await reloadSyncableViewStateFromDB()
    await store.loadAll()
    return {
      data: parsed,
      summary: buildBackupSummary(parsed),
    }
  })
}

export async function clearAllData() {
  return await runWithUndo('清空所有数据', async () => {
    const current = await db.exportAll()
    const summary = buildBackupSummary(current)
    await db.clearAll()
    await reloadSyncableViewStateFromDB()
    await store.loadAll()
    return summary
  })
}

export async function undoLastEditOperation() {
  return await undoLastEdit()
}

export async function undoEditOperationById(id: string) {
  return await undoEditById(id)
}

export {
  getUndoHistorySnapshot,
  getUndoHistoryState,
  subscribeUndoHistory,
}
