import { useRef } from 'react'
import { usePopupDismiss } from '../hooks/usePopupDismiss'
import type { PopupMenuItem } from '../types/menu'

interface PopupMenuProps {
  x: number
  y: number
  label: string
  items: readonly PopupMenuItem[]
  onClose: () => void
}

export function PopupMenu({ x, y, label, items, onClose }: PopupMenuProps): JSX.Element {
  const menuRef = useRef<HTMLDivElement>(null)
  usePopupDismiss(menuRef, onClose)

  return (
    <div ref={menuRef} className="context-menu" style={{ top: y, left: x }} role="menu">
      <div className="context-menu-title">{label}</div>
      {items.map(({ key, text, danger, color, onSelect }) => (
        <button
          key={key}
          type="button"
          className={danger ? 'context-menu-item danger' : 'context-menu-item'}
          onClick={() => {
            onSelect()
            onClose()
          }}
        >
          {color && (
            <span className={`tab-group-dot tab-group-color-${color}`} aria-hidden="true" />
          )}
          {text}
        </button>
      ))}
    </div>
  )
}
