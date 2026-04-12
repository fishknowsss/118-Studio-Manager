/* eslint-disable react-refresh/only-export-components */

import { createContext, useContext, useMemo, useRef, useState, type ReactNode } from 'react'

type ToastTone = 'default' | 'success' | 'error' | 'info'

type ToastItem = {
  id: string
  message: string
  tone: ToastTone
}

type ToastContextValue = {
  toast: (message: string, tone?: ToastTone, duration?: number) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const timersRef = useRef<Map<string, number>>(new Map())

  const value = useMemo<ToastContextValue>(() => ({
    toast(message, tone = 'default', duration = 2800) {
      const id = crypto.randomUUID()
      setItems((current) => [...current, { id, message, tone }])

      const timer = window.setTimeout(() => {
        setItems((current) => current.filter((item) => item.id !== id))
        timersRef.current.delete(id)
      }, duration)

      timersRef.current.set(id, timer)
    },
  }), [])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-root">
        {items.map((item) => (
          <div key={item.id} className={`toast ${item.tone}`}>
            {item.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used inside ToastProvider')
  }
  return context
}
