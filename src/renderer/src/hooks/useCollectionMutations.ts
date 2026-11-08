import { useCallback, useMemo } from 'react'
import { removeImage, removeSubfolder } from '../state/tabTransitions'
import type { TabState, UpdateTab } from '../types/tab'
import type { BrowseFolder } from './useBrowseFolder'
import { useRenamePropagation } from './useRenamePropagation'

interface UseCollectionMutationsArgs {
  getTabs: () => TabState[]
  getTab: (tabId: string) => TabState | undefined
  updateTab: UpdateTab
  browseFolder: BrowseFolder
}

// Changes to the files shown: renaming, moving an image to the Recycle Bin and
// deleting a subfolder. The tabs are updated in place instead of rescanning.
export function useCollectionMutations({
  getTabs,
  getTab,
  updateTab,
  browseFolder
}: UseCollectionMutationsArgs) {
  const { handleRenameItem } = useRenamePropagation({ getTabs, getTab, updateTab, browseFolder })

  const handleMoveToUnnecessary = useCallback(
    async (tabId: string, path: string) => {
      await window.photoCollection.moveToUnnecessary(path)

      updateTab(tabId, (tab) => removeImage(tab, path))
    },
    [updateTab]
  )

  // Resolves false when the user cancels the confirmation dialog.
  const handleDeleteSubfolder = useCallback(
    async (tabId: string, path: string): Promise<boolean> => {
      const deleted = await window.photoCollection.deleteFolder(path)
      if (!deleted) return false

      updateTab(tabId, (tab) => removeSubfolder(tab, path))
      return true
    },
    [updateTab]
  )

  return useMemo(
    () => ({ handleRenameItem, handleMoveToUnnecessary, handleDeleteSubfolder }),
    [handleRenameItem, handleMoveToUnnecessary, handleDeleteSubfolder]
  )
}
