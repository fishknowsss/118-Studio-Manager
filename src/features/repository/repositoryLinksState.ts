import { createSyncableSettingsStore } from '../persistence/syncableSettings'

export type RepositoryLinkTargetType = 'project' | 'task'

export type RepositoryLink = {
  id: string
  targetType: RepositoryLinkTargetType
  targetId: string
  title: string
  url: string
  note: string
  createdAt: string
  updatedAt: string
}

const STORAGE_KEY = 'repository-links-v1'
const SETTINGS_KEY = 'repository:links'

function sanitizeLink(raw: Partial<RepositoryLink>): RepositoryLink | null {
  if (!raw || typeof raw !== 'object') return null
  if (raw.targetType !== 'project' && raw.targetType !== 'task') return null
  if (typeof raw.targetId !== 'string' || !raw.targetId) return null

  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : crypto.randomUUID(),
    targetType: raw.targetType,
    targetId: raw.targetId,
    title: typeof raw.title === 'string' ? raw.title.trim() : '',
    url: typeof raw.url === 'string' ? raw.url.trim() : '',
    note: typeof raw.note === 'string' ? raw.note.trim() : '',
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString(),
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : new Date().toISOString(),
  }
}

export function normalizeLinkUrl(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

function sanitizeLinks(raw: unknown) {
  if (!Array.isArray(raw)) return [] as RepositoryLink[]
  return raw
    .map((item) => sanitizeLink(item as Partial<RepositoryLink>))
    .filter((item): item is RepositoryLink => Boolean(item && item.title && item.url))
}

const repositoryLinksStore = createSyncableSettingsStore<RepositoryLink[]>({
  key: SETTINGS_KEY,
  legacyKey: STORAGE_KEY,
  emptyValue: [],
  sanitize: sanitizeLinks,
})

export function readRepositoryLinks() {
  return repositoryLinksStore.read()
}

export function writeRepositoryLinks(links: RepositoryLink[]) {
  repositoryLinksStore.write(links)
}

export function subscribeRepositoryLinks(listener: () => void) {
  return repositoryLinksStore.subscribe(listener)
}

export async function initializeRepositoryLinksState() {
  await repositoryLinksStore.initialize()
}

export async function reloadRepositoryLinksStateFromDB() {
  await repositoryLinksStore.reloadFromDB()
}

export function __resetRepositoryLinksStateForTests() {
  repositoryLinksStore.resetForTests()
}
