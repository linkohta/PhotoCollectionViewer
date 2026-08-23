import { useCallback } from 'react'
import { getTabTitle, type TabState } from '../types/tab'
import { isSameOrChildPath, replacePathPrefix } from '../utils/files'
import type { BrowseFolder } from './useBrowseFolder'

interface UseRenamePropagationArgs {
  tabs: TabState[]
  updateTab: (tabId: string, updater: (tab: TabState) => TabState) => void
  browseFolder: BrowseFolder
}

function remapTabPathsAfterRename(
  tab: TabState,
  oldPath: string,
  newPath: string
): { rootFolderPath: TabState['rootFolderPath']; collection: TabState['collection'] } {
  const nextRoot =
    tab.rootFolderPath && isSameOrChildPath(tab.rootFolderPath, oldPath)
      ? replacePathPrefix(tab.rootFolderPath, oldPath, newPath)
      : tab.rootFolderPath

  const nextCollection =
    tab.collection && isSameOrChildPath(tab.collection.path, oldPath)
      ? {
          ...tab.collection,
          path: replacePathPrefix(tab.collection.path, oldPath, newPath),
          name:
            replacePathPrefix(tab.collection.path, oldPath, newPath)
              .split(/[/\\]/)
              .filter(Boolean)
              .pop() ?? tab.collection.name
        }
      : tab.collection

  return { rootFolderPath: nextRoot, collection: nextCollection }
}

// When a rename affects a path any open tab is currently showing (or is
// rooted under), every such tab's rootFolderPath/collection needs to be
// rewritten in place so the tab keeps pointing at the renamed location
// instead of a now-stale path.
export function useRenamePropagation({ tabs, updateTab, browseFolder }: UseRenamePropagationArgs) {
  const handleRenameItem = useCallback(
    async (tabId: string, oldPath: string, newName: string): Promise<string> => {
      const newPath = await window.photoCollection.renamePath(oldPath, newName)
      if (newPath === oldPath) return newPath

      for (const tab of tabs) {
        const rootMatches = tab.rootFolderPath && isSameOrChildPath(tab.rootFolderPath, oldPath)
        const collectionMatches = tab.collection && isSameOrChildPath(tab.collection.path, oldPath)
        if (!rootMatches && !collectionMatches) continue

        updateTab(tab.id, (current) => {
          const { rootFolderPath, collection } = remapTabPathsAfterRename(current, oldPath, newPath)
          return {
            ...current,
            rootFolderPath,
            collection,
            title: getTabTitle(collection, rootFolderPath)
          }
        })
      }

      const originTab = tabs.find((tab) => tab.id === tabId)
      if (originTab?.collection && originTab.rootFolderPath) {
        const { rootFolderPath, collection } = remapTabPathsAfterRename(originTab, oldPath, newPath)
        if (collection && rootFolderPath) {
          await browseFolder(tabId, collection.path, rootFolderPath)
        }
      }

      return newPath
    },
    [tabs, updateTab, browseFolder]
  )

  return { handleRenameItem }
}
