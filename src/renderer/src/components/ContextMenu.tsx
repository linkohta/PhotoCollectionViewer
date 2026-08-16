import { useEffect, useRef, useState } from 'react'

interface ContextMenuProps {
  x: number
  y: number
  label: string
  onOpenInNewTab?: () => void
  onRename?: () => void
  onClose: () => void
}

export function ContextMenu({
  x,
  y,
  label,
  onOpenInNewTab,
  onRename,
  onClose
}: ContextMenuProps): JSX.Element {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent): void => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('mousedown', handlePointerDown)
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('scroll', onClose, true)

    return () => {
      window.removeEventListener('mousedown', handlePointerDown)
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('scroll', onClose, true)
    }
  }, [onClose])

  return (
    <div
      ref={menuRef}
      className="context-menu"
      style={{ top: y, left: x }}
      role="menu"
    >
      <div className="context-menu-title">{label}</div>
      {onOpenInNewTab && (
        <button
          type="button"
          className="context-menu-item"
          onClick={() => {
            onOpenInNewTab()
            onClose()
          }}
        >
          新しいタブで開く
        </button>
      )}
      {onRename && (
        <button
          type="button"
          className="context-menu-item"
          onClick={() => {
            onRename()
            onClose()
          }}
        >
          名前の変更
        </button>
      )}
    </div>
  )
}
