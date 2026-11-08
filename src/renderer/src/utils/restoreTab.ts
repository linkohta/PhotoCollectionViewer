import type { TabSnapshot } from '../../../shared/types'
import { createEmptyTab, getTabTitle, type TabState } from '../types/tab'

// Rebuilds a saved tab (session restore, Ctrl+Shift+T), rescanning the folder
// it showed.
export async function restoreTabFromSnapshot(snapshot: TabSnapshot): Promise<TabState> {
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
