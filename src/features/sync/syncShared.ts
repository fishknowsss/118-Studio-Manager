import type { BackupPayload } from '../../legacy/utils'

export type SyncSource = 'auto' | 'manual'

export type SyncMeta = {
  version: string
  updatedAt: string
  source: SyncSource
}

export type SyncEnvelope = {
  meta: SyncMeta
  data: BackupPayload
}

export type SyncMetaResponse = {
  hasData: boolean
  current: SyncMeta | null
}

export function hasBackupContent(payload: BackupPayload) {
  return (
    payload.projects.length > 0 ||
    payload.tasks.length > 0 ||
    payload.people.length > 0 ||
    payload.logs.length > 0 ||
    payload.settings.length > 0
  )
}

export function applyRemoteWrite({
  payload,
  source,
  timestamp,
  version,
}: {
  payload: BackupPayload
  source: SyncSource
  timestamp: string
  version: string
}) {
  return {
    meta: {
      version,
      updatedAt: timestamp,
      source,
    },
    data: payload,
  }
}

export function shouldApplyRemoteCurrent({
  hasLocalData,
  pendingLocalChanges,
  remoteVersion,
  localAppliedVersion,
}: {
  hasLocalData: boolean
  pendingLocalChanges: boolean
  remoteVersion: string | null
  localAppliedVersion: string | null
}) {
  if (!remoteVersion || pendingLocalChanges) return false
  if (!hasLocalData) return true
  if (!localAppliedVersion) return false
  return localAppliedVersion !== remoteVersion
}

export function formatSyncSource(source: SyncSource | null) {
  if (source === 'manual') return '手动同步'
  if (source === 'auto') return '自动同步'
  return '未同步'
}

export function formatSyncDateTime(value: string | null) {
  if (!value) return '尚未同步'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '尚未同步'
  return date.toLocaleString('zh-CN', {
    hour12: false,
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
