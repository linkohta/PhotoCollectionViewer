import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import { IPC } from '../shared/ipcChannels'
import type {
  ConfirmationKind,
  ConfirmationSettings,
  FavoriteFolder,
  FolderCollection,
  ImageFile,
  SessionData,
  SubfolderSearchResult,
  WarmupImageDescriptor
} from '../shared/types'

const api = {
  openFolderDialog: (): Promise<string | null> => ipcRenderer.invoke(IPC.openFolderDialog),
  scanFolder: (folderPath: string, rootPath?: string): Promise<FolderCollection> =>
    ipcRenderer.invoke(IPC.scanFolder, folderPath, rootPath),
  searchSubfolders: (folderPath: string, query: string): Promise<SubfolderSearchResult[]> =>
    ipcRenderer.invoke(IPC.searchSubfolders, folderPath, query),
  getFolderPreviewImage: (folderPath: string): Promise<ImageFile | null> =>
    ipcRenderer.invoke(IPC.getFolderPreviewImage, folderPath),
  extractZip: (zipPath: string): Promise<string> => ipcRenderer.invoke(IPC.extractZip, zipPath),
  confirmExtractZip: (
    zipName: string,
    extractPath: string,
    isExtracted: boolean
  ): Promise<boolean> =>
    ipcRenderer.invoke(IPC.confirmExtractZip, zipName, extractPath, isExtracted),
  getThumbnailPath: (
    filePath: string,
    maxSize: number,
    modified: number,
    fileSize: number
  ): Promise<string | null> =>
    ipcRenderer.invoke(IPC.getThumbnailPath, filePath, maxSize, modified, fileSize),
  getImageDataUrl: (filePath: string): Promise<string | null> =>
    ipcRenderer.invoke(IPC.getImageDataUrl, filePath),
  getThumbnailDataUrl: (
    filePath: string,
    maxSize: number,
    modified: number,
    fileSize: number
  ): Promise<string | null> =>
    ipcRenderer.invoke(IPC.getThumbnailDataUrl, filePath, maxSize, modified, fileSize),
  getFavorites: (): Promise<FavoriteFolder[]> => ipcRenderer.invoke(IPC.getFavorites),
  addFavorite: (folderPath: string): Promise<FavoriteFolder[]> =>
    ipcRenderer.invoke(IPC.addFavorite, folderPath),
  removeFavorite: (folderPath: string): Promise<FavoriteFolder[]> =>
    ipcRenderer.invoke(IPC.removeFavorite, folderPath),
  getSession: (): Promise<SessionData> => ipcRenderer.invoke(IPC.getSession),
  saveSession: (session: SessionData): Promise<SessionData> =>
    ipcRenderer.invoke(IPC.saveSession, session),
  renamePath: (targetPath: string, newName: string): Promise<string> =>
    ipcRenderer.invoke(IPC.renamePath, targetPath, newName),
  // Resolves false when the user cancels the confirmation dialog.
  deleteFolder: (folderPath: string): Promise<boolean> =>
    ipcRenderer.invoke(IPC.deleteFolder, folderPath),
  // Moves the file to the Recycle Bin.
  moveToUnnecessary: (targetPath: string): Promise<void> =>
    ipcRenderer.invoke(IPC.moveToUnnecessary, targetPath),
  setWarmupContext: (images: WarmupImageDescriptor[], maxSize: number): void =>
    ipcRenderer.send(IPC.setWarmupContext, images, maxSize),
  getConfirmations: (): Promise<ConfirmationSettings> => ipcRenderer.invoke(IPC.getConfirmations),
  setConfirmation: (kind: ConfirmationKind, enabled: boolean): Promise<ConfirmationSettings> =>
    ipcRenderer.invoke(IPC.setConfirmation, kind, enabled),
  // Fires when a dialog's "don't show again" checkbox changes the settings.
  // Returns an unsubscribe function.
  onConfirmationsChanged: (callback: (settings: ConfirmationSettings) => void): (() => void) => {
    const listener = (_event: IpcRendererEvent, settings: ConfirmationSettings): void =>
      callback(settings)
    ipcRenderer.on(IPC.onConfirmationsChanged, listener)
    return () => {
      ipcRenderer.removeListener(IPC.onConfirmationsChanged, listener)
    }
  },
  exportSettings: (): Promise<boolean> => ipcRenderer.invoke(IPC.exportSettings),
  importSettings: (): Promise<boolean> => ipcRenderer.invoke(IPC.importSettings)
}

contextBridge.exposeInMainWorld('photoCollection', api)

export type PhotoCollectionAPI = typeof api
