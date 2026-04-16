import { initializeMaterialsState, reloadMaterialsStateFromDB } from '../materials/materialsState'

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
