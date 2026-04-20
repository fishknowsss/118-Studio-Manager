import { initializeMaterialsState, reloadMaterialsStateFromDB } from '../materials/materialsState'
import {
  initializeDashboardPersonPanelState,
  reloadDashboardPersonPanelStateFromDB,
} from '../dashboard/personPanelState'
import { waitForSyncableSettingsWrites } from './syncableSettings'

export async function initializeSyncableViewState() {
  await Promise.all([
    initializeMaterialsState(),
    initializeDashboardPersonPanelState(),
  ])
}

export async function reloadSyncableViewStateFromDB() {
  await Promise.all([
    reloadMaterialsStateFromDB(),
    reloadDashboardPersonPanelStateFromDB(),
  ])
}

export async function flushSyncableViewStatePersistence() {
  await waitForSyncableSettingsWrites()
}
