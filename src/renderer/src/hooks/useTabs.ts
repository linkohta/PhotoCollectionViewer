import { useCallback, useMemo, useState } from 'react'
import {
  createEmptyTab,
  hasRestorableContent,
  restoreTabFromSnapshot,
  tabToSnapshot,
  type TabSnapshot,
  type TabState
} from '../types/tab'

const MAX_CLOSED_TABS = 25

export function useTabs() {
  const initialTab = useMemo(() => createEmptyTab(), [])
  const [tabs, setTabs] = useState<TabState[]>([initialTab])
  const [activeTabId, setActiveTabId] = useState<string>(initialTab.id)
  const [closedTabs, setClosedTabs] = useState<TabSnapshot[]>([])

  const activeTab = useMemo(
    () => tabs.find((tab) => tab.id === activeTabId) ?? tabs[0]!,
    [tabs, activeTabId]
  )

  const updateTab = useCallback((tabId: string, updater: (tab: TabState) => TabState) => {
    setTabs((current) => current.map((tab) => (tab.id === tabId ? updater(tab) : tab)))
  }, [])

  const addTab = useCallback((tab: TabState = createEmptyTab()) => {
    setTabs((current) => [...current, tab])
    setActiveTabId(tab.id)
    return tab
  }, [])

  const selectTab = useCallback((tabId: string) => {
    setActiveTabId(tabId)
  }, [])

  const reorderTabs = useCallback((sourceId: string, targetId: string, insertAfter: boolean) => {
    setTabs((current) => {
      const fromIndex = current.findIndex((tab) => tab.id === sourceId)
      const toIndex = current.findIndex((tab) => tab.id === targetId)
      if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
        return current
      }

      const next = [...current]
      const [moved] = next.splice(fromIndex, 1)
      const adjustedToIndex = next.findIndex((tab) => tab.id === targetId)
      const insertAt = insertAfter ? adjustedToIndex + 1 : adjustedToIndex
      next.splice(insertAt, 0, moved!)
      return next
    })
  }, [])

  const closeTab = useCallback(
    (tabId: string) => {
      setTabs((current) => {
        const closingTab = current.find((tab) => tab.id === tabId)
        if (closingTab && hasRestorableContent(closingTab)) {
          setClosedTabs((closed) => [tabToSnapshot(closingTab), ...closed].slice(0, MAX_CLOSED_TABS))
        }

        if (current.length === 1) {
          const replacement = createEmptyTab()
          setActiveTabId(replacement.id)
          return [replacement]
        }

        const index = current.findIndex((tab) => tab.id === tabId)
        const next = current.filter((tab) => tab.id !== tabId)

        if (tabId === activeTabId) {
          const nextIndex = Math.min(index, next.length - 1)
          setActiveTabId(next[nextIndex]!.id)
        }

        return next
      })
    },
    [activeTabId]
  )

  const restoreClosedTab = useCallback(async () => {
    if (closedTabs.length === 0) return

    const [snapshot, ...rest] = closedTabs
    if (!snapshot) return

    setClosedTabs(rest)
    const tab = await restoreTabFromSnapshot(snapshot)
    setTabs((current) => [...current, tab])
    setActiveTabId(tab.id)
  }, [closedTabs])

  return {
    tabs,
    setTabs,
    activeTabId,
    setActiveTabId,
    activeTab,
    closedTabs,
    setClosedTabs,
    updateTab,
    addTab,
    selectTab,
    reorderTabs,
    closeTab,
    restoreClosedTab
  }
}
