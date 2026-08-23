import { useCallback } from 'react'
import type { ZipArchive } from '../../../preload/index'
import type { TabState } from '../types/tab'
import type { BrowseFolder } from './useBrowseFolder'

interface UseZipNavigationArgs {
  tabs: TabState[]
  updateTab: (tabId: string, updater: (tab: TabState) => TabState) => void
  addTab: (tab?: TabState) => TabState
  browseFolder: BrowseFolder
}

export function useZipNavigation({ tabs, updateTab, addTab, browseFolder }: UseZipNavigationArgs) {
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

  return { handleSelectZip, handleOpenZipInNewTab }
}
