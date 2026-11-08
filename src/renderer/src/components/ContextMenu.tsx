import { useEffect, useRef } from 'react'
import { suspendViewerKeyboardHandler } from '../utils/viewerKeyboard'

type MenuEntryKey = 'onOpenInNewTab' | 'onRename' | 'onMoveToTrash' | 'onDelete'

// Each entry is shown when its callback is passed. Clicking one runs it and
// closes the menu.
type ContextMenuProps = Partial<Record<MenuEntryKey, () => void>> & {
  x: number
  y: number
  label: string
  onClose: () => void
}

// The entries in the order they appear in the menu.
const MENU_ENTRIES: readonly { key: MenuEntryKey; text: string; danger?: boolean }[] = [
  { key: 'onOpenInNewTab', text: '新しいタブで開く' },
  { key: 'onRename', text: '名前の変更' },
  { key: 'onMoveToTrash', text: 'ごみ箱へ移動' },
  { key: 'onDelete', text: '削除', danger: true }
]

export function ContextMenu(props: ContextMenuProps): JSX.Element {
  const { x, y, label, onClose } = props
  const menuRef = useRef<HTMLDivElement>(null)

  // Keys pressed while the menu is open are for the menu, not for the grid or
  // the viewer behind it.
  useEffect(() => suspendViewerKeyboardHandler(), [])

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
    <div ref={menuRef} className="context-menu" style={{ top: y, left: x }} role="menu">
      <div className="context-menu-title">{label}</div>
      {MENU_ENTRIES.map(({ key, text, danger }) => {
        const run = props[key]
        if (!run) return null
        return (
          <button
            key={key}
            type="button"
            className={danger ? 'context-menu-item danger' : 'context-menu-item'}
            onClick={() => {
              run()
              onClose()
            }}
          >
            {text}
          </button>
        )
      })}
    </div>
  )
}
