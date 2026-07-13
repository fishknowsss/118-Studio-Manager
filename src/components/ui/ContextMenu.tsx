import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { isTopOverlay, useOverlayLayer } from './overlayStack'

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
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const focusSessionRef = useRef(false)
  const restoreFocusFrameRef = useRef<number | null>(null)
  const onCloseRef = useRef(onClose)
  const overlayTokenRef = useOverlayLayer(open)
  const [position, setPosition] = useState({ x, y })

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useLayoutEffect(() => {
    if (!open) return undefined

    if (restoreFocusFrameRef.current !== null) {
      window.cancelAnimationFrame(restoreFocusFrameRef.current)
      restoreFocusFrameRef.current = null
    }
    if (!focusSessionRef.current) {
      previousFocusRef.current = document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null
      focusSessionRef.current = true
    }

    return () => {
      const previousFocus = previousFocusRef.current
      restoreFocusFrameRef.current = window.requestAnimationFrame(() => {
        restoreFocusFrameRef.current = null
        previousFocusRef.current = null
        focusSessionRef.current = false
        if (previousFocus?.isConnected) previousFocus.focus()
      })
    }
  }, [open])

  useEffect(() => {
    if (!open) return undefined

    const handlePointer = () => {
      if (isTopOverlay(overlayTokenRef.current)) onCloseRef.current()
    }
    const handleEscape = (event: KeyboardEvent) => {
      if (!isTopOverlay(overlayTokenRef.current)) return
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopImmediatePropagation()
        onCloseRef.current()
      }
    }

    window.addEventListener('pointerdown', handlePointer)
    document.addEventListener('keydown', handleEscape, true)

    return () => {
      window.removeEventListener('pointerdown', handlePointer)
      document.removeEventListener('keydown', handleEscape, true)
    }
  }, [open, overlayTokenRef])

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
    if (!node.contains(document.activeElement)) {
      node.querySelector<HTMLButtonElement>('.context-menu-item')?.focus()
    }
  }, [items, open, title, x, y])

  const style = useMemo(() => ({
    '--context-menu-x': `${position.x}px`,
    '--context-menu-y': `${position.y}px`,
  }) as CSSProperties, [position.x, position.y])

  if (!open) return null

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Tab') {
      onCloseRef.current()
      return
    }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
    const menuItems = Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('.context-menu-item') ?? [])
    if (menuItems.length === 0) return
    event.preventDefault()
    const currentIndex = menuItems.indexOf(document.activeElement as HTMLButtonElement)
    const nextIndex = event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? menuItems.length - 1
        : event.key === 'ArrowDown'
          ? (currentIndex + 1 + menuItems.length) % menuItems.length
          : (currentIndex - 1 + menuItems.length) % menuItems.length
    menuItems[nextIndex].focus()
  }

  return createPortal(
    <div
      ref={menuRef}
      className="context-menu"
      style={style}
      role="menu"
      aria-orientation="vertical"
      onKeyDown={handleKeyDown}
      onPointerDown={(event) => event.stopPropagation()}
    >
      {title ? <div className="context-menu-title">{title}</div> : null}
      {items.map((item) => (
        <button
          key={item.key}
          className={`context-menu-item ${item.tone === 'danger' ? 'danger' : ''}`}
          type="button"
          role="menuitem"
          onClick={() => {
            item.onSelect()
            onCloseRef.current()
          }}
        >
          {item.label}
        </button>
      ))}
    </div>,
    document.body,
  )
}
