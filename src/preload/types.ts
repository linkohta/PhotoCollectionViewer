export interface ImageFile {
  path: string
  name: string
  size: number
  modified: number
  mediaType: 'image' | 'video'
}

export interface Subfolder {
  path: string
  name: string
}

export interface SubfolderSearchResult {
  path: string
  name: string
  relativePath: string
}

export interface ZipArchive {
  path: string
  name: string
  size: number
  modified: number
  extractPath: string
  isExtracted: boolean
}

export interface FolderCollection {
  path: string
  name: string
  parentPath: string | null
  subfolders: Subfolder[]
  zipFiles: ZipArchive[]
  images: ImageFile[]
}

export interface FavoriteFolder {
  path: string
  name: string
  addedAt: number
}

export type TabKind = 'folder' | 'youtube'

export interface TabSnapshot {
  title: string
  rootFolderPath: string | null
  currentFolderPath: string | null
  selectedIndex: number | null
  viewMode: 'grid' | 'viewer'
  // Missing in sessions saved before YouTube tabs existed - treated as 'folder'.
  kind?: TabKind
  youtubeSource?: YouTubeSource | null
}

export interface SessionData {
  tabs: TabSnapshot[]
  activeTabIndex: number
  closedTabs: TabSnapshot[]
}

// Which confirmation dialogs are shown. false means the action proceeds
// without asking ("今後この確認を表示しない").
export interface ConfirmationSettings {
  extractZip: boolean
  deleteFolder: boolean
  importSettings: boolean
}

export type ConfirmationKind = keyof ConfirmationSettings

export interface WarmupImageDescriptor {
  path: string
  modified: number
  size: number
}

export interface YouTubeChannel {
  id: string
  title: string
  thumbnailUrl: string | null
  addedAt: number
}

export type YouTubeLiveStatus = 'none' | 'live' | 'upcoming'

export interface YouTubeVideo {
  id: string
  title: string
  channelId: string
  channelTitle: string
  thumbnailUrl: string | null
  publishedAt: string
  durationSeconds: number | null
  liveStatus: YouTubeLiveStatus
  scheduledStartTime: string | null
}

export interface YouTubeVideoPage {
  videos: YouTubeVideo[]
  nextPageToken: string | null
}

// The API key itself never leaves the main process - the renderer only
// learns whether one is stored.
export interface YouTubeSettings {
  hasApiKey: boolean
  channels: YouTubeChannel[]
}

// What a YouTube tab lists: a registered channel's uploads or a keyword search.
export type YouTubeSource =
  { type: 'channel'; channelId: string; title: string } | { type: 'search'; query: string }
