import { useCallback, useMemo } from 'react'
import { findTab } from '../state/tabTransitions'
import type { TabState, UpdateTab } from '../types/tab'
import { useBrowseFolder } from './useBrowseFolder'
import { useCollectionMutations } from './useCollectionMutations'
import { useFolderBrowsing } from './useFolderBrowsing'
import { useLatestRef } from './useLatestRef'
import { useViewerNavigation } from './useViewerNavigation'
import { useZipNavigation } from './useZipNavigation'

interface UseFolderNavigationArgs {
  tabs: TabState[]
  activeTabId: string
  updateTab: UpdateTab
  addTab: (tab?: TabState) => TabState
}

// Everything the tabs' content can ask for, gathered in one object that keeps
// its identity across renders: the handlers look the tabs up when they run
// instead of closing over them, so a change to a tab doesn't recreate them.
export function useFolderNavigation({
  tabs,
  activeTabId,
  updateTab,
  addTab
}: UseFolderNavigationArgs) {
  const tabsRef = useLatestRef(tabs)
  const activeTabIdRef = useLatestRef(activeTabId)
  const getTabs = useCallback(() => tabsRef.current, [tabsRef])
  const getTab = useCallback((tabId: string) => findTab(tabsRef.current, tabId), [tabsRef])
  const getActiveTabId = useCallback(() => activeTabIdRef.current, [activeTabIdRef])

  const browseFolder = useBrowseFolder({ updateTab })
  const browsing = useFolderBrowsing({ getTab, getActiveTabId, addTab, browseFolder })
  const zip = useZipNavigation({ getTab, updateTab, addTab, browseFolder })
  const viewer = useViewerNavigation({ getTab, updateTab, browseFolder })
  const mutations = useCollectionMutations({ getTabs, getTab, updateTab, browseFolder })

  return useMemo(
    () => ({ ...browsing, ...zip, ...viewer, ...mutations }),
    [browsing, zip, viewer, mutations]
  )
}
