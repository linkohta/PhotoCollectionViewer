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

// Shown before the name of a tab showing the viewer: a picture, narrower than
// words would be, so it leaves the name more room.
function ViewerMark(): JSX.Element {
  return (
    <svg
      className="tab-viewer-mark"
      viewBox="0 0 12 12"
      width="12"
      height="12"
      role="img"
      aria-label="ビューワーで表示中"
    >
      <rect x="0.75" y="1.75" width="10.5" height="8.5" rx="1.5" />
      <path d="M2.5 8.5 5 5.5l1.75 1.75L8 6l1.5 2.5z" />
      <circle cx="8.25" cy="4.25" r="1" />
    </svg>
  )
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
  const inViewer = tab.viewMode === 'viewer'
  const shownPath = tab.collection?.path ?? tab.title

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
        title={inViewer ? `${shownPath}\nビューワーで表示中` : shownPath}
      >
        {tab.loading && <span className="tab-spinner" aria-hidden="true" />}
        {inViewer && <ViewerMark />}
        <span className="tab-title">{tab.title}</span>
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
