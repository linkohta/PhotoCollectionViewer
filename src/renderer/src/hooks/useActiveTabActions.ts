import { useMemo } from 'react'
import { bindTabActions, type TabActions } from '../utils/tabActions'
import type { UpdateTab } from '../types/tab'
import type { FolderNavigation } from './useFolderNavigation'

interface UseActiveTabActionsArgs {
  tabId: string
  rootFolderPath: string | null
  navigation: FolderNavigation
  updateTab: UpdateTab
  focusMain: () => void
  refreshFavorites: () => Promise<void>
}

// The grid and viewer actions bound to the active tab, kept as the same
// objects until the active tab (or its root folder) changes.
export function useActiveTabActions({
  tabId,
  rootFolderPath,
  navigation,
  updateTab,
  focusMain,
  refreshFavorites
}: UseActiveTabActionsArgs): TabActions {
  return useMemo(
    () =>
      bindTabActions({
        tabId,
        rootFolderPath,
        navigation,
        updateTab,
        focusMain,
        refreshFavorites,
        showError: (message) => window.alert(message)
      }),
    [tabId, rootFolderPath, navigation, updateTab, focusMain, refreshFavorites]
  )
}
