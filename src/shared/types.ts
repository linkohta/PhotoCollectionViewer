import type { TAB_GROUP_COLORS } from './constants'

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

export type ViewMode = 'grid' | 'viewer'

export type TabGroupColor = (typeof TAB_GROUP_COLORS)[number]

// A named, coloured group of tabs, like Firefox's tab groups. Which tabs are
// in it is kept on the tabs (TabSnapshot.groupId), and they always sit next
// to each other in the tab bar.
export interface TabGroup {
  id: string
  name: string
  color: TabGroupColor
  // Only the label (and the active tab, if it is in the group) is shown.
  collapsed: boolean
}

export interface TabSnapshot {
  title: string
  rootFolderPath: string | null
  currentFolderPath: string | null
  selectedIndex: number | null
  viewMode: ViewMode
  // The TabGroup the tab is in. Sessions saved before tab groups lack it.
  groupId?: string | null
}

// A group with its tabs, kept while it is closed.
export interface TabGroupSnapshot {
  group: TabGroup
  tabs: TabSnapshot[]
}

// A group closed as a whole (or along with its last tab), which Ctrl+Shift+T
// brings back as one, with its name and colour.
export interface ClosedTabGroup extends TabGroupSnapshot {
  kind: 'group'
}

// What Ctrl+Shift+T brings back. Sessions saved before tab groups hold only
// tabs.
export type ClosedTab = TabSnapshot | ClosedTabGroup

export interface SessionData {
  tabs: TabSnapshot[]
  activeTabIndex: number
  // Most recently closed first; a group counts as one.
  closedTabs: ClosedTab[]
  groups: TabGroup[]
  // Groups closed with 「グループを保存して閉じる」, newest first, listed in
  // the sidebar to be opened again.
  savedGroups: TabGroupSnapshot[]
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
