import { useCallback, useMemo, useReducer } from 'react'
import type { ClosedTab, TabGroupSnapshot } from '../../../shared/types'
import { isClosedGroup, snapshotTabs } from '../state/closedTabs'
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
  // Closes all its tabs; Ctrl+Shift+T brings the group back as a whole.
  closeGroup: (groupId: string) => void
  // Closes all its tabs, keeping the group in the sidebar to open again.
  saveGroup: (groupId: string) => void
}

export function useTabs() {
  const [{ tabs, groups, activeTabId, closedTabs, savedGroups }, dispatch] = useReducer(
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

  // Rebuilds the tabs of a closed or saved group (rescanning their folders)
  // and puts the group back.
  const reopenGroup = useCallback(async (snapshot: TabGroupSnapshot) => {
    const tabs = await Promise.all(snapshotTabs(snapshot).map((tab) => restoreTabFromSnapshot(tab)))
    dispatch({ type: 'restoreGroup', group: snapshot.group, tabs, newGroupId: crypto.randomUUID() })
  }, [])

  const restoreClosedTab = useCallback(async () => {
    const entry = closedTabs[0]
    if (!entry) return

    dispatch({ type: 'forgetClosedTab', entry })
    if (isClosedGroup(entry)) {
      await reopenGroup(entry)
      return
    }
    const tab = await restoreTabFromSnapshot(entry)
    dispatch({ type: 'add', tab })
  }, [closedTabs, reopenGroup])

  // Opening a saved group takes it off the list in the sidebar.
  const openSavedGroup = useCallback(
    async (entry: TabGroupSnapshot) => {
      dispatch({ type: 'forgetSavedGroup', entry })
      await reopenGroup(entry)
    },
    [reopenGroup]
  )

  const deleteSavedGroup = useCallback((entry: TabGroupSnapshot) => {
    dispatch({ type: 'forgetSavedGroup', entry })
  }, [])

  const restoreSession = useCallback(
    (
      restoredTabs: TabState[],
      activeTabIndex: number,
      restoredClosedTabs: ClosedTab[],
      restoredGroups: readonly unknown[],
      restoredSavedGroups: readonly unknown[]
    ) => {
      dispatch({
        type: 'restoreSession',
        tabs: restoredTabs,
        activeTabIndex,
        closedTabs: restoredClosedTabs,
        groups: restoredGroups,
        savedGroups: restoredSavedGroups
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
      addNewTabToGroup: (groupId) => dispatch({ type: 'add', tab: createEmptyTab(groupId) }),
      closeGroup: (groupId) =>
        dispatch({ type: 'closeGroup', groupId, replacement: createEmptyTab() }),
      saveGroup: (groupId) =>
        dispatch({ type: 'saveGroup', groupId, replacement: createEmptyTab() })
    }),
    []
  )

  return {
    tabs,
    groups,
    activeTabId,
    activeTab,
    closedTabs,
    savedGroups,
    openSavedGroup,
    deleteSavedGroup,
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
