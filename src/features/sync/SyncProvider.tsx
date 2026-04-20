/* eslint-disable react-refresh/only-export-components */

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { db } from '../../legacy/db'
import { store } from '../../legacy/store'
import {
  fetchCloudSyncData,
  fetchCloudSyncMeta,
  isCloudSyncConfigured,
  pushCloudSyncData,
} from './syncApi'
import {
  formatSyncDateTime,
  formatSyncSource,
  shouldApplyRemoteCurrent,
  type SyncMeta,
} from './syncShared'
import {
  readPersistedCloudSyncState,
  writePersistedCloudSyncState,
} from './syncClientState'
import { flushSyncableViewStatePersistence, reloadSyncableViewStateFromDB } from '../persistence/syncableViewState'
import { readAccounts, readBriefs, readFolders } from '../materials/materialsState'

type SyncPhase = 'disabled' | 'checking' | 'ready' | 'syncing' | 'restoring' | 'error'

type CloudSyncState = {
  configured: boolean
  phase: SyncPhase
  message: string | null
  lastCompletedSyncAt: string | null
  latestSyncMeta: SyncMeta | null
  hasCloudData: boolean
}

type CloudSyncContextValue = {
  state: CloudSyncState
  statusLabel: string
  lastSyncLabel: string
  latestSyncLabel: string
  manualSync: () => Promise<void>
  restoreCloudToLocal: () => Promise<void>
  refreshRemoteMeta: () => Promise<void>
}

const CloudSyncContext = createContext<CloudSyncContextValue | null>(null)

const AUTO_SYNC_DEBOUNCE_MS = 2 * 60_000
const META_POLL_MS = 10 * 60_000

function hasLocalData() {
  return (
    store.projects.length > 0 ||
    store.tasks.length > 0 ||
    store.people.length > 0 ||
    store.logs.length > 0 ||
    store.leaveRecords.length > 0 ||
    readBriefs().length > 0 ||
    readAccounts().length > 0 ||
    readFolders().length > 0
  )
}

