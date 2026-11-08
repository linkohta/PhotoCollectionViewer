import { useCallback, useMemo } from 'react'
import type { ZipArchive } from '../../../shared/types'
import type { TabState, UpdateTab } from '../types/tab'
import type { BrowseFolder } from './useBrowseFolder'

interface UseZipNavigationArgs {
  getTab: (tabId: string) => TabState | undefined
  updateTab: UpdateTab
  addTab: (tab?: TabState) => TabState
  browseFolder: BrowseFolder
}

const confirmOpenZip = (zipFile: ZipArchive): Promise<boolean> =>
  window.photoCollection.confirmExtractZip(zipFile.name, zipFile.extractPath, zipFile.isExtracted)

export function useZipNavigation({
  getTab,
  updateTab,
  addTab,
  browseFolder
}: UseZipNavigationArgs) {
  const openZipInTab = useCallback(
    async (tabId: string, zipFile: ZipArchive, rootFolderPath: string) => {
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
      const tab = getTab(tabId)
      if (!tab?.rootFolderPath) return
      if (!(await confirmOpenZip(zipFile))) return
      await openZipInTab(tabId, zipFile, tab.rootFolderPath)
    },
    [getTab, openZipInTab]
  )

  const handleOpenZipInNewTab = useCallback(
    async (zipFile: ZipArchive, rootFolderPath: string | null) => {
      if (!rootFolderPath) return
      // Ask before creating the tab, so cancelling leaves no empty tab behind.
      if (!(await confirmOpenZip(zipFile))) return

      const tab = addTab()
      await openZipInTab(tab.id, zipFile, rootFolderPath)
    },
    [addTab, openZipInTab]
  )

  return useMemo(
    () => ({ handleSelectZip, handleOpenZipInNewTab }),
    [handleSelectZip, handleOpenZipInNewTab]
  )
}
