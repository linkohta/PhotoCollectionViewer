import { useCallback } from 'react'
import type { TabState } from '../types/tab'
import { useBrowseFolder } from './useBrowseFolder'
import { useZipNavigation } from './useZipNavigation'
import { useRenamePropagation } from './useRenamePropagation'

interface UseFolderNavigationArgs {
  tabs: TabState[]
  activeTabId: string
  updateTab: (tabId: string, updater: (tab: TabState) => TabState) => void
  addTab: (tab?: TabState) => TabState
}

export interface SearchOrigin {
  originFolderPath: string
  query: string
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
      const tab = tabs.find((item) => item.id === tabId)
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
      const tab = tabs.find((item) => item.id === tabId)
      if (!tab?.collection?.parentPath || !tab.rootFolderPath) return
      await browseFolder(tabId, tab.collection.parentPath, tab.rootFolderPath, {
        highlightPath: tab.collection.path
      })
    },
    [tabs, browseFolder]
  )

  const handleSelectImage = useCallback(
    (tabId: string, index: number) => {
      updateTab(tabId, (tab) => ({
        ...tab,
        selectedIndex: index,
        viewMode: 'viewer',
        returnToParentOnCloseViewer: false,
        highlightPath: null
      }))
    },
    [updateTab]
  )

  const handleCloseViewer = useCallback(
    async (tabId: string) => {
      const tab = tabs.find((item) => item.id === tabId)
      if (!tab) return

      // A folder containing only images has no grid worth returning to, so
      // closing the viewer always goes up one level - whether the viewer was
      // opened automatically (entering such a folder) or by hand (selecting
      // an image inside one already open).
      const isImageOnlyFolder =
        tab.collection != null &&
        tab.collection.subfolders.length === 0 &&
        tab.collection.zipFiles.length === 0

      if ((tab.returnToParentOnCloseViewer || isImageOnlyFolder) && tab.rootFolderPath) {
        const targetFolder = tab.returnFolderPath ?? tab.collection?.parentPath ?? null
        if (targetFolder) {
          await browseFolder(tabId, targetFolder, tab.rootFolderPath, {
            highlightPath: tab.collection?.path,
            searchQuery: tab.returnSearchQuery ?? undefined
          })
          return
        }
      }

      const lastViewedImagePath =
        tab.selectedIndex !== null
          ? (tab.collection?.images[tab.selectedIndex]?.path ?? null)
          : null

      updateTab(tabId, (current) => ({
        ...current,
        viewMode: 'grid',
        returnToParentOnCloseViewer: false,
        highlightPath: lastViewedImagePath
      }))
    },
    [tabs, browseFolder, updateTab]
  )

  const handleNavigate = useCallback(
    (tabId: string, direction: -1 | 1) => {
      updateTab(tabId, (tab) => {
        if (!tab.collection || tab.selectedIndex === null) return tab

        const total = tab.collection.images.length
        if (total === 0) return tab

        const next = (tab.selectedIndex + direction + total) % total
        return { ...tab, selectedIndex: next }
      })
    },
    [updateTab]
  )

  const handleMoveToUnnecessary = useCallback(
    async (tabId: string, path: string) => {
      await window.photoCollection.moveToUnnecessary(path)

      updateTab(tabId, (tab) => {
        if (!tab.collection) return tab

        const removedIndex = tab.collection.images.findIndex((image) => image.path === path)
        if (removedIndex === -1) return tab

        const images = tab.collection.images.filter((image) => image.path !== path)

        let nextSelectedIndex = tab.selectedIndex
        let nextViewMode = tab.viewMode
        if (tab.selectedIndex !== null) {
          if (images.length === 0) {
            nextSelectedIndex = null
            nextViewMode = 'grid'
          } else {
            nextSelectedIndex = Math.min(tab.selectedIndex, images.length - 1)
          }
        }

        return {
          ...tab,
          collection: { ...tab.collection, images },
          selectedIndex: nextSelectedIndex,
          viewMode: nextViewMode,
          highlightPath: tab.highlightPath === path ? null : tab.highlightPath
        }
      })
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
    handleSelectImage,
    handleCloseViewer,
    handleNavigate,
    handleRenameItem,
    handleMoveToUnnecessary
  }
}
