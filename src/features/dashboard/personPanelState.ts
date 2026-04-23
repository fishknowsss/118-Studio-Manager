import { createSyncableSettingsStore } from '../persistence/syncableSettings'

export type DashboardPersonPresence = 'default' | 'present'
export type DashboardPersonStatusAction = DashboardPersonPresence | 'leave'

export type DashboardPersonPanelState = {
  order: string[]
  presenceByPersonId: Record<string, 'present'>
}

const DASHBOARD_PERSON_PANEL_KEY = 'dashboard:people-panel'

function sanitizeOrder(raw: unknown) {
  if (!Array.isArray(raw)) return [] as string[]

  return raw
    .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    .map((item) => item.trim())
    .filter((item, index, list) => list.indexOf(item) === index)
}

function sanitizePresenceByPersonId(raw: unknown) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {} as Record<string, 'present'>
  }

  return Object.fromEntries(
    Object.entries(raw).filter(([personId, presence]) => (
      typeof personId === 'string' &&
      personId.trim().length > 0 &&
      presence === 'present'
    )),
  ) as Record<string, 'present'>
}

function sanitizeDashboardPersonPanelState(raw: unknown): DashboardPersonPanelState {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      order: [],
      presenceByPersonId: {},
    }
  }

  const value = raw as {
    order?: unknown
    presenceByPersonId?: unknown
  }

  return {
    order: sanitizeOrder(value.order),
    presenceByPersonId: sanitizePresenceByPersonId(value.presenceByPersonId),
  }
}

const dashboardPersonPanelStore = createSyncableSettingsStore<DashboardPersonPanelState>({
  key: DASHBOARD_PERSON_PANEL_KEY,
  emptyValue: {
    order: [],
    presenceByPersonId: {},
  },
  sanitize: sanitizeDashboardPersonPanelState,
})

export function readDashboardPersonPanelState() {
  return dashboardPersonPanelStore.read()
}

export function subscribeDashboardPersonPanelState(listener: () => void) {
  return dashboardPersonPanelStore.subscribe(listener)
}

export function writeDashboardPersonOrder(order: string[]) {
  const current = dashboardPersonPanelStore.read()
  dashboardPersonPanelStore.write({
    ...current,
    order: sanitizeOrder(order),
  })
}

export function writeDashboardPersonPresence(personId: string, presence: DashboardPersonPresence) {
  const normalizedPersonId = personId.trim()
  if (!normalizedPersonId) return

  const current = dashboardPersonPanelStore.read()
  const nextPresenceByPersonId = { ...current.presenceByPersonId }

  if (presence === 'present') {
    nextPresenceByPersonId[normalizedPersonId] = 'present'
  } else {
    delete nextPresenceByPersonId[normalizedPersonId]
  }

  dashboardPersonPanelStore.write({
    ...current,
    presenceByPersonId: nextPresenceByPersonId,
  })
}

export function reorderDashboardPersonIds(order: string[], draggedId: string, targetId: string) {
  const sanitized = sanitizeOrder(order)
  if (!draggedId || !targetId || draggedId === targetId) return sanitized

  const draggedIndex = sanitized.indexOf(draggedId)
  const targetIndex = sanitized.indexOf(targetId)
  if (draggedIndex === -1 || targetIndex === -1) return sanitized

  const next = [...sanitized]
  next[draggedIndex] = sanitized[targetIndex]
  next[targetIndex] = sanitized[draggedIndex]
  return next
}

export async function initializeDashboardPersonPanelState() {
  await dashboardPersonPanelStore.initialize()
}

export async function reloadDashboardPersonPanelStateFromDB() {
  await dashboardPersonPanelStore.reloadFromDB()
}

export function __resetDashboardPersonPanelStateForTests() {
  dashboardPersonPanelStore.resetForTests()
}
