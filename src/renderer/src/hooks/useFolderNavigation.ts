import { useCallback } from 'react'
import type { ZipArchive } from '../../../preload/index'
import { getTabTitle, type TabState } from '../types/tab'

interface UseFolderNavigationArgs {
  tabs: TabState[]
  activeTabId: string
  updateTab: (tabId: string, updater: (tab: TabState) => TabState) => void
  addTab: (tab?: TabState) => TabState
}

interface BrowseOptions {
  resetRoot?: boolean
  fromSubfolder?: boolean
}

export function useFolderNavigation({ tabs, activeTabId, updateTab, addTab }: UseFolderNavigationArgs) {
  const browseFolder = useCallback(
    async (tabId: string, folderPath: string, rootPath: string, options: BrowseOptions = {}) => {
      updateTab(tabId, (tab) => ({
        ...tab,
        loading: true,
        error: null,
        selectedIndex: null,
        viewMode: 'grid',
        returnToParentOnCloseViewer: false
      }))

      const nextRoot = options.resetRoot ? folderPath : rootPath

      try {
        const result = await window.photoCollection.scanFolder(folderPath, nextRoot)

        const shouldAutoOpenViewer =
          options.fromSubfolder &&
          result.subfolders.length === 0 &&
          result.zipFiles.length === 0 &&
          result.images.length > 0

        updateTab(tabId, (tab) => ({
          ...tab,
          loading: false,
          rootFolderPath: options.resetRoot ? folderPath : tab.rootFolderPath ?? nextRoot,
          collection: result,
          title: getTabTitle(result, options.resetRoot ? folderPath : tab.rootFolderPath ?? nextRoot),
          selectedIndex: shouldAutoOpenViewer ? 0 : null,
          viewMode: shouldAutoOpenViewer ? 'viewer' : 'grid',
          returnToParentOnCloseViewer: shouldAutoOpenViewer
        }))
      } catch {
        updateTab(tabId, (tab) => ({
          ...tab,
          loading: false,
          error: 'フォルダを読み込めませんでした',
          collection: null
        }))
      }
    },
    [updateTab]
  )

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
    async (tabId: string, subfolderPath: string, rootFolderPath: string) => {
      await browseFolder(tabId, subfolderPath, rootFolderPath, { fromSubfolder: true })
    },
    [browseFolder]
  )

  const handleSelectSubfolder = useCallback(
    async (tabId: string, subfolderPath: string) => {
      const tab = tabs.find((item) => item.id === tabId)
      if (!tab?.rootFolderPath) return
      await openSubfolderInTab(tabId, subfolderPath, tab.rootFolderPath)
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

  const openZipInTab = useCallback(
    async (tabId: string, zipFile: ZipArchive, rootFolderPath: string) => {
      const confirmed = await window.photoCollection.confirmExtractZip(
        zipFile.name,
        zipFile.extractPath,
        zipFile.isExtracted
      )
      if (!confirmed) return

      updateTab(tabId, (tab) => ({
        ...tab,
        loading: true,
        error: null
      }))

      try {
        const folderPath = await window.photoCollection.extractZip(zipFile.path)
        await browseFolder(tabId, folderPath, rootFolderPath, { fromSubfolder: true })
      } catch {
        updateTab(tabId, (tab) => ({
          ...tab,
          loading: false,
          error: 'ZIPファイルを解凍できませんでした'
        }))
      }
    },
    [browseFolder, updateTab]
  )

  const handleSelectZip = useCallback(
    async (tabId: string, zipFile: ZipArchive) => {
      const tab = tabs.find((item) => item.id === tabId)
      if (!tab?.rootFolderPath) return
      await openZipInTab(tabId, zipFile, tab.rootFolderPath)
    },
    [tabs, openZipInTab]
  )

  const handleOpenZipInNewTab = useCallback(
    async (zipFile: ZipArchive, rootFolderPath: string | null) => {
      if (!rootFolderPath) return

      const tab = addTab()
      await openZipInTab(tab.id, zipFile, rootFolderPath)
    },
    [addTab, openZipInTab]
  )

  const handleGoUp = useCallback(
    async (tabId: string) => {
      const tab = tabs.find((item) => item.id === tabId)
      if (!tab?.collection?.parentPath || !tab.rootFolderPath) return
      await browseFolder(tabId, tab.collection.parentPath, tab.rootFolderPath)
    },
    [tabs, browseFolder]
  )

  const handleSelectImage = useCallback(
    (tabId: string, index: number) => {
      updateTab(tabId, (tab) => ({
        ...tab,
        selectedIndex: index,
        viewMode: 'viewer',
        returnToParentOnCloseViewer: false
      }))
    },
    [updateTab]
  )

  const handleCloseViewer = useCallback(
    async (tabId: string) => {
      const tab = tabs.find((item) => item.id === tabId)
      if (!tab) return

      if (tab.returnToParentOnCloseViewer && tab.collection?.parentPath && tab.rootFolderPath) {
        await browseFolder(tabId, tab.collection.parentPath, tab.rootFolderPath)
        return
      }

      updateTab(tabId, (current) => ({
        ...current,
        viewMode: 'grid',
        returnToParentOnCloseViewer: false
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
    handleNavigate
  }
}
