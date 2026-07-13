import { useEffect, useLayoutEffect, useRef } from 'react'
import { isTopOverlay, useOverlayLayer } from './overlayStack'

function getFocusableElements(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>(
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
  )).filter((element) => !element.hidden && element.getAttribute('aria-hidden') !== 'true')
}

export function useModalFocus(active: boolean, onEscape: () => void) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const onEscapeRef = useRef(onEscape)
  const overlayTokenRef = useOverlayLayer(active)

  useEffect(() => {
    onEscapeRef.current = onEscape
  }, [onEscape])

  useLayoutEffect(() => {
    if (!active) return undefined
    previousFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null

    const dialog = dialogRef.current
    const initialFocus = dialog?.querySelector<HTMLElement>('[data-modal-initial-focus]')
      ?? dialog?.querySelector<HTMLElement>('input:not([disabled]), select:not([disabled]), textarea:not([disabled])')
      ?? (dialog ? getFocusableElements(dialog)[0] : null)
    initialFocus?.focus()

    return () => {
      const previousFocus = previousFocusRef.current
      previousFocusRef.current = null
      if (previousFocus?.isConnected) {
        window.requestAnimationFrame(() => previousFocus.focus())
      }
    }
  }, [active, overlayTokenRef])

  useEffect(() => {
    if (!active) return undefined

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isTopOverlay(overlayTokenRef.current)) return
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopImmediatePropagation()
        onEscapeRef.current()
        return
      }
      if (event.key !== 'Tab') return

      const dialog = dialogRef.current
      if (!dialog) return
      const focusable = getFocusableElements(dialog)
      if (focusable.length === 0) {
        event.preventDefault()
        dialog.focus()
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const focused = document.activeElement instanceof HTMLElement ? document.activeElement : null
      if (event.shiftKey && (!focused || focused === first || !dialog.contains(focused))) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (!focused || focused === last || !dialog.contains(focused))) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown, true)
    return () => document.removeEventListener('keydown', handleKeyDown, true)
  }, [active, overlayTokenRef])

  return dialogRef
}
