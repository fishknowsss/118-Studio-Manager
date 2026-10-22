import { createSyncableSettingsStore } from '../persistence/syncableSettings'
import { parseLocalDateKey } from '../../legacy/utils'

export const DEFAULT_TERM_START_DATE = '2026-03-02'

const termSettings = createSyncableSettingsStore<string>({
  key: 'productivity:term-start-date',
  legacyKey: '118sm.productivity.termStartDate',
  parseLegacy: (raw) => raw,
  emptyValue: DEFAULT_TERM_START_DATE,
  sanitize: (raw) => typeof raw === 'string' && parseLocalDateKey(raw) ? raw : DEFAULT_TERM_START_DATE,
})

export const readTermStartDate = termSettings.read
export const subscribeTermStartDate = termSettings.subscribe
export const writeTermStartDate = termSettings.write
export const initializeTermSettings = termSettings.initialize
export const reloadTermSettingsFromDB = termSettings.reloadFromDB
