import { useCallback } from 'react'
import type { BrowseOptions } from '../types/browse'
import { getTabTitle, type UpdateTab } from '../types/tab'
import { nextFolderHistory } from '../utils/folderHistory'

export type BrowseFolder = (
  tabId: string,
  folderPath: string,
  rootPath: string,
  options?: BrowseOptions
) => Promise<void>

interface UseBrowseFolderArgs {
  updateTab: UpdateTab
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

        updateTab(tabId, (tab) => {
          const resolvedRoot =
            options.resetRoot || options.replaceRoot ? nextRoot : (tab.rootFolderPath ?? nextRoot)
          return {
            ...tab,
            loading: false,
            rootFolderPath: resolvedRoot,
            collection: result,
            title: getTabTitle(result, resolvedRoot),
            history: nextFolderHistory(tab, folderPath, options.historyMode ?? 'push'),
            selectedIndex: shouldAutoOpenViewer ? 0 : null,
            viewMode: shouldAutoOpenViewer ? 'viewer' : 'grid',
            returnToParentOnCloseViewer: shouldAutoOpenViewer,
            highlightPath: shouldAutoOpenViewer ? null : (options.highlightPath ?? null),
            returnFolderPath: options.returnFolderPath ?? null,
            returnSearchQuery: options.returnSearchQuery ?? null,
            pendingSearchQuery: options.searchQuery ?? null
          }
        })
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
