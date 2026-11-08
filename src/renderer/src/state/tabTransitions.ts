import type { BrowseOptions } from '../types/browse'
import type { TabState } from '../types/tab'
import { isSameOrChildPath } from '../utils/paths'

export function findTab(tabs: TabState[], tabId: string): TabState | undefined {
  return tabs.find((tab) => tab.id === tabId)
}

// Opens the image at index in the viewer.
export function selectImage(tab: TabState, index: number): TabState {
  return {
    ...tab,
    selectedIndex: index,
    viewMode: 'viewer',
    returnToParentOnCloseViewer: false,
    highlightPath: null
  }
}

// Moves the viewer to the previous or next image, wrapping around at both
// ends.
export function stepImage(tab: TabState, direction: -1 | 1): TabState {
  if (!tab.collection || tab.selectedIndex === null) return tab

  const total = tab.collection.images.length
  if (total === 0) return tab

  const next = (tab.selectedIndex + direction + total) % total
  return { ...tab, selectedIndex: next }
}

// Drops an image (moved to the Recycle Bin) from the open folder. The viewer
// keeps its position - now showing the next image, or the new last one - and
// gives way to the grid once no image is left.
export function removeImage(tab: TabState, path: string): TabState {
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
}

// Drops a deleted subfolder from the grid in place instead of rescanning,
// along with anything below it from the highlight and the "←" history.
export function removeSubfolder(tab: TabState, path: string): TabState {
  if (!tab.collection) return tab
  return {
    ...tab,
    collection: {
      ...tab.collection,
      subfolders: tab.collection.subfolders.filter(
        (subfolder) => !isSameOrChildPath(subfolder.path, path)
      )
    },
    highlightPath:
      tab.highlightPath && isSameOrChildPath(tab.highlightPath, path) ? null : tab.highlightPath,
    // "←" must not lead back into the deleted folder.
    history: tab.history.filter((entry) => !isSameOrChildPath(entry.folderPath, path))
  }
}

// Where closing the viewer leads: a folder to open, or the grid of the tab
// as it is (when it has no folder to reopen).
export type ViewerExit =
  | { type: 'browse'; folderPath: string; rootFolderPath: string; options: BrowseOptions }
  | { type: 'showGrid'; highlightPath: string | null }

export function planViewerExit(tab: TabState): ViewerExit {
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
      return {
        type: 'browse',
        folderPath: targetFolder,
        rootFolderPath: tab.rootFolderPath,
        options: {
          highlightPath: tab.collection?.path,
          searchQuery: tab.returnSearchQuery ?? undefined,
          historyMode: 'back'
        }
      }
    }
  }

  const lastViewedImagePath =
    tab.selectedIndex !== null ? (tab.collection?.images[tab.selectedIndex]?.path ?? null) : null

  if (tab.collection && tab.rootFolderPath) {
    return {
      type: 'browse',
      folderPath: tab.collection.path,
      rootFolderPath: tab.rootFolderPath,
      options: { highlightPath: lastViewedImagePath ?? undefined }
    }
  }

  return { type: 'showGrid', highlightPath: lastViewedImagePath }
}

export function showGrid(tab: TabState, highlightPath: string | null): TabState {
  return { ...tab, viewMode: 'grid', returnToParentOnCloseViewer: false, highlightPath }
}
