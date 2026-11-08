import { useCallback, useMemo, useReducer } from 'react'
import type { TabSnapshot } from '../../../shared/types'
import { initialTabsState, tabsReducer } from '../state/tabsReducer'
import { createEmptyTab, restoreTabFromSnapshot, type TabState } from '../types/tab'

export function useTabs() {
  const [{ tabs, activeTabId, closedTabs }, dispatch] = useReducer(tabsReducer, undefined, () =>
    initialTabsState(createEmptyTab())
  )

  const activeTab = useMemo(
    () => tabs.find((tab) => tab.id === activeTabId) ?? tabs[0]!,
    [tabs, activeTabId]
  )

  const updateTab = useCallback((tabId: string, updater: (tab: TabState) => TabState) => {
    dispatch({ type: 'update', tabId, updater })
  }, [])

  const addTab = useCallback((tab: TabState = createEmptyTab()) => {
    dispatch({ type: 'add', tab })
    return tab
  }, [])

  const selectTab = useCallback((tabId: string) => {
    dispatch({ type: 'select', tabId })
  }, [])

  const reorderTabs = useCallback((sourceId: string, targetId: string, insertAfter: boolean) => {
    dispatch({ type: 'reorder', sourceId, targetId, insertAfter })
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
    (restoredTabs: TabState[], activeTabIndex: number, restoredClosedTabs: TabSnapshot[]) => {
      dispatch({
        type: 'restoreSession',
        tabs: restoredTabs,
        activeTabIndex,
        closedTabs: restoredClosedTabs
      })
    },
    []
  )

  return {
    tabs,
    activeTabId,
    activeTab,
    closedTabs,
    updateTab,
    addTab,
    selectTab,
    reorderTabs,
    closeTab,
    restoreClosedTab,
    restoreSession
  }
}
