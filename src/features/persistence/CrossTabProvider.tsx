import { useEffect, type ReactNode } from 'react'
import { useToast } from '../../components/feedback/ToastProvider'
import { subscribeDatabaseChanges } from '../../legacy/crossTab'
import { clearUndoHistory } from '../../legacy/editUndo'
import { store, waitForStoreWrites } from '../../legacy/store'
import { flushSyncableViewStatePersistence, reloadSyncableViewStateFromDB } from './syncableViewState'

export function CrossTabProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast()

  useEffect(() => {
    let disposed = false
    let pending = false
    let running = false
    let timer: number | undefined

    const reload = async () => {
      if (running || disposed) return
      running = true
      try {
        while (pending && !disposed) {
          pending = false
          await waitForStoreWrites()
          await flushSyncableViewStatePersistence()
          if (disposed) return
          await reloadSyncableViewStateFromDB()
          await store.loadAll('cross-tab')
        }
      } catch (error) {
        console.error('[118SM] 跨页面更新失败:', error)
        toast('另一页面的数据更新暂未载入，请刷新后重试', 'error')
      } finally {
        running = false
      }
    }

    const unsubscribe = subscribeDatabaseChanges(() => {
      clearUndoHistory()
      pending = true
      window.clearTimeout(timer)
      timer = window.setTimeout(() => void reload(), 80)
    })

    return () => {
      disposed = true
      window.clearTimeout(timer)
      unsubscribe()
    }
  }, [toast])

  return children
}
