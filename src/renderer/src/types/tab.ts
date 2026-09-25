import type { FolderCollection, TabKind, YouTubeSource, YouTubeVideo } from '../../../preload/index'

export type ViewMode = 'grid' | 'viewer'

export interface TabSnapshot {
  title: string
  rootFolderPath: string | null
  currentFolderPath: string | null
  selectedIndex: number | null
  viewMode: ViewMode
  kind?: TabKind
  youtubeSource?: YouTubeSource | null
}

// Contents of a YouTube tab. Only `source` is saved in the session; the video
// list is fetched again (lazily, when the tab is first shown) after restore.
export interface YouTubeTabState {
  source: YouTubeSource
  videos: YouTubeVideo[]
  nextPageToken: string | null
  // Whether the first page has been fetched for the current source.
  loaded: boolean
  loadingMore: boolean
  playingVideoId: string | null
  // Highlighted in the grid after returning from the player.
  lastPlayedVideoId: string | null
}

export interface TabState {
  id: string
  kind: TabKind
  // Set when kind is 'youtube', null for folder tabs.
  youtube: YouTubeTabState | null
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

export interface FolderHistoryEntry {
  folderPath: string
  rootFolderPath: string
}

export function createEmptyTab(): TabState {
  return {
    id: crypto.randomUUID(),
    kind: 'folder',
    youtube: null,
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
  if (rootFolderPath) {
    const parts = rootFolderPath.split(/[/\\]/).filter(Boolean)
    return parts[parts.length - 1] ?? rootFolderPath
  }
  return '新しいタブ'
}

export function getYouTubeTabTitle(source: YouTubeSource): string {
  return source.type === 'channel' ? source.title : `検索: ${source.query}`
}

export function createYouTubeTab(source: YouTubeSource): TabState {
  return {
    ...createEmptyTab(),
    kind: 'youtube',
    title: getYouTubeTabTitle(source),
    youtube: {
      source,
      videos: [],
      nextPageToken: null,
      loaded: false,
      loadingMore: false,
      playingVideoId: null,
      lastPlayedVideoId: null
    }
  }
}

export function tabToSnapshot(tab: TabState): TabSnapshot {
  if (tab.kind === 'youtube' && tab.youtube) {
    return {
      title: tab.title,
      rootFolderPath: null,
      currentFolderPath: null,
      selectedIndex: null,
      viewMode: 'grid',
      kind: 'youtube',
      youtubeSource: tab.youtube.source
    }
  }

  return {
    title: tab.title,
    rootFolderPath: tab.rootFolderPath,
    currentFolderPath: tab.collection?.path ?? null,
    selectedIndex: tab.selectedIndex,
    viewMode: tab.viewMode
  }
}

export function hasRestorableContent(tab: TabState): boolean {
  if (tab.kind === 'youtube') return tab.youtube !== null
  return tab.collection !== null || tab.rootFolderPath !== null
}

export async function restoreTabFromSnapshot(snapshot: TabSnapshot): Promise<TabState> {
  if (snapshot.kind === 'youtube' && snapshot.youtubeSource) {
    return createYouTubeTab(snapshot.youtubeSource)
  }

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
