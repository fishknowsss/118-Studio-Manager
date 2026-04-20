import { initializeMaterialsState, reloadMaterialsStateFromDB } from '../materials/materialsState'
import { waitForSyncableSettingsWrites } from './syncableSettings'

export async function initializeSyncableViewState() {
  await Promise.all([
    initializeMaterialsState(),
  ])
}

export async function reloadSyncableViewStateFromDB() {
  await Promise.all([
    reloadMaterialsStateFromDB(),
  ])
}

export async function flushSyncableViewStatePersistence() {
  await waitForSyncableSettingsWrites()
}
