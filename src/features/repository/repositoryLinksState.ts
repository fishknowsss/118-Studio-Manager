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

export function readRepositoryLinks() {
  if (typeof window === 'undefined') return [] as RepositoryLink[]

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return [] as RepositoryLink[]

    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return [] as RepositoryLink[]

    return parsed
      .map((item) => sanitizeLink(item as Partial<RepositoryLink>))
      .filter((item): item is RepositoryLink => Boolean(item && item.title && item.url))
  } catch {
    return [] as RepositoryLink[]
  }
}

export function writeRepositoryLinks(links: RepositoryLink[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(links))
}
