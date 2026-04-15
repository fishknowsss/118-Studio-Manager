// ─── 甲方要求 ─────────────────────────────────────────

export type ClientBrief = {
  id: string
  /** 关联项目 ID，可为空表示不挂项目 */
  projectId: string | null
  /** 冗余存储项目名，防止项目被删后丢失记录 */
  projectName: string
  /** 甲方名称 */
  clientName: string
  /** 核心需求（多行） */
  requirements: string
  /** 风格偏好 */
  styleNotes: string
  /** 禁忌事项 */
  prohibitions: string
  /** 参考链接 */
  referenceUrls: { label: string; url: string }[]
  createdAt: string
  updatedAt: string
}

// ─── 账号密码 ─────────────────────────────────────────

export type AccountCategory = 'design' | 'social' | 'cloud' | 'media' | 'dev' | 'other'

export const ACCOUNT_CATEGORY_LABELS: Record<AccountCategory, string> = {
  design: '设计工具',
  social: '社交媒体',
  cloud:  '云存储',
  media:  '视频/剪辑',
  dev:    '开发服务',
  other:  '其他',
}

export const ACCOUNT_CATEGORIES: AccountCategory[] = ['design', 'social', 'cloud', 'media', 'dev', 'other']

export type AccountCredential = {
  id: string
  platform: string
  url: string
  account: string
  password: string
  note: string
  category: AccountCategory
  createdAt: string
  updatedAt: string
}

// ─── 存储 Key ─────────────────────────────────────────

const BRIEF_KEY = 'materials-briefs-v1'
const ACCOUNT_KEY = 'materials-accounts-v1'

// ─── ClientBrief helpers ──────────────────────────────

function sanitizeBrief(raw: Partial<ClientBrief>): ClientBrief | null {
  if (!raw || typeof raw !== 'object') return null
  return {
    id:            typeof raw.id === 'string' && raw.id ? raw.id : crypto.randomUUID(),
    projectId:     typeof raw.projectId === 'string' ? raw.projectId : null,
    projectName:   typeof raw.projectName === 'string' ? raw.projectName.trim() : '',
    clientName:    typeof raw.clientName === 'string' ? raw.clientName.trim() : '',
    requirements:  typeof raw.requirements === 'string' ? raw.requirements : '',
    styleNotes:    typeof raw.styleNotes === 'string' ? raw.styleNotes : '',
    prohibitions:  typeof raw.prohibitions === 'string' ? raw.prohibitions : '',
    referenceUrls: Array.isArray(raw.referenceUrls) ? raw.referenceUrls.filter(
      (r): r is { label: string; url: string } =>
        r && typeof r.label === 'string' && typeof r.url === 'string',
    ) : [],
    createdAt:     typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString(),
    updatedAt:     typeof raw.updatedAt === 'string' ? raw.updatedAt : new Date().toISOString(),
  }
}

export function readBriefs(): ClientBrief[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(BRIEF_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((item) => sanitizeBrief(item as Partial<ClientBrief>))
      .filter((item): item is ClientBrief => item !== null)
  } catch {
    return []
  }
}

export function writeBriefs(briefs: ClientBrief[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(BRIEF_KEY, JSON.stringify(briefs))
}

// ─── AccountCredential helpers ────────────────────────

const VALID_CATEGORIES = new Set<string>(ACCOUNT_CATEGORIES)

function sanitizeAccount(raw: Partial<AccountCredential>): AccountCredential | null {
  if (!raw || typeof raw !== 'object') return null
  return {
    id:        typeof raw.id === 'string' && raw.id ? raw.id : crypto.randomUUID(),
    platform:  typeof raw.platform === 'string' ? raw.platform.trim() : '',
    url:       typeof raw.url === 'string' ? raw.url.trim() : '',
    account:   typeof raw.account === 'string' ? raw.account.trim() : '',
    password:  typeof raw.password === 'string' ? raw.password : '',
    note:      typeof raw.note === 'string' ? raw.note.trim() : '',
    category:  VALID_CATEGORIES.has(raw.category as string)
                 ? (raw.category as AccountCategory)
                 : 'other',
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString(),
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : new Date().toISOString(),
  }
}

export function readAccounts(): AccountCredential[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(ACCOUNT_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((item) => sanitizeAccount(item as Partial<AccountCredential>))
      .filter((item): item is AccountCredential => item !== null)
  } catch {
    return []
  }
}

export function writeAccounts(accounts: AccountCredential[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(ACCOUNT_KEY, JSON.stringify(accounts))
}

export function normalizeMaterialUrl(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}
