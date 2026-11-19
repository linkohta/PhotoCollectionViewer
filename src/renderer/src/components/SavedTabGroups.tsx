import { useState } from 'react'
import type { TabGroupSnapshot } from '../../../shared/types'
import { groupDisplayName } from '../utils/tabGroupDisplay'
import { PopupMenu } from './PopupMenu'

interface SavedTabGroupsProps {
  // Newest first.
  savedGroups: TabGroupSnapshot[]
  onOpen: (entry: TabGroupSnapshot) => void
  onDelete: (entry: TabGroupSnapshot) => void
}

type SavedGroupMenu = { entry: TabGroupSnapshot; x: number; y: number }

// The sidebar's list of groups closed with 「グループを保存して閉じる」.
// Clicking one opens it again (and takes it off the list); right-clicking
// offers to open or delete it. Shown only while there is a saved group.
export function SavedTabGroups({
  savedGroups,
  onOpen,
  onDelete
}: SavedTabGroupsProps): JSX.Element | null {
  const [menu, setMenu] = useState<SavedGroupMenu | null>(null)
  if (savedGroups.length === 0) return null

  return (
    <div className="sidebar-section">
      <h2 className="section-title">保存したタブグループ</h2>
      <ul className="folder-list">
        {savedGroups.map((entry) => {
          const name = groupDisplayName(entry.group)
          return (
            <li key={entry.group.id}>
              <button
                type="button"
                className="folder-item saved-group-item"
                onClick={() => onOpen(entry)}
                onContextMenu={(event) => {
                  event.preventDefault()
                  setMenu({ entry, x: event.clientX, y: event.clientY })
                }}
                title={`${name} (${entry.tabs.length} 個のタブ) - クリックで開く`}
              >
                <span
                  className={`tab-group-dot tab-group-color-${entry.group.color}`}
                  aria-hidden="true"
                />
                <span className="folder-name">{name}</span>
                <span className="saved-group-count">{entry.tabs.length}</span>
              </button>
            </li>
          )
        })}
      </ul>

      {menu && (
        <PopupMenu
          x={menu.x}
          y={menu.y}
          label={groupDisplayName(menu.entry.group)}
          items={[
            { key: 'open', text: '開く', onSelect: () => onOpen(menu.entry) },
            { key: 'delete', text: '削除', danger: true, onSelect: () => onDelete(menu.entry) }
          ]}
          onClose={() => setMenu(null)}
        />
      )}
    </div>
  )
}
