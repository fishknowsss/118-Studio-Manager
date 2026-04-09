import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/database'
import * as settingService from '../services/settingService'
import type { Setting } from '../types/setting'

export function useSettings() {
  const setting = useLiveQuery(async () => {
    return (await db.settings.get('default')) ?? settingService.getSetting()
  }, [])

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
