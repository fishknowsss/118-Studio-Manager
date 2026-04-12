import { useSyncExternalStore } from 'react'
import { store } from './store'

export function useLegacyStoreSnapshot() {
  useSyncExternalStore(store.subscribe, () => store.getSnapshot())
  return store
}
