import { initializeMaterialsState, reloadMaterialsStateFromDB } from '../materials/materialsState'
import {
  initializeDashboardPersonPanelState,
  reloadDashboardPersonPanelStateFromDB,
} from '../dashboard/personPanelState'
import {
  initializeHomeResourceLinkState,
  reloadHomeResourceLinkStateFromDB,
} from '../dashboard/homeResourceState'
import {
  initializeQuoteLibraryState,
  reloadQuoteLibraryStateFromDB,
} from '../dashboard/quoteLibraryState'
import { waitForSyncableSettingsWrites } from './syncableSettings'

export async function initializeSyncableViewState() {
  await Promise.all([
    initializeMaterialsState(),
    initializeDashboardPersonPanelState(),
    initializeHomeResourceLinkState(),
    initializeQuoteLibraryState(),
  ])
}

export async function reloadSyncableViewStateFromDB() {
  await Promise.all([
    reloadMaterialsStateFromDB(),
    reloadDashboardPersonPanelStateFromDB(),
    reloadHomeResourceLinkStateFromDB(),
    reloadQuoteLibraryStateFromDB(),
  ])
}

export async function flushSyncableViewStatePersistence() {
  await waitForSyncableSettingsWrites()
}
