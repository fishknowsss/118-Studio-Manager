import type { QuoteItem } from '../../content/quotes'
import { createSyncableSettingsStore } from '../persistence/syncableSettings'

const CUSTOM_QUOTES_KEY = 'dashboard:custom-quotes'
const CUSTOM_MOTIVATIONS_KEY = 'dashboard:custom-motivations'
const LEGACY_CUSTOM_QUOTES_KEY = '118studio:custom-quotes'
const LEGACY_CUSTOM_MOTIVATIONS_KEY = '118studio:custom-motivations'

function sanitizeCustomQuotes(raw: unknown): QuoteItem[] {
  if (!Array.isArray(raw)) return []

  return raw.flatMap((item) => {
    if (!item || typeof item !== 'object') return []
    const value = item as { text?: unknown; src?: unknown }
    const text = typeof value.text === 'string' ? value.text.trim() : ''
    if (!text) return []
    return [{
      text,
      src: typeof value.src === 'string' ? value.src.trim() : '',
    }]
  })
}

function sanitizeCustomMotivations(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw.flatMap((item) => {
    const value = typeof item === 'string' ? item.trim() : ''
    return value ? [value] : []
  })
}

const customQuotesStore = createSyncableSettingsStore<QuoteItem[]>({
  key: CUSTOM_QUOTES_KEY,
  legacyKey: LEGACY_CUSTOM_QUOTES_KEY,
  emptyValue: [],
  sanitize: sanitizeCustomQuotes,
})

const customMotivationsStore = createSyncableSettingsStore<string[]>({
  key: CUSTOM_MOTIVATIONS_KEY,
  legacyKey: LEGACY_CUSTOM_MOTIVATIONS_KEY,
  emptyValue: [],
  sanitize: sanitizeCustomMotivations,
})

export function readCustomQuotes() {
  return customQuotesStore.read()
}

export function subscribeCustomQuotes(listener: () => void) {
  return customQuotesStore.subscribe(listener)
}

export function writeCustomQuotes(quotes: QuoteItem[]) {
  customQuotesStore.write(quotes)
}

export function readCustomMotivations() {
  return customMotivationsStore.read()
}

export function subscribeCustomMotivations(listener: () => void) {
  return customMotivationsStore.subscribe(listener)
}

export function writeCustomMotivations(motivations: string[]) {
  customMotivationsStore.write(motivations)
}

export async function initializeQuoteLibraryState() {
  await Promise.all([
    customQuotesStore.initialize(),
    customMotivationsStore.initialize(),
  ])
}

export async function reloadQuoteLibraryStateFromDB() {
  await Promise.all([
    customQuotesStore.reloadFromDB(),
    customMotivationsStore.reloadFromDB(),
  ])
}

export function __resetQuoteLibraryStateForTests() {
  customQuotesStore.resetForTests()
  customMotivationsStore.resetForTests()
}
