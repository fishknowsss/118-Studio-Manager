import { useEffect } from 'react'

let lockCount = 0
let previousOverflow = ''
let previousOverscrollBehavior = ''

export function useBodyScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return undefined

    if (lockCount === 0) {
      previousOverflow = document.body.style.overflow
      previousOverscrollBehavior = document.body.style.overscrollBehavior
      document.body.style.overflow = 'hidden'
      document.body.style.overscrollBehavior = 'none'
    }
    lockCount += 1

    return () => {
      lockCount = Math.max(0, lockCount - 1)
      if (lockCount === 0) {
        document.body.style.overflow = previousOverflow
        document.body.style.overscrollBehavior = previousOverscrollBehavior
      }
    }
  }, [active])
}
