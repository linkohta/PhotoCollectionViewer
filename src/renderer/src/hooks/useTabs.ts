import { useCallback, useMemo, useReducer } from 'react'
import type { TabSnapshot } from '../../../shared/types'
import type { TabGroupChanges } from '../state/tabGroups'
import type { GroupDropTarget, TabDropTarget } from '../state/tabMoves'
import { findTab } from '../state/tabTransitions'
import { initialTabsState, tabsReducer } from '../state/tabsReducer'
import { createEmptyTab, type TabState, type TabUpdater } from '../types/tab'
import { restoreTabFromSnapshot } from '../utils/restoreTab'

// What the tab bar can do with tab groups.
export interface TabGroupActions {
  // Returns the id of the new group.
  createGroup: (tabId: string) => string
  addTabToGroup: (tabId: string, groupId: string) => void
  removeTabFromGroup: (tabId: string) => void
  updateGroup: (groupId: string, changes: TabGroupChanges) => void
  toggleGroupCollapsed: (groupId: string) => void
  ungroup: (groupId: string) => void
  // An empty tab at the end of the group, activated.
  addNewTabToGroup: (groupId: string) => void
}

export function useTabs() {
  const [{ tabs, groups, activeTabId, closedTabs }, dispatch] = useReducer(
    tabsReducer,
    undefined,
    () => initialTabsState(createEmptyTab())
  )

  const activeTab = useMemo(() => findTab(tabs, activeTabId) ?? tabs[0]!, [tabs, activeTabId])

  const updateTab = useCallback((tabId: string, updater: TabUpdater) => {
    dispatch({ type: 'update', tabId, updater })
  }, [])

  const addTab = useCallback((tab: TabState = createEmptyTab()) => {
    dispatch({ type: 'add', tab })
    return tab
  }, [])

  const selectTab = useCallback((tabId: string) => {
    dispatch({ type: 'select', tabId })
  }, [])

  // Returns the id of the group made when the tab is dropped onto a tab
  // outside any group (see makesGroup).
  const moveTab = useCallback((tabId: string, target: TabDropTarget) => {
    const newGroupId = crypto.randomUUID()
    dispatch({ type: 'moveTab', tabId, target, newGroupId })
    return newGroupId
  }, [])

  const moveGroup = useCallback((groupId: string, target: GroupDropTarget) => {
    dispatch({ type: 'moveGroup', groupId, target })
  }, [])

  const closeTab = useCallback((tabId: string) => {
    dispatch({ type: 'close', tabId, replacement: createEmptyTab() })
  }, [])

  const restoreClosedTab = useCallback(async () => {
    const snapshot = closedTabs[0]
    if (!snapshot) return

    dispatch({ type: 'forgetClosedTab', snapshot })
    const tab = await restoreTabFromSnapshot(snapshot)
    dispatch({ type: 'add', tab })
  }, [closedTabs])

  const restoreSession = useCallback(
    (
      restoredTabs: TabState[],
      activeTabIndex: number,
      restoredClosedTabs: TabSnapshot[],
      restoredGroups: readonly unknown[]
    ) => {
      dispatch({
        type: 'restoreSession',
        tabs: restoredTabs,
        activeTabIndex,
        closedTabs: restoredClosedTabs,
        groups: restoredGroups
      })
    },
    []
  )

  const groupActions = useMemo<TabGroupActions>(
    () => ({
      createGroup: (tabId) => {
        const groupId = crypto.randomUUID()
        dispatch({ type: 'createGroup', tabId, groupId })
        return groupId
      },
      addTabToGroup: (tabId, groupId) => dispatch({ type: 'addTabToGroup', tabId, groupId }),
      removeTabFromGroup: (tabId) => dispatch({ type: 'removeTabFromGroup', tabId }),
      updateGroup: (groupId, changes) => dispatch({ type: 'updateGroup', groupId, changes }),
      toggleGroupCollapsed: (groupId) => dispatch({ type: 'toggleGroupCollapsed', groupId }),
      ungroup: (groupId) => dispatch({ type: 'ungroup', groupId }),
      addNewTabToGroup: (groupId) => dispatch({ type: 'add', tab: createEmptyTab(groupId) })
    }),
    []
  )

  return {
    tabs,
    groups,
    activeTabId,
    activeTab,
    closedTabs,
    updateTab,
    addTab,
    selectTab,
    moveTab,
    moveGroup,
    closeTab,
    restoreClosedTab,
    restoreSession,
    groupActions
  }
}
