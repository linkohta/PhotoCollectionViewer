import { useCallback, useMemo } from 'react'
import type { ZipArchive } from '../../../shared/types'
import { createEmptyTab, type TabState, type UpdateTab } from '../types/tab'
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

  // The new tab joins the group of the tab it was opened from, if any.
  const handleOpenZipInNewTab = useCallback(
    async (fromTabId: string, zipFile: ZipArchive) => {
      const from = getTab(fromTabId)
      if (!from?.rootFolderPath) return
      const { rootFolderPath, groupId } = from
      // Ask before creating the tab, so cancelling leaves no empty tab behind.
      if (!(await confirmOpenZip(zipFile))) return

      const tab = addTab(createEmptyTab(groupId))
      await openZipInTab(tab.id, zipFile, rootFolderPath)
    },
    [getTab, addTab, openZipInTab]
  )

  return useMemo(
    () => ({ handleSelectZip, handleOpenZipInNewTab }),
    [handleSelectZip, handleOpenZipInNewTab]
  )
}
