import type { TabGroup } from '../../../shared/types'
import type { DragSourceProps } from '../hooks/useTabDragAndDrop'
import { groupDisplayName } from '../utils/tabGroupDisplay'

interface TabGroupLabelProps {
  group: TabGroup
  tabCount: number
  // A dragged tab would go first in the group.
  isDropTarget: boolean
  // Dragging the label moves the whole group.
  dragProps: DragSourceProps
  onToggleCollapsed: () => void
  onOpenPanel: () => void
}

// Clicking it collapses or expands the group; right-clicking opens the panel
// to edit it; dragging it moves the group. Collapsed, it also shows how many
// tabs the group holds.
export function TabGroupLabel({
  group,
  tabCount,
  isDropTarget,
  dragProps,
  onToggleCollapsed,
  onOpenPanel
}: TabGroupLabelProps): JSX.Element {
  const name = group.name.trim()
  const description = `${groupDisplayName(group)} (${tabCount} 個のタブ)`

  return (
    <button
      type="button"
      className={`tab-group-label ${isDropTarget ? 'drop-into' : ''}`}
      tabIndex={-1}
      onClick={onToggleCollapsed}
      onContextMenu={(event) => {
        event.preventDefault()
        onOpenPanel()
      }}
      title={`${description} - クリックで${group.collapsed ? '展開' : '折りたたみ'}、右クリックで編集、ドラッグで移動`}
      aria-label={description}
      aria-expanded={!group.collapsed}
      {...dragProps}
    >
      {name && <span className="tab-group-name">{name}</span>}
      {group.collapsed && <span className="tab-group-count">{tabCount}</span>}
    </button>
  )
}
