import { db } from './db'
import { store } from './store'
import type { BackupPayload } from './utils'
import { reloadSyncableViewStateFromDB } from '../features/persistence/syncableViewState'

type UndoEntry = {
  id: string
  label: string
  createdAt: string
  snapshot: BackupPayload
}

type UndoEntryMeta = Omit<UndoEntry, 'snapshot'>

const MAX_UNDO_COUNT = 10
const undoStack: UndoEntry[] = []
const listeners = new Set<() => void>()
let version = 0

function emitUndoChanged() {
  version += 1
  listeners.forEach((listener) => listener())
}

export function subscribeUndoHistory(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getUndoHistorySnapshot() {
  return version
}

export function getUndoHistoryState() {
  return {
    count: undoStack.length,
    latestLabel: undoStack[0]?.label || null,
    items: undoStack.map<UndoEntryMeta>((item) => ({
      id: item.id,
      label: item.label,
      createdAt: item.createdAt,
    })),
  }
}

export async function pushUndoCheckpoint(label: string) {
  const snapshot = await db.exportAll()
  const id = crypto.randomUUID()

  undoStack.unshift({
    id,
    label,
    createdAt: new Date().toISOString(),
    snapshot,
  })

  if (undoStack.length > MAX_UNDO_COUNT) {
    undoStack.length = MAX_UNDO_COUNT
  }

  emitUndoChanged()
  return id
}

export function discardUndoCheckpoint(id: string) {
  const index = undoStack.findIndex((entry) => entry.id === id)
  if (index < 0) return
  undoStack.splice(index, 1)
  emitUndoChanged()
}

export async function undoLastEdit() {
  const entry = undoStack[0]
  if (!entry) return null

  await db.importAll(entry.snapshot)
  await reloadSyncableViewStateFromDB()
  await store.loadAll()
  undoStack.shift()
  emitUndoChanged()

  return {
    id: entry.id,
    label: entry.label,
    createdAt: entry.createdAt,
    revertedCount: 1,
  }
}

export async function undoEditById(id: string) {
  const index = undoStack.findIndex((entry) => entry.id === id)
  if (index < 0) return null

  const target = undoStack[index]
  if (!target) return null

  await db.importAll(target.snapshot)
  await reloadSyncableViewStateFromDB()
  await store.loadAll()
  const revertedCount = index + 1
  undoStack.splice(0, revertedCount)
  emitUndoChanged()

  return {
    id: target.id,
    label: target.label,
    createdAt: target.createdAt,
    revertedCount,
  }
}
