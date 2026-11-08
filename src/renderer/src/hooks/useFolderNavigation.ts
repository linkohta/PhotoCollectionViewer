import { useCallback } from 'react'
import {
  findTab,
  planViewerExit,
  removeImage,
  removeSubfolder,
  selectImage,
  showGrid,
  stepImage
} from '../state/tabTransitions'
import type { SearchOrigin } from '../types/grid'
import type { TabState, UpdateTab } from '../types/tab'
import { useBrowseFolder } from './useBrowseFolder'
import { useZipNavigation } from './useZipNavigation'
import { useRenamePropagation } from './useRenamePropagation'

interface UseFolderNavigationArgs {
  tabs: TabState[]
  activeTabId: string
  updateTab: UpdateTab
  addTab: (tab?: TabState) => TabState
}

export function useFolderNavigation({
  tabs,
  activeTabId,
  updateTab,
  addTab
}: UseFolderNavigationArgs) {
  const browseFolder = useBrowseFolder({ updateTab })
  const { handleSelectZip, handleOpenZipInNewTab } = useZipNavigation({
    tabs,
    updateTab,
    addTab,
    browseFolder
  })
  const { handleRenameItem } = useRenamePropagation({ tabs, updateTab, browseFolder })

  const openFolderInTab = useCallback(
    async (tabId: string, folderPath: string) => {
      await browseFolder(tabId, folderPath, folderPath, { resetRoot: true })
    },
    [browseFolder]
  )

  const openFolderInActiveTab = useCallback(
    async (folderPath: string) => {
      await openFolderInTab(activeTabId, folderPath)
    },
    [activeTabId, openFolderInTab]
  )

  const handleOpenFolderInNewTab = useCallback(
    async (folderPath: string) => {
      const tab = addTab()
      await openFolderInTab(tab.id, folderPath)
    },
    [addTab, openFolderInTab]
  )

  const handleOpenDialog = useCallback(async () => {
    const folderPath = await window.photoCollection.openFolderDialog()
    if (folderPath) {
      await openFolderInActiveTab(folderPath)
    }
  }, [openFolderInActiveTab])

  const handleOpenDialogNewTab = useCallback(async () => {
    const folderPath = await window.photoCollection.openFolderDialog()
    if (!folderPath) return

    const tab = addTab()
    await openFolderInTab(tab.id, folderPath)
  }, [addTab, openFolderInTab])

  const openSubfolderInTab = useCallback(
    async (
      tabId: string,
      subfolderPath: string,
      rootFolderPath: string,
      searchOrigin?: SearchOrigin
    ) => {
      await browseFolder(tabId, subfolderPath, rootFolderPath, {
        fromSubfolder: true,
        returnFolderPath: searchOrigin?.originFolderPath,
        returnSearchQuery: searchOrigin?.query
      })
    },
    [browseFolder]
  )

  const handleSelectSubfolder = useCallback(
    async (tabId: string, subfolderPath: string, searchOrigin?: SearchOrigin) => {
      const tab = findTab(tabs, tabId)
      if (!tab?.rootFolderPath) return
      await openSubfolderInTab(tabId, subfolderPath, tab.rootFolderPath, searchOrigin)
    },
    [tabs, openSubfolderInTab]
  )

  const handleOpenSubfolderInNewTab = useCallback(
    async (subfolderPath: string, rootFolderPath: string | null) => {
      const tab = addTab()
      const rootPath = rootFolderPath ?? subfolderPath
      await browseFolder(tab.id, subfolderPath, rootPath, {
        fromSubfolder: true,
        resetRoot: rootFolderPath == null
      })
    },
    [addTab, browseFolder]
  )

  const handleGoUp = useCallback(
    async (tabId: string) => {
      const tab = findTab(tabs, tabId)
      if (!tab?.collection?.parentPath || !tab.rootFolderPath) return
      await browseFolder(tabId, tab.collection.parentPath, tab.rootFolderPath, {
        highlightPath: tab.collection.path
      })
    },
    [tabs, browseFolder]
  )

  const handleGoBack = useCallback(
    async (tabId: string) => {
      const tab = findTab(tabs, tabId)
      const entry = tab?.history[tab.history.length - 1]
      if (!tab || !entry) return
      await browseFolder(tabId, entry.folderPath, entry.rootFolderPath, {
        replaceRoot: true,
        highlightPath: tab.collection?.path,
        historyMode: 'back'
      })
    },
    [tabs, browseFolder]
  )

  const handleSelectImage = useCallback(
    (tabId: string, index: number) => {
      updateTab(tabId, (tab) => selectImage(tab, index))
    },
    [updateTab]
  )

  const handleCloseViewer = useCallback(
    async (tabId: string) => {
      const tab = findTab(tabs, tabId)
      if (!tab) return

      const exit = planViewerExit(tab)
      if (exit.type === 'browse') {
        await browseFolder(tabId, exit.folderPath, exit.rootFolderPath, exit.options)
        return
      }
      updateTab(tabId, (current) => showGrid(current, exit.highlightPath))
    },
    [tabs, browseFolder, updateTab]
  )

  const handleRefreshFolder = useCallback(
    async (tabId: string) => {
      const tab = findTab(tabs, tabId)
      if (!tab?.collection || !tab.rootFolderPath) return
      await browseFolder(tabId, tab.collection.path, tab.rootFolderPath, {
        highlightPath: tab.highlightPath ?? undefined
      })
    },
    [tabs, browseFolder]
  )

  const handleNavigate = useCallback(
    (tabId: string, direction: -1 | 1) => {
      updateTab(tabId, (tab) => stepImage(tab, direction))
    },
    [updateTab]
  )

  const handleMoveToUnnecessary = useCallback(
    async (tabId: string, path: string) => {
      await window.photoCollection.moveToUnnecessary(path)

      updateTab(tabId, (tab) => removeImage(tab, path))
    },
    [updateTab]
  )

  // Resolves false when the user cancels the confirmation dialog. On success
  // the folder is dropped from the grid in place instead of rescanning.
  const handleDeleteSubfolder = useCallback(
    async (tabId: string, path: string): Promise<boolean> => {
      const deleted = await window.photoCollection.deleteFolder(path)
      if (!deleted) return false

      updateTab(tabId, (tab) => removeSubfolder(tab, path))
      return true
    },
    [updateTab]
  )

  return {
    openFolderInActiveTab,
    handleOpenDialog,
    handleOpenDialogNewTab,
    handleOpenFolderInNewTab,
    handleSelectSubfolder,
    handleOpenSubfolderInNewTab,
    handleSelectZip,
    handleOpenZipInNewTab,
    handleGoUp,
    handleGoBack,
    handleSelectImage,
    handleCloseViewer,
    handleNavigate,
    handleRenameItem,
    handleMoveToUnnecessary,
    handleDeleteSubfolder,
    handleRefreshFolder
  }
}
