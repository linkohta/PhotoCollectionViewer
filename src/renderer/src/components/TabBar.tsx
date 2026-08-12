import { useCallback, useState } from 'react'
import type { TabState } from '../types/tab'

interface TabBarProps {
  tabs: TabState[]
  activeTabId: string
  canRestore: boolean
  onSelectTab: (tabId: string) => void
  onCloseTab: (tabId: string) => void
  onNewTab: () => void
  onRestoreClosedTab: () => void
  onReorderTabs: (sourceId: string, targetId: string, insertAfter: boolean) => void
}

type DropHint = { tabId: string; insertAfter: boolean }

export function TabBar({
  tabs,
  activeTabId,
  canRestore,
  onSelectTab,
  onCloseTab,
  onNewTab,
  onRestoreClosedTab,
  onReorderTabs
}: TabBarProps): JSX.Element {
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dropHint, setDropHint] = useState<DropHint | null>(null)

  const clearDragState = useCallback(() => {
    setDraggingId(null)
    setDropHint(null)
  }, [])

  const updateDropHint = useCallback((event: React.DragEvent<HTMLElement>, tabId: string) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const insertAfter = event.clientX > rect.left + rect.width / 2
    setDropHint((current) =>
      current?.tabId === tabId && current.insertAfter === insertAfter
        ? current
        : { tabId, insertAfter }
    )
  }, [])

  const handleDragStart = useCallback(
    (event: React.DragEvent<HTMLDivElement>, tabId: string) => {
      if ((event.target as HTMLElement).closest('.tab-close')) {
        event.preventDefault()
        return
      }

      event.dataTransfer.effectAllowed = 'move'
      event.dataTransfer.setData('text/plain', tabId)
      setDraggingId(tabId)
    },
    []
  )

  const handleDragOver = useCallback(
    (event: React.DragEvent<HTMLDivElement>, tabId: string) => {
      event.preventDefault()
      event.dataTransfer.dropEffect = 'move'
      if (draggingId && draggingId !== tabId) {
        updateDropHint(event, tabId)
      }
    },
    [draggingId, updateDropHint]
  )

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>, targetId: string) => {
      event.preventDefault()
      const sourceId = event.dataTransfer.getData('text/plain')
      if (!sourceId || sourceId === targetId) {
        clearDragState()
        return
      }

      const rect = event.currentTarget.getBoundingClientRect()
      const insertAfter = event.clientX > rect.left + rect.width / 2
      onReorderTabs(sourceId, targetId, insertAfter)
      clearDragState()
    },
    [clearDragState, onReorderTabs]
  )

  return (
    <div className="tab-bar">
      <div className="tab-list" onDragLeave={clearDragState}>
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId
          const statusSuffix = tab.viewMode === 'viewer' ? ' · 表示中' : ''
          const isDragging = tab.id === draggingId
          const dropBefore = dropHint?.tabId === tab.id && !dropHint.insertAfter
          const dropAfter = dropHint?.tabId === tab.id && dropHint.insertAfter

          return (
            <div
              key={tab.id}
              className={`tab-item ${isActive ? 'active' : ''} ${tab.loading ? 'loading' : ''} ${isDragging ? 'dragging' : ''} ${dropBefore ? 'drop-before' : ''} ${dropAfter ? 'drop-after' : ''}`}
              draggable
              onDragStart={(event) => handleDragStart(event, tab.id)}
              onDragOver={(event) => handleDragOver(event, tab.id)}
              onDrop={(event) => handleDrop(event, tab.id)}
              onDragEnd={clearDragState}
            >
              <button
                type="button"
                className="tab-label"
                tabIndex={-1}
                onClick={() => onSelectTab(tab.id)}
                title={tab.collection?.path ?? tab.title}
              >
                {tab.loading && <span className="tab-spinner" aria-hidden="true" />}
                <span className="tab-title">
                  {tab.title}
                  {statusSuffix}
                </span>
              </button>
              <button
                type="button"
                className="tab-close"
                draggable={false}
                onMouseDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation()
                  onCloseTab(tab.id)
                }}
                title="タブを閉じる"
                aria-label={`${tab.title} を閉じる`}
              >
                ×
              </button>
            </div>
          )
        })}
      </div>
      <button
        type="button"
        className="tab-restore btn"
        onClick={onRestoreClosedTab}
        disabled={!canRestore}
        title="閉じたタブを復元 (Ctrl+Shift+T)"
      >
        ↩
      </button>
      <button type="button" className="tab-new btn" onClick={onNewTab} title="新しいタブ">
        +
      </button>
    </div>
  )
}
