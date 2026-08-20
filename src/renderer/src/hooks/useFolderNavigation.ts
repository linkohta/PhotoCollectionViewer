import { useCallback } from 'react'
import type { ZipArchive } from '../../../preload/index'
import { getTabTitle, type TabState } from '../types/tab'
import { isSameOrChildPath, replacePathPrefix } from '../utils/files'

interface UseFolderNavigationArgs {
  tabs: TabState[]
  activeTabId: string
  updateTab: (tabId: string, updater: (tab: TabState) => TabState) => void
  addTab: (tab?: TabState) => TabState
}

interface BrowseOptions {
  resetRoot?: boolean
  fromSubfolder?: boolean
  highlightPath?: string
}

export function useFolderNavigation({
  tabs,
  activeTabId,
  updateTab,
  addTab
}: UseFolderNavigationArgs) {
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

        const shouldAutoOpenViewer = Boolean(
          options.fromSubfolder &&
          result.subfolders.length === 0 &&
          result.zipFiles.length === 0 &&
          result.images.length > 0
        )

        updateTab(tabId, (tab) => ({
          ...tab,
          loading: false,
          rootFolderPath: options.resetRoot ? folderPath : (tab.rootFolderPath ?? nextRoot),
          collection: result,
          title: getTabTitle(
            result,
            options.resetRoot ? folderPath : (tab.rootFolderPath ?? nextRoot)
          ),
          selectedIndex: shouldAutoOpenViewer ? 0 : null,
          viewMode: shouldAutoOpenViewer ? 'viewer' : 'grid',
          returnToParentOnCloseViewer: shouldAutoOpenViewer,
          highlightPath: shouldAutoOpenViewer ? null : (options.highlightPath ?? null)
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

      if (tab.returnToParentOnCloseViewer && tab.collection?.parentPath && tab.rootFolderPath) {
        await browseFolder(tabId, tab.collection.parentPath, tab.rootFolderPath, {
          highlightPath: tab.collection.path
        })
        return
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

  const handleRenameItem = useCallback(
    async (tabId: string, oldPath: string, newName: string): Promise<string> => {
      const newPath = await window.photoCollection.renamePath(oldPath, newName)
      if (newPath === oldPath) return newPath

      for (const tab of tabs) {
        const rootMatches = tab.rootFolderPath && isSameOrChildPath(tab.rootFolderPath, oldPath)
        const collectionMatches = tab.collection && isSameOrChildPath(tab.collection.path, oldPath)
        if (!rootMatches && !collectionMatches) continue

        updateTab(tab.id, (current) => {
          const nextRoot =
            current.rootFolderPath && isSameOrChildPath(current.rootFolderPath, oldPath)
              ? replacePathPrefix(current.rootFolderPath, oldPath, newPath)
              : current.rootFolderPath

          const nextCollection =
            current.collection && isSameOrChildPath(current.collection.path, oldPath)
              ? {
                  ...current.collection,
                  path: replacePathPrefix(current.collection.path, oldPath, newPath),
                  name:
                    replacePathPrefix(current.collection.path, oldPath, newPath)
                      .split(/[/\\]/)
                      .filter(Boolean)
                      .pop() ?? current.collection.name
                }
              : current.collection

          return {
            ...current,
            rootFolderPath: nextRoot,
            collection: nextCollection,
            title: getTabTitle(nextCollection, nextRoot)
          }
        })
      }

      const originTab = tabs.find((tab) => tab.id === tabId)
      if (originTab?.collection && originTab.rootFolderPath) {
        const nextFolderPath = isSameOrChildPath(originTab.collection.path, oldPath)
          ? replacePathPrefix(originTab.collection.path, oldPath, newPath)
          : originTab.collection.path
        const nextRootPath = isSameOrChildPath(originTab.rootFolderPath, oldPath)
          ? replacePathPrefix(originTab.rootFolderPath, oldPath, newPath)
          : originTab.rootFolderPath
        await browseFolder(tabId, nextFolderPath, nextRootPath)
      }

      return newPath
    },
    [tabs, updateTab, browseFolder]
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
    handleNavigate,
    handleRenameItem
  }
}
