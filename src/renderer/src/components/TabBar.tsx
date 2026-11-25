import { useCallback, useMemo, useRef, useState } from 'react'
import type { TabGroup } from '../../../shared/types'
import { useTabDragAndDrop } from '../hooks/useTabDragAndDrop'
import type { TabGroupActions } from '../hooks/useTabs'
import { useTabWidth } from '../hooks/useTabWidth'
import { canSaveGroup } from '../state/closedTabs'
import { findGroup } from '../state/tabGroups'
import { makesGroup, type GroupDropTarget, type TabDropTarget } from '../state/tabMoves'
import { findTab } from '../state/tabTransitions'
import type { TabState } from '../types/tab'
import { buildTabBarEntries } from '../utils/tabBarEntries'
import { groupDropMark, tabDropMark } from '../utils/tabDrop'
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
  // Returns the id of the group made when the tab is dropped onto another.
  onMoveTab: (tabId: string, target: TabDropTarget) => string
  onMoveGroup: (groupId: string, target: GroupDropTarget) => void
  groupActions: TabGroupActions
}

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
  onMoveTab,
  onMoveGroup,
  groupActions
}: TabBarProps): JSX.Element {
  const [tabMenu, setTabMenu] = useState<TabMenu | null>(null)
  const [groupPanel, setGroupPanel] = useState<GroupPanel | null>(null)
  // The element of each group shown: its panel opens below it, and a dragged
  // group goes before or after it.
  const groupElements = useRef(new Map<string, HTMLDivElement>())
  const listRef = useRef<HTMLDivElement>(null)

  const entries = useMemo(
    () => buildTabBarEntries(tabs, groups, activeTabId),
    [tabs, groups, activeTabId]
  )
  useTabWidth(listRef, entries)

  const closeTabMenu = useCallback(() => setTabMenu(null), [])
  const closeGroupPanel = useCallback(() => setGroupPanel(null), [])

  const drag = useTabDragAndDrop({
    getGroupElement: (groupId) => groupElements.current.get(groupId),
    onMoveTab: (tabId, target) => {
      // A group made by dropping a tab onto another opens its panel, as one
      // made from the menu does.
      const newGroup = makesGroup(tabs, target)
      const groupId = onMoveTab(tabId, target)
      if (newGroup) setGroupPanel({ groupId, isNew: true })
    },
    onMoveGroup
  })

  const renderTab = (tab: TabState): JSX.Element => (
    <TabItem
      key={tab.id}
      tab={tab}
      isActive={tab.id === activeTabId}
      isDragging={drag.source?.kind === 'tab' && drag.source.tabId === tab.id}
      dropMark={tabDropMark(drag.hint, tab.id)}
      dragProps={drag.tabDragProps(tab)}
      onSelect={() => onSelectTab(tab.id)}
      onClose={() => onCloseTab(tab.id)}
      onContextMenu={(event) => {
        event.preventDefault()
        setTabMenu({ tabId: tab.id, x: event.clientX, y: event.clientY })
      }}
    />
  )

  const renderGroup = (group: TabGroup, groupTabs: TabState[], tabCount: number): JSX.Element => {
    const mark = groupDropMark(drag.hint, group.id)
    const isDragging = drag.source?.kind === 'group' && drag.source.groupId === group.id
    return (
      <div
        key={group.id}
        ref={(element) => {
          if (element) groupElements.current.set(group.id, element)
          else groupElements.current.delete(group.id)
        }}
        className={`tab-group tab-group-color-${group.color} ${group.collapsed ? 'collapsed' : ''} ${isDragging ? 'dragging' : ''} ${mark === 'before' || mark === 'after' ? `drop-${mark}` : ''}`}
      >
        <TabGroupLabel
          group={group}
          tabCount={tabCount}
          isDropTarget={mark === 'into'}
          dragProps={drag.labelDragProps(group)}
          onToggleCollapsed={() => groupActions.toggleGroupCollapsed(group.id)}
          onOpenPanel={() => setGroupPanel({ groupId: group.id, isNew: false })}
        />
        {groupTabs.map(renderTab)}
      </div>
    )
  }

  const menuTab = tabMenu ? findTab(tabs, tabMenu.tabId) : undefined
  const panelGroup = groupPanel ? findGroup(groups, groupPanel.groupId) : undefined

  return (
    <div className="tab-bar">
      <div
        ref={listRef}
        className={`tab-list ${drag.hint?.target.kind === 'end' ? 'drop-end' : ''}`}
        {...drag.listDropProps}
      >
        {entries.map((entry) =>
          entry.kind === 'tab'
            ? renderTab(entry.tab)
            : renderGroup(entry.group, entry.tabs, entry.tabCount)
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
          onCloseGroup={() => {
            groupActions.closeGroup(panelGroup.id)
            closeGroupPanel()
          }}
          onSaveGroup={() => {
            groupActions.saveGroup(panelGroup.id)
            closeGroupPanel()
          }}
          canSave={canSaveGroup(tabs, panelGroup.id)}
          onClose={closeGroupPanel}
        />
      )}
    </div>
  )
}