export function CloudSyncProvider({ children }: { children: ReactNode }) {
  const configured = isCloudSyncConfigured()
  const initialPersisted = readPersistedCloudSyncState()
  const [state, setState] = useState<CloudSyncState>({
    configured,
    phase: configured ? 'checking' : 'disabled',
    message: configured ? null : '未配置云同步地址',
    lastCompletedSyncAt: initialPersisted.lastCompletedSyncAt,
    latestSyncMeta: null,
    hasCloudData: false,
  })
  const persistedRef = useRef(initialPersisted)
  const pendingLocalChangesRef = useRef(false)
  const syncTimerRef = useRef<number | null>(null)
  const suppressStoreEventsRef = useRef(false)
  const syncingRef = useRef(false)

  const updatePersistedState = useCallback((next: { lastCompletedSyncAt?: string | null; lastAppliedVersion?: string | null }) => {
    persistedRef.current = {
      lastCompletedSyncAt: next.lastCompletedSyncAt ?? persistedRef.current.lastCompletedSyncAt,
      lastAppliedVersion: next.lastAppliedVersion ?? persistedRef.current.lastAppliedVersion,
    }
    writePersistedCloudSyncState(persistedRef.current)
  }, [])

  const applyRemoteCurrentToLocal = useCallback(async () => {
    const remote = await fetchCloudSyncData()
    const current = remote.current

    if (!current) return

    suppressStoreEventsRef.current = true
    try {
      await flushSyncableViewStatePersistence()
      await db.importAll(current.data)
      await reloadSyncableViewStateFromDB()
      await store.loadAll()
      pendingLocalChangesRef.current = false
      updatePersistedState({
        lastCompletedSyncAt: new Date().toISOString(),
        lastAppliedVersion: current.meta.version,
      })
      setState((currentState) => ({
        ...currentState,
        phase: 'ready',
        message: null,
        lastCompletedSyncAt: persistedRef.current.lastCompletedSyncAt,
        latestSyncMeta: current.meta,
        hasCloudData: true,
      }))
    } finally {
      window.setTimeout(() => {
        suppressStoreEventsRef.current = false
      }, 0)
    }
  }, [updatePersistedState])

  const refreshRemoteMeta = useCallback(async () => {
    if (!configured) return
    if (syncingRef.current) return

    try {
      const meta = await fetchCloudSyncMeta()
      setState((currentState) => ({
        ...currentState,
        phase: currentState.phase === 'disabled' ? 'disabled' : 'ready',
        message: null,
        latestSyncMeta: meta.current,
        hasCloudData: meta.hasData,
      }))

      const remoteVersion = meta.current?.version || null
      if (shouldApplyRemoteCurrent({
        hasLocalData: hasLocalData(),
        pendingLocalChanges: pendingLocalChangesRef.current,
        remoteVersion,
        localAppliedVersion: persistedRef.current.lastAppliedVersion,
      })) {
        setState((currentState) => ({
          ...currentState,
          phase: 'restoring',
          message: '正在更新本地数据',
        }))
        await applyRemoteCurrentToLocal()
      }
    } catch (error) {
      setState((currentState) => ({
        ...currentState,
        phase: 'error',
        message: error instanceof Error ? error.message : '无法连接云端同步',
      }))
    }
  }, [applyRemoteCurrentToLocal, configured])

  const pushLocalData = useCallback(async (source: 'auto' | 'manual') => {
    if (!configured) return
    if (syncingRef.current) return

    syncingRef.current = true
    setState((currentState) => ({
      ...currentState,
      phase: 'syncing',
      message: source === 'manual' ? '正在同步到云端' : '正在自动同步',
    }))

    try {
      await flushSyncableViewStatePersistence()
      const payload = await db.exportAll()
      const result = await pushCloudSyncData({
        payload,
        source,
      })
      pendingLocalChangesRef.current = false
      updatePersistedState({
        lastCompletedSyncAt: new Date().toISOString(),
        lastAppliedVersion: result.current.meta.version,
      })
      setState((currentState) => ({
        ...currentState,
        phase: 'ready',
        message: null,
        lastCompletedSyncAt: persistedRef.current.lastCompletedSyncAt,
        latestSyncMeta: result.current.meta,
        hasCloudData: true,
      }))
    } catch (error) {
      setState((currentState) => ({
        ...currentState,
        phase: 'error',
        message: error instanceof Error ? error.message : '云端同步失败',
      }))
      throw error
    } finally {
      syncingRef.current = false
    }
  }, [configured, updatePersistedState])

  const scheduleAutoSync = useCallback(() => {
    pendingLocalChangesRef.current = true
    if (syncTimerRef.current) window.clearTimeout(syncTimerRef.current)
    syncTimerRef.current = window.setTimeout(() => {
      void pushLocalData('auto')
    }, AUTO_SYNC_DEBOUNCE_MS)
  }, [pushLocalData])

  useEffect(() => {
    if (!configured) return

    void refreshRemoteMeta()

    const unsubscribe = store.subscribe(() => {
      if (suppressStoreEventsRef.current) return
      scheduleAutoSync()
    })

    const onSyncableDataUpdated = () => {
      if (suppressStoreEventsRef.current) return
      scheduleAutoSync()
    }
    document.addEventListener('syncableDataUpdated', onSyncableDataUpdated)

    const poll = window.setInterval(() => {
      void refreshRemoteMeta()
    }, META_POLL_MS)

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void refreshRemoteMeta()
      }
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      unsubscribe()
      window.clearInterval(poll)
      document.removeEventListener('syncableDataUpdated', onSyncableDataUpdated)
      document.removeEventListener('visibilitychange', onVisible)
      if (syncTimerRef.current) window.clearTimeout(syncTimerRef.current)
    }
  }, [configured, refreshRemoteMeta, scheduleAutoSync])

  const value = useMemo<CloudSyncContextValue>(() => ({
    state,
    statusLabel: '停止编辑约 2 分钟后自动同步',
    lastSyncLabel: state.phase === 'disabled'
      ? '未配置云同步地址'
      : state.phase === 'error'
        ? state.message || '云端同步失败'
        : `上次同步 ${formatSyncDateTime(state.lastCompletedSyncAt)}`,
    latestSyncLabel: state.latestSyncMeta
      ? `${formatSyncSource(state.latestSyncMeta.source)} · ${formatSyncDateTime(state.latestSyncMeta.updatedAt)}`
      : '云端还没有同步记录',
    manualSync: async () => {
      await pushLocalData('manual')
    },
    restoreCloudToLocal: async () => {
      setState((currentState) => ({
        ...currentState,
        phase: 'restoring',
        message: '正在用云端数据更新本地',
      }))
      await applyRemoteCurrentToLocal()
    },
    refreshRemoteMeta,
  }), [applyRemoteCurrentToLocal, pushLocalData, refreshRemoteMeta, state])

  return (
    <CloudSyncContext.Provider value={value}>
      {children}
    </CloudSyncContext.Provider>
  )
}

export function useCloudSync() {
  const context = useContext(CloudSyncContext)
  if (!context) {
    throw new Error('useCloudSync must be used inside CloudSyncProvider')
  }
  return context
}
