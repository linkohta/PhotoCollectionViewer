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

export interface TabSnapshot {
  title: string
  rootFolderPath: string | null
  currentFolderPath: string | null
  selectedIndex: number | null
  viewMode: 'grid' | 'viewer'
}

export interface SessionData {
  tabs: TabSnapshot[]
  activeTabIndex: number
  closedTabs: TabSnapshot[]
}

export interface WarmupImageDescriptor {
  path: string
  modified: number
  size: number
}
