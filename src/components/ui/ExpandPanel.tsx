import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

const VARIANTS = {
  default: { maxW: 860,  vwFrac: 0.76, maxH: 720,  vhFrac: 0.78 },
  wide:    { maxW: 1080, vwFrac: 0.88, maxH: 860,  vhFrac: 0.90 },
  slim:    { maxW: 480,  vwFrac: 0.46, maxH: 820,  vhFrac: 0.88 },
} as const

type Variant = keyof typeof VARIANTS

function calcOrigin(ox: number, oy: number, variant: Variant): string {
  const { maxW, vwFrac, maxH, vhFrac } = VARIANTS[variant]
  const vw = window.innerWidth
  const vh = window.innerHeight
  const pw = Math.min(maxW, vw * vwFrac)
  const ph = Math.min(maxH, vh * vhFrac)
  const boxLeft = (vw - pw) / 2
  const boxTop  = (vh - ph) / 2
  const x = (((ox - boxLeft) / pw) * 100).toFixed(1)
  const y = (((oy - boxTop)  / ph) * 100).toFixed(1)
  return `${x}% ${y}%`
}

export function ExpandPanel({
  boxClassName,
  children,
  overlayClassName,
  variant = 'default',
  originX,
  originY,
  onClose,
  title,
}: {
  boxClassName?: string
  children: ReactNode
  overlayClassName?: string
  variant?: Variant
  originX: number
  originY: number
  onClose: () => void
  title: string
}) {
  const [closing, setClosing] = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)
  const transformOrigin = calcOrigin(originX, originY, variant)

  const triggerClose = useCallback(() => {
    if (closing) return
    setClosing(true)
  }, [closing])

  const handleAnimationEnd = (event: React.AnimationEvent<HTMLDivElement>) => {
    if (closing && event.target === overlayRef.current) {
      onClose()
    }
  }

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') triggerClose()
    }
    document.addEventListener('keydown', handler, true)
    return () => document.removeEventListener('keydown', handler, true)
  }, [triggerClose])

  return (
    <div
      ref={overlayRef}
      className={`expand-panel-overlay${overlayClassName ? ` ${overlayClassName}` : ''}${closing ? ' is-closing' : ''}`}
      onClick={triggerClose}
      onAnimationEnd={handleAnimationEnd}
      role="presentation"
    >
      <div
        className={`expand-panel-box${variant === 'slim' ? ' slim' : variant === 'wide' ? ' wide' : ''}${boxClassName ? ` ${boxClassName}` : ''}`}
        style={{ transformOrigin }}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="expand-panel-header">
          <span className="expand-panel-title">{title}</span>
          <button className="modal-close" type="button" onClick={triggerClose} aria-label="关闭">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="expand-panel-body">
          {children}
        </div>
      </div>
    </div>
  )
}
