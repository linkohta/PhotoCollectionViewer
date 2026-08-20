import type { FolderCollection } from '../../../preload/index'

export type ViewMode = 'grid' | 'viewer'

export interface TabSnapshot {
  title: string
  rootFolderPath: string | null
  currentFolderPath: string | null
  selectedIndex: number | null
  viewMode: ViewMode
}

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
    highlightPath: null
  }
}

export function getTabTitle(
  collection: FolderCollection | null,
  rootFolderPath: string | null
): string {
  if (collection) return collection.name
  if (rootFolderPath) {
    const parts = rootFolderPath.split(/[/\\]/).filter(Boolean)
    return parts[parts.length - 1] ?? rootFolderPath
  }
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

export async function restoreTabFromSnapshot(
  snapshot: TabSnapshot
): Promise<TabState> {
  const tab = createEmptyTab()
  tab.title = snapshot.title
  tab.rootFolderPath = snapshot.rootFolderPath
  tab.viewMode = snapshot.viewMode
  tab.selectedIndex = snapshot.selectedIndex

  if (!snapshot.currentFolderPath) {
    return tab
  }

  const rootPath = snapshot.rootFolderPath ?? snapshot.currentFolderPath
  tab.loading = true

  try {
    const result = await window.photoCollection.scanFolder(snapshot.currentFolderPath, rootPath)
    tab.loading = false
    tab.collection = result
    tab.rootFolderPath = rootPath
    tab.title = getTabTitle(result, rootPath)

    if (
      tab.selectedIndex !== null &&
      (tab.selectedIndex >= result.images.length || result.images.length === 0)
    ) {
      tab.selectedIndex = result.images.length > 0 ? 0 : null
      tab.viewMode = result.images.length > 0 && snapshot.viewMode === 'viewer' ? 'viewer' : 'grid'
    }
  } catch {
    tab.loading = false
    tab.error = 'フォルダを読み込めませんでした'
    tab.viewMode = 'grid'
    tab.selectedIndex = null
  }

  return tab
}
