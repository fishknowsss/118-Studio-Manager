import type { BackupPayload } from '../../legacy/utils'
import type { SyncEnvelope, SyncMetaResponse, SyncSource } from './syncShared'

const API_URL = import.meta.env.VITE_SYNC_API_URL?.trim().replace(/\/$/, '') || ''

function buildCloudSyncAccessMessage() {
  try {
    const syncOrigin = new URL(API_URL).origin
    return `云同步请求失败。若已启用 Cloudflare Access，请先在新标签打开 ${syncOrigin} 完成登录后重试。`
  } catch {
    return '云同步请求失败。若已启用 Cloudflare Access，请先重新登录同步域名后重试。'
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

async function requestCloudSyncJson<T>(path: string, init: RequestInit) {
  if (!API_URL) throw new Error('未配置云同步地址')

  let response: Response
  try {
    response = await fetch(`${API_URL}${path}`, {
      credentials: 'include',
      ...init,
    })
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(buildCloudSyncAccessMessage())
    }
    throw error
  }

  const contentType = response.headers.get('Content-Type')?.toLowerCase() || ''
  if (!contentType.includes('application/json')) {
    throw new Error(buildCloudSyncAccessMessage())
  }

  return await readJson<T>(response)
}

export async function fetchCloudSyncMeta() {
  return await requestCloudSyncJson<SyncMetaResponse>('/meta', {
    method: 'GET',
  })
}

export async function fetchCloudSyncData() {
  return await requestCloudSyncJson<{ current: SyncEnvelope | null }>('/data', {
    method: 'GET',
  })
}

export async function pushCloudSyncData({
  payload,
  source,
}: {
  payload: BackupPayload
  source: SyncSource
}) {
  return await requestCloudSyncJson<{ current: SyncEnvelope }>('/data', {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain',
    },
    body: JSON.stringify({
      payload,
      source,
    }),
  })
}
