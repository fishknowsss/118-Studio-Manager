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
import {
  store,
  subscribeStoreWriteStarted,
  waitForStoreWrites,
} from '../../legacy/store'
import {
  fetchCloudSyncData,
  fetchCloudSyncMeta,
  isCloudSyncConfigured,
  pushCloudSyncData,
} from './syncApi'
import {
  formatSyncDateTime,
  formatSyncSource,
  hasBackupContent,
  shouldApplyRemoteCurrent,
  type SyncMeta,
} from './syncShared'
import {
  CLOUD_SYNC_STATE_STORAGE_KEY,
  readPersistedCloudSyncState,
  writePersistedCloudSyncState,
} from './syncClientState'
import { flushSyncableViewStatePersistence, reloadSyncableViewStateFromDB } from '../persistence/syncableViewState'

type SyncPhase = 'disabled' | 'checking' | 'ready' | 'syncing' | 'restoring' | 'error'
type RestoreResult = 'restored' | 'no-data' | 'skipped-local-changes'

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
  const pendingLocalChangesRef = useRef(initialPersisted.pendingLocalChanges)
  const localChangeRevisionRef = useRef(initialPersisted.pendingLocalChanges ? 1 : 0)
  const syncTimerRef = useRef<number | null>(null)
  const suppressStoreEventsRef = useRef(false)
  const syncingRef = useRef(false)
  const activeSyncPromiseRef = useRef<Promise<void> | null>(null)
  const activeRestorePromiseRef = useRef<Promise<void> | null>(null)
  const activeRefreshPromiseRef = useRef<Promise<void> | null>(null)
  const operationEpochRef = useRef(0)
  const pushLocalDataRef = useRef<(source: 'auto' | 'manual') => Promise<void>>(async () => undefined)

  const updatePersistedState = useCallback((next: {
    lastCompletedSyncAt?: string | null
    lastAppliedVersion?: string | null
    pendingLocalChanges?: boolean
  }) => {
    persistedRef.current = {
      lastCompletedSyncAt: next.lastCompletedSyncAt === undefined
        ? persistedRef.current.lastCompletedSyncAt
        : next.lastCompletedSyncAt,
      lastAppliedVersion: next.lastAppliedVersion === undefined
        ? persistedRef.current.lastAppliedVersion
        : next.lastAppliedVersion,
      pendingLocalChanges: next.pendingLocalChanges ?? persistedRef.current.pendingLocalChanges,
    }
    writePersistedCloudSyncState(persistedRef.current)
  }, [])

  const clearSyncTimer = useCallback(() => {
    if (syncTimerRef.current === null) return
    window.clearTimeout(syncTimerRef.current)
    syncTimerRef.current = null
  }, [])

  const queueAutoSync = useCallback(() => {
    clearSyncTimer()
    syncTimerRef.current = window.setTimeout(() => {
      syncTimerRef.current = null
      if (!pendingLocalChangesRef.current) return
      void pushLocalDataRef.current('auto').catch(() => undefined)
    }, AUTO_SYNC_DEBOUNCE_MS)
  }, [clearSyncTimer])

  const applyRemoteCurrentToLocal = useCallback(async ({ force = false }: { force?: boolean } = {}): Promise<RestoreResult> => {
    const revisionAtStart = localChangeRevisionRef.current
    const remote = await fetchCloudSyncData()
    const current = remote.current

    if (!current) {
      setState((currentState) => ({
        ...currentState,
        phase: 'ready',
        message: null,
        latestSyncMeta: null,
        hasCloudData: false,
      }))
      return 'no-data'
    }

    if (
      localChangeRevisionRef.current !== revisionAtStart
      || (!force && pendingLocalChangesRef.current)
    ) {
      setState((currentState) => ({
        ...currentState,
        phase: 'ready',
        message: null,
        latestSyncMeta: current.meta,
        hasCloudData: true,
      }))
      return 'skipped-local-changes'
    }

    suppressStoreEventsRef.current = true
    try {
      await flushSyncableViewStatePersistence()
      await waitForStoreWrites()
      if (
        localChangeRevisionRef.current !== revisionAtStart
        || (!force && pendingLocalChangesRef.current)
      ) {
        setState((currentState) => ({
          ...currentState,
          phase: 'ready',
          message: null,
          latestSyncMeta: current.meta,
          hasCloudData: true,
        }))
        return 'skipped-local-changes'
      }

      await db.importAll(current.data)
      await reloadSyncableViewStateFromDB()
      await store.loadAll()
      clearSyncTimer()
      const hasNewerLocalChanges = localChangeRevisionRef.current !== revisionAtStart
      pendingLocalChangesRef.current = hasNewerLocalChanges
      if (!hasNewerLocalChanges) localChangeRevisionRef.current = 0
      updatePersistedState({
        lastCompletedSyncAt: new Date().toISOString(),
        lastAppliedVersion: current.meta.version,
        pendingLocalChanges: hasNewerLocalChanges,
      })
      setState((currentState) => ({
        ...currentState,
        phase: 'ready',
        message: null,
        lastCompletedSyncAt: persistedRef.current.lastCompletedSyncAt,
        latestSyncMeta: current.meta,
        hasCloudData: true,
      }))
      if (hasNewerLocalChanges) queueAutoSync()
      return 'restored'
    } finally {
      suppressStoreEventsRef.current = false
    }
  }, [clearSyncTimer, queueAutoSync, updatePersistedState])

  const runRestore = useCallback(({
    force,
    message,
    requireCloudData,
  }: {
    force: boolean
    message: string
    requireCloudData: boolean
  }) => {
    if (activeRestorePromiseRef.current) return activeRestorePromiseRef.current

    const operation = (async () => {
      try {
        if (activeSyncPromiseRef.current) await activeSyncPromiseRef.current
        operationEpochRef.current += 1
        setState((currentState) => ({
          ...currentState,
          phase: 'restoring',
          message,
        }))
        const result = await applyRemoteCurrentToLocal({ force })
        if (requireCloudData && result === 'no-data') {
          throw new Error('云端还没有可恢复的数据')
        }
        if (requireCloudData && result === 'skipped-local-changes') {
          throw new Error('检测到新的本地编辑，已取消恢复')
        }
      } catch (error) {
        setState((currentState) => ({
          ...currentState,
          phase: 'error',
          message: error instanceof Error ? error.message : '恢复云端数据失败',
        }))
        throw error
      } finally {
        activeRestorePromiseRef.current = null
        if (pendingLocalChangesRef.current) queueAutoSync()
      }
    })()

    activeRestorePromiseRef.current = operation
    return operation
  }, [applyRemoteCurrentToLocal, queueAutoSync])

  const refreshRemoteMeta = useCallback(() => {
    if (!configured) return Promise.resolve()
    if (activeRefreshPromiseRef.current) return activeRefreshPromiseRef.current
    if (syncingRef.current || activeRestorePromiseRef.current) return Promise.resolve()

    const epochAtStart = operationEpochRef.current
    const operation = Promise.resolve().then(async () => {
      try {
        const meta = await fetchCloudSyncMeta()
        if (operationEpochRef.current !== epochAtStart) return

        setState((currentState) => ({
          ...currentState,
          phase: currentState.phase === 'disabled' ? 'disabled' : 'ready',
          message: null,
          latestSyncMeta: meta.current,
          hasCloudData: meta.hasData,
        }))

        const remoteVersion = meta.current?.version || null
        const localBackup = await db.exportAll()
        if (operationEpochRef.current !== epochAtStart) return
        if (shouldApplyRemoteCurrent({
          hasLocalData: hasBackupContent(localBackup),
          pendingLocalChanges: pendingLocalChangesRef.current,
          remoteVersion,
          localAppliedVersion: persistedRef.current.lastAppliedVersion,
        })) {
          await runRestore({
            force: false,
            message: '正在更新本地数据',
            requireCloudData: false,
          })
        }
      } catch (error) {
        if (operationEpochRef.current !== epochAtStart) return
        setState((currentState) => ({
          ...currentState,
          phase: 'error',
          message: error instanceof Error ? error.message : '无法连接云端同步',
        }))
      }
    }).finally(() => {
      activeRefreshPromiseRef.current = null
    })

    activeRefreshPromiseRef.current = operation
    return operation
  }, [configured, runRestore])

  const pushLocalData = useCallback((source: 'auto' | 'manual') => {
    if (!configured) return Promise.resolve()
    if (activeRestorePromiseRef.current) {
      return Promise.reject(new Error('正在恢复云端数据'))
    }
    if (activeSyncPromiseRef.current) return activeSyncPromiseRef.current

    clearSyncTimer()
    const revisionAtStart = localChangeRevisionRef.current
    const operation = (async () => {
      syncingRef.current = true
      operationEpochRef.current += 1
      setState((currentState) => ({
        ...currentState,
        phase: 'syncing',
        message: source === 'manual' ? '正在同步到云端' : '正在自动同步',
      }))

      try {
        await flushSyncableViewStatePersistence()
        await waitForStoreWrites()
        const payload = await db.exportAll()
        const result = await pushCloudSyncData({
          payload,
          source,
        })
        const stillPending = localChangeRevisionRef.current !== revisionAtStart
        pendingLocalChangesRef.current = stillPending
        updatePersistedState({
          lastCompletedSyncAt: new Date().toISOString(),
          lastAppliedVersion: result.current.meta.version,
          pendingLocalChanges: stillPending,
        })
        setState((currentState) => ({
          ...currentState,
          phase: 'ready',
          message: null,
          lastCompletedSyncAt: persistedRef.current.lastCompletedSyncAt,
          latestSyncMeta: result.current.meta,
          hasCloudData: true,
        }))
        if (stillPending) queueAutoSync()
      } catch (error) {
        setState((currentState) => ({
          ...currentState,
          phase: 'error',
          message: error instanceof Error ? error.message : '云端同步失败',
        }))
        if (pendingLocalChangesRef.current) queueAutoSync()
        throw error
      } finally {
        syncingRef.current = false
        activeSyncPromiseRef.current = null
      }
    })()

    activeSyncPromiseRef.current = operation
    return operation
  }, [clearSyncTimer, configured, queueAutoSync, updatePersistedState])

  useEffect(() => {
    pushLocalDataRef.current = pushLocalData
  }, [pushLocalData])

  const scheduleAutoSync = useCallback(() => {
    localChangeRevisionRef.current += 1
    pendingLocalChangesRef.current = true
    updatePersistedState({ pendingLocalChanges: true })
    queueAutoSync()
  }, [queueAutoSync, updatePersistedState])

  const restoreCloudToLocal = useCallback(() => {
    return runRestore({
      force: true,
      message: '正在用云端数据更新本地',
      requireCloudData: true,
    })
  }, [runRestore])

  useEffect(() => {
    if (!configured) return

    void refreshRemoteMeta()
    if (pendingLocalChangesRef.current) queueAutoSync()

    const unsubscribe = store.subscribe((detail) => {
      if (suppressStoreEventsRef.current && detail?.source === 'reload') return
      scheduleAutoSync()
    })
    const unsubscribeWriteStarted = subscribeStoreWriteStarted(scheduleAutoSync)

    const onSyncableDataUpdated = () => {
      scheduleAutoSync()
    }
    document.addEventListener('syncableDataUpdated', onSyncableDataUpdated)

    const onStorage = (event: StorageEvent) => {
      if (event.key !== CLOUD_SYNC_STATE_STORAGE_KEY) return
      if (!readPersistedCloudSyncState().pendingLocalChanges) return
      pendingLocalChangesRef.current = true
      localChangeRevisionRef.current += 1
      queueAutoSync()
    }
    window.addEventListener('storage', onStorage)

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
      unsubscribeWriteStarted()
      window.clearInterval(poll)
      document.removeEventListener('syncableDataUpdated', onSyncableDataUpdated)
      window.removeEventListener('storage', onStorage)
      document.removeEventListener('visibilitychange', onVisible)
      clearSyncTimer()
    }
  }, [clearSyncTimer, configured, queueAutoSync, refreshRemoteMeta, scheduleAutoSync])

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
    restoreCloudToLocal,
    refreshRemoteMeta,
  }), [pushLocalData, refreshRemoteMeta, restoreCloudToLocal, state])

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
