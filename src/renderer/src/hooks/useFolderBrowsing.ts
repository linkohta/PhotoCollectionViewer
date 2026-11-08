import { useCallback, useMemo } from 'react'
import type { SearchOrigin } from '../types/grid'
import type { TabState } from '../types/tab'
import type { BrowseFolder } from './useBrowseFolder'

interface UseFolderBrowsingArgs {
  getTab: (tabId: string) => TabState | undefined
  getActiveTabId: () => string
  addTab: (tab?: TabState) => TabState
  browseFolder: BrowseFolder
}

// Opening folders: from the dialog or the sidebar, into a subfolder, up a
// level, back through the history, or the same folder again (refresh).
export function useFolderBrowsing({
  getTab,
  getActiveTabId,
  addTab,
  browseFolder
}: UseFolderBrowsingArgs) {
  const openFolderInTab = useCallback(
    async (tabId: string, folderPath: string) => {
      await browseFolder(tabId, folderPath, folderPath, { resetRoot: true })
    },
    [browseFolder]
  )

  const openFolderInActiveTab = useCallback(
    async (folderPath: string) => {
      await openFolderInTab(getActiveTabId(), folderPath)
    },
    [getActiveTabId, openFolderInTab]
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

  const handleSelectSubfolder = useCallback(
    async (tabId: string, subfolderPath: string, searchOrigin?: SearchOrigin) => {
      const tab = getTab(tabId)
      if (!tab?.rootFolderPath) return
      await browseFolder(tabId, subfolderPath, tab.rootFolderPath, {
        fromSubfolder: true,
        returnFolderPath: searchOrigin?.originFolderPath,
        returnSearchQuery: searchOrigin?.query
      })
    },
    [getTab, browseFolder]
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
      const tab = getTab(tabId)
      if (!tab?.collection?.parentPath || !tab.rootFolderPath) return
      await browseFolder(tabId, tab.collection.parentPath, tab.rootFolderPath, {
        highlightPath: tab.collection.path
      })
    },
    [getTab, browseFolder]
  )

  const handleGoBack = useCallback(
    async (tabId: string) => {
      const tab = getTab(tabId)
      const entry = tab?.history[tab.history.length - 1]
      if (!tab || !entry) return
      await browseFolder(tabId, entry.folderPath, entry.rootFolderPath, {
        replaceRoot: true,
        highlightPath: tab.collection?.path,
        historyMode: 'back'
      })
    },
    [getTab, browseFolder]
  )

  const handleRefreshFolder = useCallback(
    async (tabId: string) => {
      const tab = getTab(tabId)
      if (!tab?.collection || !tab.rootFolderPath) return
      await browseFolder(tabId, tab.collection.path, tab.rootFolderPath, {
        highlightPath: tab.highlightPath ?? undefined
      })
    },
    [getTab, browseFolder]
  )

  return useMemo(
    () => ({
      openFolderInActiveTab,
      handleOpenFolderInNewTab,
      handleOpenDialog,
      handleOpenDialogNewTab,
      handleSelectSubfolder,
      handleOpenSubfolderInNewTab,
      handleGoUp,
      handleGoBack,
      handleRefreshFolder
    }),
    [
      openFolderInActiveTab,
      handleOpenFolderInNewTab,
      handleOpenDialog,
      handleOpenDialogNewTab,
      handleSelectSubfolder,
      handleOpenSubfolderInNewTab,
      handleGoUp,
      handleGoBack,
      handleRefreshFolder
    ]
  )
}
