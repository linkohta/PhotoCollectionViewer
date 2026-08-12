import { contextBridge, ipcRenderer } from 'electron'

export interface ImageFile {
  path: string
  name: string
  size: number
  modified: number
}

export interface Subfolder {
  path: string
  name: string
}

export interface FolderCollection {
  path: string
  name: string
  parentPath: string | null
  subfolders: Subfolder[]
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

const api = {
  openFolderDialog: (): Promise<string | null> => ipcRenderer.invoke('dialog:openFolder'),
  scanFolder: (folderPath: string, rootPath?: string): Promise<FolderCollection> =>
    ipcRenderer.invoke('folder:scan', folderPath, rootPath),
  getThumbnailPath: (
    filePath: string,
    maxSize: number,
    modified: number,
    fileSize: number
  ): Promise<string | null> =>
    ipcRenderer.invoke('image:thumbnailPath', filePath, maxSize, modified, fileSize),
  getImageDataUrl: (filePath: string): Promise<string | null> =>
    ipcRenderer.invoke('image:dataUrl', filePath),
  getFavorites: (): Promise<FavoriteFolder[]> => ipcRenderer.invoke('favorites:get'),
  addFavorite: (folderPath: string): Promise<FavoriteFolder[]> =>
    ipcRenderer.invoke('favorites:add', folderPath),
  removeFavorite: (folderPath: string): Promise<FavoriteFolder[]> =>
    ipcRenderer.invoke('favorites:remove', folderPath),
  getSession: (): Promise<SessionData> => ipcRenderer.invoke('session:get'),
  saveSession: (session: SessionData): Promise<SessionData> =>
    ipcRenderer.invoke('session:save', session)
}

contextBridge.exposeInMainWorld('photoCollection', api)

export type PhotoCollectionAPI = typeof api
