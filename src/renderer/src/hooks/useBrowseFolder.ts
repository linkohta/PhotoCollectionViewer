import { useCallback } from 'react'
import { getTabTitle, type TabState } from '../types/tab'

export interface BrowseOptions {
  resetRoot?: boolean
  fromSubfolder?: boolean
  highlightPath?: string
  returnFolderPath?: string
  returnSearchQuery?: string
  searchQuery?: string
}

export type BrowseFolder = (
  tabId: string,
  folderPath: string,
  rootPath: string,
  options?: BrowseOptions
) => Promise<void>

interface UseBrowseFolderArgs {
  updateTab: (tabId: string, updater: (tab: TabState) => TabState) => void
}

// Central navigation primitive: every folder/subfolder/breadcrumb/go-up/zip
// action ends up calling this to load a folder's contents into a tab.
export function useBrowseFolder({ updateTab }: UseBrowseFolderArgs): BrowseFolder {
  return useCallback(
    async (tabId, folderPath, rootPath, options = {}) => {
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
          highlightPath: shouldAutoOpenViewer ? null : (options.highlightPath ?? null),
          returnFolderPath: options.returnFolderPath ?? null,
          returnSearchQuery: options.returnSearchQuery ?? null,
          pendingSearchQuery: options.searchQuery ?? null
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
}
