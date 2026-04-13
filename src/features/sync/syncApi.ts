import type { BackupPayload } from '../../legacy/utils'
import type { SyncEnvelope, SyncMetaResponse, SyncSource } from './syncShared'

const API_URL = import.meta.env.VITE_SYNC_API_URL?.trim().replace(/\/$/, '') || ''

function buildHeaders() {
  return {
    'Content-Type': 'application/json',
  }
}

async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text()
  const parsed = text ? JSON.parse(text) : {}
  if (!response.ok) {
    const message = parsed?.error || '云端同步失败'
    throw new Error(message)
  }
  return parsed as T
}

export function isCloudSyncConfigured() {
  return Boolean(API_URL)
}

export async function fetchCloudSyncMeta() {
  if (!API_URL) throw new Error('未配置云同步地址')
  const response = await fetch(`${API_URL}/meta`, {
    method: 'GET',
    headers: buildHeaders(),
  })
  return await readJson<SyncMetaResponse>(response)
}

export async function fetchCloudSyncData() {
  if (!API_URL) throw new Error('未配置云同步地址')
  const response = await fetch(`${API_URL}/data`, {
    method: 'GET',
    headers: buildHeaders(),
  })
  return await readJson<{ current: SyncEnvelope | null }>(response)
}

export async function pushCloudSyncData({
  payload,
  source,
}: {
  payload: BackupPayload
  source: SyncSource
}) {
  if (!API_URL) throw new Error('未配置云同步地址')
  const response = await fetch(`${API_URL}/data`, {
    method: 'PUT',
    headers: buildHeaders(),
    body: JSON.stringify({
      payload,
      source,
    }),
  })
  return await readJson<{ current: SyncEnvelope }>(response)
}
