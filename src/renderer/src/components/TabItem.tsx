import type { DragSourceProps } from '../hooks/useTabDragAndDrop'
import type { TabState } from '../types/tab'

interface TabItemProps {
  tab: TabState
  isActive: boolean
  isDragging: boolean
  // Where the dragged tab or group would go, when it is over this tab: a line
  // before or after it, or the tab itself for making a group of the two.
  dropMark: 'before' | 'after' | 'onto' | null
  dragProps: DragSourceProps
  onSelect: () => void
  onClose: () => void
  onContextMenu: (event: React.MouseEvent<HTMLDivElement>) => void
}

export function TabItem({
  tab,
  isActive,
  isDragging,
  dropMark,
  dragProps,
  onSelect,
  onClose,
  onContextMenu
}: TabItemProps): JSX.Element {
  const statusSuffix = tab.viewMode === 'viewer' ? ' · 表示中' : ''

  return (
    <div
      className={`tab-item ${isActive ? 'active' : ''} ${tab.loading ? 'loading' : ''} ${isDragging ? 'dragging' : ''} ${dropMark ? `drop-${dropMark}` : ''}`}
      onContextMenu={onContextMenu}
      {...dragProps}
    >
      <button
        type="button"
        className="tab-label"
        tabIndex={-1}
        onClick={onSelect}
        title={tab.collection?.path ?? tab.title}
      >
        {tab.loading && <span className="tab-spinner" aria-hidden="true" />}
        <span className="tab-title">
          {tab.title}
          {statusSuffix}
        </span>
      </button>
      {/* The close button isn't draggable itself, so a drag that starts on it
          belongs to the tab and moves it like any other. */}
      <button
        type="button"
        className="tab-close"
        draggable={false}
        onMouseDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation()
          onClose()
        }}
        title="タブを閉じる"
        aria-label={`${tab.title} を閉じる`}
      >
        ×
      </button>
    </div>
  )
}
