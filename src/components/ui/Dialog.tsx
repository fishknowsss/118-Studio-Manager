import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useBackdropDismiss } from './useBackdropDismiss'
import { useModalFocus } from './useModalFocus'
import { useBodyScrollLock } from './useBodyScrollLock'

type DialogProps = {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  width?: 'default' | 'wide'
  className?: string
  backdropScrollable?: boolean
  bodyScrollable?: boolean
}

export function Dialog({
  open,
  title,
  onClose,
  children,
  footer,
  width = 'default',
  className,
  backdropScrollable = true,
  bodyScrollable = true,
}: DialogProps) {
  const backdropDismiss = useBackdropDismiss<HTMLDivElement>(onClose)
  const dialogRef = useModalFocus(open, onClose)
  useBodyScrollLock(open)

  if (!open) return null

  return createPortal(
    <div
      className={`dialog-backdrop ${backdropScrollable ? '' : 'no-scroll'}`.trim()}
      role="presentation"
      {...backdropDismiss}
    >
      <div
        ref={dialogRef}
        className={`app-modal app-modal-react ${width === 'wide' ? 'wide' : ''} ${className || ''}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
      >
        <div className="modal-inner">
          <div className="modal-header">
            <h3 className="modal-title">{title}</h3>
            <button className="modal-close" type="button" aria-label="关闭" onClick={onClose}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <div className={`modal-body ${bodyScrollable ? '' : 'no-scroll'}`.trim()}>{children}</div>
          {footer ? <div className="modal-footer">{footer}</div> : null}
        </div>
      </div>
    </div>,
    document.body,
  )
}
