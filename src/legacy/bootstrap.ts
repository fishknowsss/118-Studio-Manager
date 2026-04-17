import { openDB } from './db'
import { store, type LegacyPerson, type LegacyProject, type LegacyTask } from './store'
import { shiftLocalDateKey } from './utils'
import { restoreCloudSnapshotOnBoot } from '../features/sync/bootstrapSync'
import { initializeSyncableViewState } from '../features/persistence/syncableViewState'
import { hasBackupContent } from '../features/sync/syncShared'
import { db } from './db'

let hasBooted = false

async function seedDemoData() {
  const uid = () => crypto.randomUUID()
  const timestamp = () => new Date().toISOString()

  const alice: LegacyPerson = { id: uid(), name: '陈佳宁', gender: 'female', status: 'active', skills: ['视频剪辑', 'After Effects', '调色'], notes: '主视频剪辑师', createdAt: timestamp(), updatedAt: timestamp() }
  const bob: LegacyPerson = { id: uid(), name: '王浩然', gender: 'male', status: 'active', skills: ['动态设计', 'Cinema 4D', '建模'], notes: '', createdAt: timestamp(), updatedAt: timestamp() }
  const carol: LegacyPerson = { id: uid(), name: '刘思敏', gender: 'female', status: 'active', skills: ['平面设计', 'Figma', '插画'], notes: '兼顾社媒', createdAt: timestamp(), updatedAt: timestamp() }

  const projA: LegacyProject = {
    id: uid(), name: '品牌宣传片 · 第三季', status: 'active', priority: 'urgent',
    ddl: shiftLocalDateKey(new Date(), 1), description: '客户品牌年度宣传片，3分钟正片+15s短版，需要4K交付。',
    createdAt: timestamp(), updatedAt: timestamp(),
  }
  const projB: LegacyProject = {
    id: uid(), name: '线下活动视觉设计', status: 'active', priority: 'high',
    ddl: shiftLocalDateKey(new Date(), 5), description: '5月线下沙龙活动——VI设计、海报、物料、现场大屏素材。',
    createdAt: timestamp(), updatedAt: timestamp(),
  }
  const projC: LegacyProject = {
    id: uid(), name: '社交媒体内容 · 4月', status: 'active', priority: 'medium',
    ddl: shiftLocalDateKey(new Date(), 18), description: '小红书 + 微博 + 视频号月度内容矩阵，共20条。',
    createdAt: timestamp(), updatedAt: timestamp(),
  }

  const tasks: LegacyTask[] = [
    { id: uid(), projectId: projA.id, title: '音效混音终版', status: 'in-progress', priority: 'urgent', assigneeIds: [alice.id, bob.id], scheduledDate: shiftLocalDateKey(new Date(), 0), startDate: shiftLocalDateKey(new Date(), -1), endDate: shiftLocalDateKey(new Date(), 0), estimatedHours: 4, description: '', createdAt: timestamp(), updatedAt: timestamp() },
    { id: uid(), projectId: projA.id, title: '客户修改版渲染输出', status: 'todo', priority: 'urgent', assigneeIds: [alice.id], scheduledDate: shiftLocalDateKey(new Date(), 1), startDate: shiftLocalDateKey(new Date(), 1), endDate: shiftLocalDateKey(new Date(), 1), estimatedHours: 2, description: '', createdAt: timestamp(), updatedAt: timestamp() },
    { id: uid(), projectId: projA.id, title: '片头动画调整', status: 'done', priority: 'high', assigneeIds: [bob.id], scheduledDate: shiftLocalDateKey(new Date(), -2), startDate: shiftLocalDateKey(new Date(), -3), endDate: shiftLocalDateKey(new Date(), -2), estimatedHours: 6, description: '', createdAt: timestamp(), updatedAt: timestamp() },
    { id: uid(), projectId: projB.id, title: 'VI色彩方案提案', status: 'in-progress', priority: 'high', assigneeIds: [carol.id], scheduledDate: shiftLocalDateKey(new Date(), 0), startDate: shiftLocalDateKey(new Date(), 0), endDate: shiftLocalDateKey(new Date(), 1), estimatedHours: 8, description: '', createdAt: timestamp(), updatedAt: timestamp() },
    { id: uid(), projectId: projB.id, title: '活动海报 A3 版设计', status: 'todo', priority: 'high', assigneeIds: [carol.id], scheduledDate: null, startDate: shiftLocalDateKey(new Date(), 2), endDate: shiftLocalDateKey(new Date(), 3), estimatedHours: 6, description: '', createdAt: timestamp(), updatedAt: timestamp() },
    { id: uid(), projectId: projB.id, title: '现场大屏动画', status: 'todo', priority: 'medium', assigneeIds: [bob.id], scheduledDate: null, startDate: shiftLocalDateKey(new Date(), 3), endDate: shiftLocalDateKey(new Date(), 4), estimatedHours: 10, description: '', createdAt: timestamp(), updatedAt: timestamp() },
    { id: uid(), projectId: projC.id, title: '4月选题列表', status: 'todo', priority: 'medium', assigneeIds: [], scheduledDate: null, startDate: shiftLocalDateKey(new Date(), 1), endDate: shiftLocalDateKey(new Date(), 2), estimatedHours: 2, description: '', createdAt: timestamp(), updatedAt: timestamp() },
    { id: uid(), projectId: projC.id, title: '拍摄脚本撰写', status: 'todo', priority: 'low', assigneeIds: [], scheduledDate: null, startDate: shiftLocalDateKey(new Date(), 3), endDate: shiftLocalDateKey(new Date(), 5), estimatedHours: 4, description: '', createdAt: timestamp(), updatedAt: timestamp() },
  ]

  for (const person of [alice, bob, carol]) await store.savePerson(person)
  for (const project of [projA, projB, projC]) await store.saveProject(project)
  for (const task of tasks) await store.saveTask(task)
  await store.addLog('加载了演示数据')
}

export async function initializeAppData() {
  if (hasBooted) return
  hasBooted = true

  await openDB()
  await store.loadAll()
  const localBackup = await db.exportAll()

  if (!hasBackupContent(localBackup)) {
    try {
      const restored = await restoreCloudSnapshotOnBoot()
      if (!restored) {
        await seedDemoData()
      }
    } catch {
      await seedDemoData()
    }
  }

  if (!window.location.hash) {
    window.location.hash = '#dashboard'
  }

  await initializeSyncableViewState()
}

export function disposeLegacyApp() {
  hasBooted = false
}
