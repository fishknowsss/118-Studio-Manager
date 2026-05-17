import { createSyncableSettingsStore } from '../persistence/syncableSettings'

export type HomeResourceLinkState = {
  url: string
}

const HOME_RESOURCE_LINK_KEY = 'dashboard:home-resource-link'

function sanitizeHomeResourceLinkState(raw: unknown): HomeResourceLinkState {
  if (!raw || typeof raw !== 'object') return { url: '' }
  const value = raw as { url?: unknown }
  return {
    url: typeof value.url === 'string' ? value.url.trim() : '',
  }
}

const homeResourceLinkStore = createSyncableSettingsStore<HomeResourceLinkState>({
  key: HOME_RESOURCE_LINK_KEY,
  emptyValue: { url: '' },
  sanitize: sanitizeHomeResourceLinkState,
})

export function readHomeResourceLinkState() {
  return homeResourceLinkStore.read()
}

export function subscribeHomeResourceLinkState(listener: () => void) {
  return homeResourceLinkStore.subscribe(listener)
}

export function writeHomeResourceLink(url: string) {
  homeResourceLinkStore.write({ url: normalizeHomeResourceUrl(url) })
}

export async function initializeHomeResourceLinkState() {
  await homeResourceLinkStore.initialize()
}

export async function reloadHomeResourceLinkStateFromDB() {
  await homeResourceLinkStore.reloadFromDB()
}

export function normalizeHomeResourceUrl(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

