import { db } from '../db/database'
import type { Setting } from '../types/setting'
import { now, today } from '../utils/date'

const DEFAULT_SETTING_ID = 'default'

export async function getSetting(): Promise<Setting> {
  const setting = await db.settings.get(DEFAULT_SETTING_ID)
  if (setting) return setting
  const defaultSetting: Setting = {
    id: DEFAULT_SETTING_ID,
    studioName: '118StudioManager',
    defaultView: 'dashboard',
    lastOpenedDate: today(),
    lastBackupAt: '',
    backupReminderDays: 7,
    createdAt: now(),
    updatedAt: now(),
  }
  await db.settings.add(defaultSetting)
  return defaultSetting
}

export async function updateSetting(updates: Partial<Setting>): Promise<void> {
  const current = await getSetting()
  await db.settings.put({ ...current, ...updates, id: DEFAULT_SETTING_ID, updatedAt: now() })
}

export async function updateLastBackup(): Promise<void> {
  await updateSetting({ lastBackupAt: now() })
}
