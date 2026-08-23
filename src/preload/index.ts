import { contextBridge, ipcRenderer } from 'electron'
import type {
  FavoriteFolder,
  FolderCollection,
  SessionData,
  SubfolderSearchResult,
  WarmupImageDescriptor
} from './types'

export type {
  ImageFile,
  Subfolder,
  SubfolderSearchResult,
  ZipArchive,
  FolderCollection,
  FavoriteFolder,
  TabSnapshot,
  SessionData,
  WarmupImageDescriptor
} from './types'

const api = {
  openFolderDialog: (): Promise<string | null> => ipcRenderer.invoke('dialog:openFolder'),
  scanFolder: (folderPath: string, rootPath?: string): Promise<FolderCollection> =>
    ipcRenderer.invoke('folder:scan', folderPath, rootPath),
  searchSubfolders: (folderPath: string, query: string): Promise<SubfolderSearchResult[]> =>
    ipcRenderer.invoke('folder:searchSubfolders', folderPath, query),
  extractZip: (zipPath: string): Promise<string> => ipcRenderer.invoke('zip:extract', zipPath),
  confirmExtractZip: (
    zipName: string,
    extractPath: string,
    isExtracted: boolean
  ): Promise<boolean> =>
    ipcRenderer.invoke('zip:confirmExtract', zipName, extractPath, isExtracted),
  getThumbnailPath: (
    filePath: string,
    maxSize: number,
    modified: number,
    fileSize: number
  ): Promise<string | null> =>
    ipcRenderer.invoke('image:thumbnailPath', filePath, maxSize, modified, fileSize),
  getImageDataUrl: (filePath: string): Promise<string | null> =>
    ipcRenderer.invoke('image:dataUrl', filePath),
  getThumbnailDataUrl: (
    filePath: string,
    maxSize: number,
    modified: number,
    fileSize: number
  ): Promise<string | null> =>
    ipcRenderer.invoke('image:thumbnailDataUrl', filePath, maxSize, modified, fileSize),
  getFavorites: (): Promise<FavoriteFolder[]> => ipcRenderer.invoke('favorites:get'),
  addFavorite: (folderPath: string): Promise<FavoriteFolder[]> =>
    ipcRenderer.invoke('favorites:add', folderPath),
  removeFavorite: (folderPath: string): Promise<FavoriteFolder[]> =>
    ipcRenderer.invoke('favorites:remove', folderPath),
  getSession: (): Promise<SessionData> => ipcRenderer.invoke('session:get'),
  saveSession: (session: SessionData): Promise<SessionData> =>
    ipcRenderer.invoke('session:save', session),
  renamePath: (targetPath: string, newName: string): Promise<string> =>
    ipcRenderer.invoke('fs:rename', targetPath, newName),
  setWarmupContext: (images: WarmupImageDescriptor[], maxSize: number): void =>
    ipcRenderer.send('warmup:setContext', images, maxSize),
  exportSettings: (): Promise<boolean> => ipcRenderer.invoke('settings:export'),
  importSettings: (): Promise<boolean> => ipcRenderer.invoke('settings:import')
}

contextBridge.exposeInMainWorld('photoCollection', api)

export type PhotoCollectionAPI = typeof api
