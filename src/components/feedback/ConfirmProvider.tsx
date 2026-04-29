/* eslint-disable react-refresh/only-export-components */

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { useBackdropDismiss } from '../ui/useBackdropDismiss'

type ConfirmTone = 'danger' | 'primary'

type ConfirmState = {
  title: string
  body: string
  confirmLabel: string
  tone: ConfirmTone
  resolve: (value: boolean) => void
} | null

type ConfirmContextValue = {
  confirm: (title: string, body: string, options?: { confirmLabel?: string; tone?: ConfirmTone }) => Promise<boolean>
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null)

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ConfirmState>(null)

  const value = useMemo<ConfirmContextValue>(() => ({
    confirm(title, body, options = {}) {
      return new Promise<boolean>((resolve) => {
        setState({
          title,
          body,
          confirmLabel: options.confirmLabel || '确认',
          tone: options.tone || 'danger',
          resolve,
        })
      })
    },
  }), [])

  const close = (result: boolean) => {
    setState((current) => {
      current?.resolve(result)
      return null
    })
  }
  const backdropDismiss = useBackdropDismiss<HTMLDivElement>(() => close(false))

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      {state ? (
        <div className="dialog-backdrop" role="presentation" {...backdropDismiss}>
          <div className="confirm-modal confirm-modal-react" role="alertdialog" aria-modal="true" aria-label={state.title}>
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
