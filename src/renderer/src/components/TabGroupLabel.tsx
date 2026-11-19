import type { TabGroup } from '../../../shared/types'
import { groupDisplayName } from '../utils/tabGroupDisplay'

interface TabGroupLabelProps {
  group: TabGroup
  tabCount: number
  onToggleCollapsed: () => void
  onOpenPanel: () => void
}

// Clicking it collapses or expands the group; right-clicking opens the panel
// to edit it. Collapsed, it also shows how many tabs the group holds.
export function TabGroupLabel({
  group,
  tabCount,
  onToggleCollapsed,
  onOpenPanel
}: TabGroupLabelProps): JSX.Element {
  const name = group.name.trim()
  const description = `${groupDisplayName(group)} (${tabCount} 個のタブ)`

  return (
    <button
      type="button"
      className="tab-group-label"
      tabIndex={-1}
      onClick={onToggleCollapsed}
      onContextMenu={(event) => {
        event.preventDefault()
        onOpenPanel()
      }}
      title={`${description} - クリックで${group.collapsed ? '展開' : '折りたたみ'}、右クリックで編集`}
      aria-label={description}
      aria-expanded={!group.collapsed}
    >
      {name && <span className="tab-group-name">{name}</span>}
      {group.collapsed && <span className="tab-group-count">{tabCount}</span>}
    </button>
  )
}
