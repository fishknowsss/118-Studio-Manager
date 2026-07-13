/* eslint-disable react-refresh/only-export-components */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useBackdropDismiss } from '../ui/useBackdropDismiss'
import { useModalFocus } from '../ui/useModalFocus'
import { useBodyScrollLock } from '../ui/useBodyScrollLock'

type ConfirmTone = 'danger' | 'primary'

type ConfirmState = {
  title: string
  body: string
  confirmLabel: string
  tone: ConfirmTone
} | null

type ConfirmContextValue = {
  confirm: (title: string, body: string, options?: { confirmLabel?: string; tone?: ConfirmTone }) => Promise<boolean>
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null)

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ConfirmState>(null)
  const activeResolveRef = useRef<((value: boolean) => void) | null>(null)

  const value = useMemo<ConfirmContextValue>(() => ({
    confirm(title, body, options = {}) {
      return new Promise<boolean>((resolve) => {
        activeResolveRef.current?.(false)
        activeResolveRef.current = resolve
        setState({
          title,
          body,
          confirmLabel: options.confirmLabel || '确认',
          tone: options.tone || 'danger',
        })
      })
    },
  }), [])

  const close = useCallback((result: boolean) => {
    const resolve = activeResolveRef.current
    activeResolveRef.current = null
    setState(null)
    resolve?.(result)
  }, [])
  const dialogRef = useModalFocus(Boolean(state), () => close(false))
  useBodyScrollLock(Boolean(state))
  const backdropDismiss = useBackdropDismiss<HTMLDivElement>(() => close(false))

  useEffect(() => () => {
    activeResolveRef.current?.(false)
    activeResolveRef.current = null
  }, [])

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      {state ? (
        <div className="dialog-backdrop" role="presentation" {...backdropDismiss}>
          <div ref={dialogRef} className="confirm-modal confirm-modal-react" role="alertdialog" aria-modal="true" aria-label={state.title} tabIndex={-1}>
            <div className="confirm-title">{state.title}</div>
            <div className="confirm-body">{state.body}</div>
            <div className="confirm-actions">
              <button className="btn btn-secondary" type="button" onClick={() => close(false)}>取消</button>
              <button className={`btn ${state.tone === 'danger' ? 'btn-danger' : 'btn-primary'}`} type="button" onClick={() => close(true)}>
                {state.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const context = useContext(ConfirmContext)
  if (!context) {
    throw new Error('useConfirm must be used inside ConfirmProvider')
  }
  return context
}
