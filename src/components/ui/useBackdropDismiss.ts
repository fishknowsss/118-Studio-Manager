import { useRef, type MouseEvent, type PointerEvent } from 'react'

type BackdropDismissHandlers<T extends HTMLElement> = {
  onPointerDown: (event: PointerEvent<T>) => void
  onClick: (event: MouseEvent<T>) => void
}

export function useBackdropDismiss<T extends HTMLElement>(onDismiss: () => void): BackdropDismissHandlers<T> {
  const startedOnBackdropRef = useRef(false)

  return {
    onPointerDown(event) {
      startedOnBackdropRef.current = event.button === 0 && event.target === event.currentTarget
    },
    onClick(event) {
      const shouldDismiss = startedOnBackdropRef.current && event.button === 0 && event.target === event.currentTarget
      startedOnBackdropRef.current = false
      if (shouldDismiss) onDismiss()
    },
  }
}
