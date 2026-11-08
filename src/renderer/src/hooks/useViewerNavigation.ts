import { useCallback, useMemo } from 'react'
import { planViewerExit, selectImage, showGrid, stepImage } from '../state/tabTransitions'
import type { TabState, UpdateTab } from '../types/tab'
import type { BrowseFolder } from './useBrowseFolder'

interface UseViewerNavigationArgs {
  getTab: (tabId: string) => TabState | undefined
  updateTab: UpdateTab
  browseFolder: BrowseFolder
}

// Opening the viewer, stepping through the images and closing it again.
export function useViewerNavigation({ getTab, updateTab, browseFolder }: UseViewerNavigationArgs) {
  const handleSelectImage = useCallback(
    (tabId: string, index: number) => {
      updateTab(tabId, (tab) => selectImage(tab, index))
    },
    [updateTab]
  )

  const handleCloseViewer = useCallback(
    async (tabId: string) => {
      const tab = getTab(tabId)
      if (!tab) return

      const exit = planViewerExit(tab)
      if (exit.type === 'browse') {
        await browseFolder(tabId, exit.folderPath, exit.rootFolderPath, exit.options)
        return
      }
      updateTab(tabId, (current) => showGrid(current, exit.highlightPath))
    },
    [getTab, browseFolder, updateTab]
  )

  const handleNavigate = useCallback(
    (tabId: string, direction: -1 | 1) => {
      updateTab(tabId, (tab) => stepImage(tab, direction))
    },
    [updateTab]
  )

  return useMemo(
    () => ({ handleSelectImage, handleCloseViewer, handleNavigate }),
    [handleSelectImage, handleCloseViewer, handleNavigate]
  )
}
