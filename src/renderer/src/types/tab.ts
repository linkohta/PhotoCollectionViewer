import type { FolderCollection, TabSnapshot, ViewMode } from '../../../shared/types'
import { pathBaseName } from '../utils/paths'

export interface TabState {
  id: string
  title: string
  collection: FolderCollection | null
  rootFolderPath: string | null
  selectedIndex: number | null
  viewMode: ViewMode
  loading: boolean
  error: string | null
  returnToParentOnCloseViewer: boolean
  // Path of the image or subfolder that was last shown in the viewer /
  // navigated into, so the grid can highlight it when the user comes back.
  highlightPath: string | null
  // When the folder currently open was reached by picking a subfolder search
  // result, these remember where the search happened and what was typed, so
  // closing an auto-opened viewer returns to the search results instead of
  // the folder's actual parent.
  returnFolderPath: string | null
  returnSearchQuery: string | null
  // Search query to restore into the grid's subfolder search box the next
  // time this folder is shown, consumed (set back to null) once applied.
  pendingSearchQuery: string | null
  // Folders previously shown in this tab (oldest first), walked back through
  // by the grid's "←" button. Kept in memory only, not saved in the session.
  history: FolderHistoryEntry[]
}

// Replaces a tab with what updater returns for it (see useTabs).
export type TabUpdater = (tab: TabState) => TabState
export type UpdateTab = (tabId: string, updater: TabUpdater) => void

export interface FolderHistoryEntry {
  folderPath: string
  rootFolderPath: string
}

export function createEmptyTab(): TabState {
  return {
    id: crypto.randomUUID(),
    title: '新しいタブ',
    collection: null,
    rootFolderPath: null,
    selectedIndex: null,
    viewMode: 'grid',
    loading: false,
    error: null,
    returnToParentOnCloseViewer: false,
    highlightPath: null,
    returnFolderPath: null,
    returnSearchQuery: null,
    pendingSearchQuery: null,
    history: []
  }
}

export function getTabTitle(
  collection: FolderCollection | null,
  rootFolderPath: string | null
): string {
  if (collection) return collection.name
  if (rootFolderPath) return pathBaseName(rootFolderPath) || rootFolderPath
  return '新しいタブ'
}

export function tabToSnapshot(tab: TabState): TabSnapshot {
  return {
    title: tab.title,
    rootFolderPath: tab.rootFolderPath,
    currentFolderPath: tab.collection?.path ?? null,
    selectedIndex: tab.selectedIndex,
    viewMode: tab.viewMode
  }
}

export function hasRestorableContent(tab: TabState): boolean {
  return tab.collection !== null || tab.rootFolderPath !== null
}
