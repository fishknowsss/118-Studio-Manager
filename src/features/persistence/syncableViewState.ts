import { initializeMaterialsState, reloadMaterialsStateFromDB } from '../materials/materialsState'
import {
  initializeDashboardPersonPanelState,
  reloadDashboardPersonPanelStateFromDB,
} from '../dashboard/personPanelState'
import {
  initializeHomeResourceLinkState,
  reloadHomeResourceLinkStateFromDB,
} from '../dashboard/homeResourceState'
import { waitForSyncableSettingsWrites } from './syncableSettings'

export async function initializeSyncableViewState() {
  await Promise.all([
    initializeMaterialsState(),
    initializeDashboardPersonPanelState(),
    initializeHomeResourceLinkState(),
  ])
}

export async function reloadSyncableViewStateFromDB() {
  await Promise.all([
    reloadMaterialsStateFromDB(),
    reloadDashboardPersonPanelStateFromDB(),
    reloadHomeResourceLinkStateFromDB(),
  ])
}

export async function flushSyncableViewStatePersistence() {
  await waitForSyncableSettingsWrites()
}
