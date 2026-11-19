import { useCallback, useMemo, useRef, useState } from 'react'
import type { TabGroup } from '../../../shared/types'
import type { TabGroupActions } from '../hooks/useTabs'
import { findGroup } from '../state/tabGroups'
import { findTab } from '../state/tabTransitions'
import type { TabState } from '../types/tab'
import { buildTabBarEntries } from '../utils/tabBarEntries'
import { tabMenuItems } from '../utils/tabMenu'
import { PopupMenu } from './PopupMenu'
import { TabGroupLabel } from './TabGroupLabel'
import { TabGroupPanel } from './TabGroupPanel'
import { TabItem } from './TabItem'

interface TabBarProps {
  tabs: TabState[]
  groups: TabGroup[]
  activeTabId: string
  canRestore: boolean
  onSelectTab: (tabId: string) => void
  onCloseTab: (tabId: string) => void
  onNewTab: () => void
  onRestoreClosedTab: () => void
  onReorderTabs: (sourceId: string, targetId: string, insertAfter: boolean) => void
  groupActions: TabGroupActions
}

type DropHint = { tabId: string; insertAfter: boolean }
type TabMenu = { tabId: string; x: number; y: number }
type GroupPanel = { groupId: string; isNew: boolean }

export function TabBar({
  tabs,
  groups,
  activeTabId,
  canRestore,
  onSelectTab,
  onCloseTab,
  onNewTab,
  onRestoreClosedTab,
  onReorderTabs,
  groupActions
}: TabBarProps): JSX.Element {
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dropHint, setDropHint] = useState<DropHint | null>(null)
  const [tabMenu, setTabMenu] = useState<TabMenu | null>(null)
  const [groupPanel, setGroupPanel] = useState<GroupPanel | null>(null)
  // The element of each group shown, which its panel opens below.
  const groupElements = useRef(new Map<string, HTMLDivElement>())

  const entries = useMemo(
    () => buildTabBarEntries(tabs, groups, activeTabId),
    [tabs, groups, activeTabId]
  )

  const closeTabMenu = useCallback(() => setTabMenu(null), [])
  const closeGroupPanel = useCallback(() => setGroupPanel(null), [])

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

  const handleDragStart = useCallback((event: React.DragEvent<HTMLDivElement>, tabId: string) => {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', tabId)
    setDraggingId(tabId)
  }, [])

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

  const renderTab = (tab: TabState): JSX.Element => (
    <TabItem
      key={tab.id}
      tab={tab}
      isActive={tab.id === activeTabId}
      isDragging={tab.id === draggingId}
      dropHint={dropHint?.tabId === tab.id ? (dropHint.insertAfter ? 'after' : 'before') : null}
      onSelect={() => onSelectTab(tab.id)}
      onClose={() => onCloseTab(tab.id)}
      onContextMenu={(event) => {
        event.preventDefault()
        setTabMenu({ tabId: tab.id, x: event.clientX, y: event.clientY })
      }}
      onDragStart={(event) => handleDragStart(event, tab.id)}
      onDragOver={(event) => handleDragOver(event, tab.id)}
      onDrop={(event) => handleDrop(event, tab.id)}
      onDragEnd={clearDragState}
    />
  )

  const menuTab = tabMenu ? findTab(tabs, tabMenu.tabId) : undefined
  const panelGroup = groupPanel ? findGroup(groups, groupPanel.groupId) : undefined

  return (
    <div className="tab-bar">
      <div className="tab-list" onDragLeave={clearDragState}>
        {entries.map((entry) =>
          entry.kind === 'tab' ? (
            renderTab(entry.tab)
          ) : (
            <div
              key={entry.group.id}
              ref={(element) => {
                if (element) groupElements.current.set(entry.group.id, element)
                else groupElements.current.delete(entry.group.id)
              }}
              className={`tab-group tab-group-color-${entry.group.color} ${entry.group.collapsed ? 'collapsed' : ''}`}
            >
              <TabGroupLabel
                group={entry.group}
                tabCount={entry.tabCount}
                onToggleCollapsed={() => groupActions.toggleGroupCollapsed(entry.group.id)}
                onOpenPanel={() => setGroupPanel({ groupId: entry.group.id, isNew: false })}
              />
              {entry.tabs.map(renderTab)}
            </div>
          )
        )}
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

      {tabMenu && menuTab && (
        <PopupMenu
          x={tabMenu.x}
          y={tabMenu.y}
          label={menuTab.title}
          items={tabMenuItems(menuTab, {
            groups: entries.flatMap((entry) => (entry.kind === 'group' ? [entry.group] : [])),
            actions: groupActions,
            createGroup: () =>
              setGroupPanel({ groupId: groupActions.createGroup(menuTab.id), isNew: true }),
            closeTab: () => onCloseTab(menuTab.id)
          })}
          onClose={closeTabMenu}
        />
      )}
      {groupPanel && panelGroup && (
        <TabGroupPanel
          key={`${panelGroup.id}-${groupPanel.isNew}`}
          group={panelGroup}
          isNew={groupPanel.isNew}
          getAnchor={() => groupElements.current.get(panelGroup.id)}
          onChange={(changes) => groupActions.updateGroup(panelGroup.id, changes)}
          onAddTab={() => {
            groupActions.addNewTabToGroup(panelGroup.id)
            closeGroupPanel()
          }}
          onUngroup={() => {
            groupActions.ungroup(panelGroup.id)
            closeGroupPanel()
          }}
          onClose={closeGroupPanel}
        />
      )}
    </div>
  )
}
