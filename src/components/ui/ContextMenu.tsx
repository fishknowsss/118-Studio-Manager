import { useEffect, useMemo, type CSSProperties } from 'react'

export type ContextMenuItem = {
  key: string
  label: string
  onSelect: () => void
  tone?: 'default' | 'danger'
}

type ContextMenuProps = {
  items: ContextMenuItem[]
  onClose: () => void
  open: boolean
  title?: string
  x: number
  y: number
}

export function ContextMenu({
  items,
  onClose,
  open,
  title,
  x,
  y,
}: ContextMenuProps) {
  useEffect(() => {
    if (!open) return undefined

    const handlePointer = () => onClose()
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('pointerdown', handlePointer)
    document.addEventListener('keydown', handleEscape, true)

    return () => {
      window.removeEventListener('pointerdown', handlePointer)
      document.removeEventListener('keydown', handleEscape, true)
    }
  }, [onClose, open])

  const style = useMemo(() => ({
    '--context-menu-x': `${x}px`,
    '--context-menu-y': `${y}px`,
  }) as CSSProperties, [x, y])

  if (!open) return null

  return (
    <div className="context-menu" style={style} onPointerDown={(event) => event.stopPropagation()}>
      {title ? <div className="context-menu-title">{title}</div> : null}
      {items.map((item) => (
        <button
          key={item.key}
          className={`context-menu-item ${item.tone === 'danger' ? 'danger' : ''}`}
          type="button"
          onClick={() => {
            item.onSelect()
            onClose()
          }}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}
