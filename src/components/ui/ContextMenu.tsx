import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react'

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

const CONTEXT_MENU_GUTTER = 12

function clampContextMenuPosition(x: number, y: number, width: number, height: number) {
  const maxX = Math.max(CONTEXT_MENU_GUTTER, window.innerWidth - width - CONTEXT_MENU_GUTTER)
  const maxY = Math.max(CONTEXT_MENU_GUTTER, window.innerHeight - height - CONTEXT_MENU_GUTTER)

  return {
    x: Math.min(Math.max(CONTEXT_MENU_GUTTER, x), maxX),
    y: Math.min(Math.max(CONTEXT_MENU_GUTTER, y), maxY),
  }
}

export function ContextMenu({
  items,
  onClose,
  open,
  title,
  x,
  y,
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ x, y })

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

  useLayoutEffect(() => {
    if (!open) return

    const node = menuRef.current
    if (!node) return

    const rect = node.getBoundingClientRect()
    const next = clampContextMenuPosition(x, y, rect.width, rect.height)
    setPosition((current) => (
      current.x === next.x && current.y === next.y
        ? current
        : next
    ))
  }, [items, open, title, x, y])

  const style = useMemo(() => ({
    '--context-menu-x': `${position.x}px`,
    '--context-menu-y': `${position.y}px`,
  }) as CSSProperties, [position.x, position.y])

  if (!open) return null

  return (
    <div ref={menuRef} className="context-menu" style={style} onPointerDown={(event) => event.stopPropagation()}>
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
