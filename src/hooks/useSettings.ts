import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/database'
import * as settingService from '../services/settingService'
import type { Setting } from '../types/setting'

export function useSettings() {
  const setting = useLiveQuery(() => db.settings.get('default'), [])

  const updateSetting = async (updates: Partial<Setting>) => {
    await settingService.updateSetting(updates)
  }

  const updateLastBackup = async () => {
    await settingService.updateLastBackup()
  }

  return {
    setting: setting ?? null,
    updateSetting,
    updateLastBackup,
  }
}
