import { initializeMaterialsState, reloadMaterialsStateFromDB } from '../materials/materialsState'
import {
  initializeRepositoryLinksState,
  reloadRepositoryLinksStateFromDB,
} from '../repository/repositoryLinksState'

export async function initializeSyncableViewState() {
  await Promise.all([
    initializeMaterialsState(),
    initializeRepositoryLinksState(),
  ])
}

export async function reloadSyncableViewStateFromDB() {
  await Promise.all([
    reloadMaterialsStateFromDB(),
    reloadRepositoryLinksStateFromDB(),
  ])
}
