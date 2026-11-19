import type { TabState } from '../types/tab'

type DragHandler = (event: React.DragEvent<HTMLDivElement>) => void

interface TabItemProps {
  tab: TabState
  isActive: boolean
  isDragging: boolean
  // Where the dragged tab would go, when it is over this one.
  dropHint: 'before' | 'after' | null
  onSelect: () => void
  onClose: () => void
  onContextMenu: (event: React.MouseEvent<HTMLDivElement>) => void
  onDragStart: DragHandler
  onDragOver: DragHandler
  onDrop: DragHandler
  onDragEnd: () => void
}

export function TabItem({
  tab,
  isActive,
  isDragging,
  dropHint,
  onSelect,
  onClose,
  onContextMenu,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd
}: TabItemProps): JSX.Element {
  const statusSuffix = tab.viewMode === 'viewer' ? ' · 表示中' : ''

  return (
    <div
      className={`tab-item ${isActive ? 'active' : ''} ${tab.loading ? 'loading' : ''} ${isDragging ? 'dragging' : ''} ${dropHint === 'before' ? 'drop-before' : ''} ${dropHint === 'after' ? 'drop-after' : ''}`}
      draggable
      onContextMenu={onContextMenu}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
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
