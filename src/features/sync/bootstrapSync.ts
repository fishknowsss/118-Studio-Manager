import { db } from '../../legacy/db'
import { store } from '../../legacy/store'
import { reloadSyncableViewStateFromDB } from '../persistence/syncableViewState'
import { fetchCloudSyncData, isCloudSyncConfigured } from './syncApi'
import { hasBackupContent } from './syncShared'
import { writePersistedCloudSyncState } from './syncClientState'

export async function restoreCloudSnapshotOnBoot() {
  if (!isCloudSyncConfigured()) return false

  const remote = await fetchCloudSyncData()
  const current = remote.current

  if (!current || !hasBackupContent(current.data)) {
    return false
  }

  await db.importAll(current.data)
  await reloadSyncableViewStateFromDB()
  await store.loadAll()
  writePersistedCloudSyncState({
    lastCompletedSyncAt: new Date().toISOString(),
    lastAppliedVersion: current.meta.version,
  })
  return true
}
