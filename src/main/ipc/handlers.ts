import { ipcMain, BrowserWindow } from 'electron'
import { IPC } from '../../shared/ipcChannels'
import type { ConfirmationKind, SessionData, WarmupImageDescriptor } from '../../shared/types'
import { getFavorites, addFavorite, removeFavorite } from '../store/favorites'
import { getSession, saveSession } from '../store/session'
import { getConfirmations, setConfirmationEnabled } from '../store/confirmations'
import { getOrCreateThumbnailPath, getThumbnailDataUrl } from '../store/thumbnailCache'
import { setWarmupContext } from '../store/warmup'
import { extractZipArchive } from '../utils/zipArchive'
import { scanFolder, searchSubfolders, findFolderPreviewImage } from '../services/folderScan'
import { createImageDataUrl } from '../services/imageDataUrl'
import { renamePath } from '../services/renamePath'
import { confirmAndDeleteFolder } from '../services/deleteFolder'
import { moveToUnnecessary } from '../services/moveToUnnecessary'
import { confirmExtractZip } from '../services/zipDialogs'
import { exportSettingsViaDialog, importSettingsViaDialog } from '../services/settingsDialogs'
import { chooseFolderViaDialog } from '../services/folderDialogs'

export function registerIpcHandlers(): void {
  ipcMain.handle(IPC.openFolderDialog, async () => {
    return chooseFolderViaDialog()
  })

  ipcMain.handle(IPC.scanFolder, async (_event, folderPath: string, rootPath?: string) => {
    return scanFolder(folderPath, rootPath)
  })

  ipcMain.handle(IPC.searchSubfolders, async (_event, folderPath: string, query: string) => {
    return searchSubfolders(folderPath, query)
  })

  ipcMain.handle(IPC.getFolderPreviewImage, async (_event, folderPath: string) => {
    return findFolderPreviewImage(folderPath)
  })

  ipcMain.handle(IPC.extractZip, async (_event, zipPath: string) => {
    return extractZipArchive(zipPath)
  })

  ipcMain.handle(
    IPC.confirmExtractZip,
    async (_event, zipName: string, extractPath: string, isExtracted: boolean) => {
      return confirmExtractZip(zipName, extractPath, isExtracted)
    }
  )

  ipcMain.handle(
    IPC.getThumbnailPath,
    async (_event, filePath: string, maxSize: number, modified: number, fileSize: number) => {
      return getOrCreateThumbnailPath(filePath, maxSize, modified, fileSize)
    }
  )

  ipcMain.handle(IPC.getImageDataUrl, async (_event, filePath: string) => {
    return createImageDataUrl(filePath)
  })

  ipcMain.handle(
    IPC.getThumbnailDataUrl,
    async (_event, filePath: string, maxSize: number, modified: number, fileSize: number) => {
      return getThumbnailDataUrl(filePath, maxSize, modified, fileSize)
    }
  )

  ipcMain.on(IPC.setWarmupContext, (event, images: WarmupImageDescriptor[], maxSize: number) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return
    setWarmupContext(win.id, images, maxSize)
  })

  ipcMain.handle(IPC.getFavorites, async () => {
    return getFavorites()
  })

  ipcMain.handle(IPC.addFavorite, async (_event, folderPath: string) => {
    return addFavorite(folderPath)
  })

  ipcMain.handle(IPC.removeFavorite, async (_event, folderPath: string) => {
    return removeFavorite(folderPath)
  })

  ipcMain.handle(IPC.getSession, async () => {
    return getSession()
  })

  ipcMain.handle(IPC.saveSession, async (_event, session: SessionData) => {
    return saveSession(session)
  })

  ipcMain.handle(IPC.renamePath, async (_event, targetPath: string, newName: string) => {
    return renamePath(targetPath, newName)
  })

  ipcMain.handle(IPC.deleteFolder, async (_event, folderPath: string) => {
    return confirmAndDeleteFolder(folderPath)
  })

  ipcMain.handle(IPC.moveToUnnecessary, async (_event, targetPath: string) => {
    return moveToUnnecessary(targetPath)
  })

  ipcMain.handle(IPC.getConfirmations, async () => {
    return getConfirmations()
  })

  ipcMain.handle(IPC.setConfirmation, async (_event, kind: ConfirmationKind, enabled: boolean) => {
    return setConfirmationEnabled(kind, enabled)
  })

  ipcMain.handle(IPC.exportSettings, async () => {
    return exportSettingsViaDialog()
  })

  ipcMain.handle(IPC.importSettings, async () => {
    return importSettingsViaDialog()
  })
}
