import type { PopupMenuItem } from '../types/menu'
import { PopupMenu } from './PopupMenu'

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
  const items = MENU_ENTRIES.flatMap(({ key, text, danger }): PopupMenuItem[] => {
    const run = props[key]
    return run ? [{ key, text, danger, onSelect: run }] : []
  })

  return <PopupMenu x={x} y={y} label={label} items={items} onClose={onClose} />
}
