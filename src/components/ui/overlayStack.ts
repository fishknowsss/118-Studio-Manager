import { useLayoutEffect, useRef } from 'react'

const overlayStack: symbol[] = []

export function isTopOverlay(token: symbol) {
  return overlayStack.at(-1) === token
}

export function useOverlayLayer(active: boolean) {
  const tokenRef = useRef(Symbol('overlay'))

  useLayoutEffect(() => {
    if (!active) return undefined
    const token = tokenRef.current
    overlayStack.push(token)

    return () => {
      const index = overlayStack.lastIndexOf(token)
      if (index >= 0) overlayStack.splice(index, 1)
    }
  }, [active])

  return tokenRef
}
