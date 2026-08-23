import { ipcMain, dialog, BrowserWindow } from 'electron'
import { getFavorites, addFavorite, removeFavorite } from '../store/favorites'
import { getSession, saveSession, type SessionData } from '../store/session'
import { getOrCreateThumbnailPath, getThumbnailDataUrl } from '../store/thumbnailCache'
import { setWarmupContext, type WarmupImageDescriptor } from '../store/warmup'
import { extractZipArchive } from '../utils/zipArchive'
import { scanFolder, searchSubfolders } from '../services/folderScan'
import { createImageDataUrl } from '../services/imageDataUrl'
import { renamePath } from '../services/renamePath'
import { confirmExtractZip } from '../services/zipDialogs'
import { exportSettingsViaDialog, importSettingsViaDialog } from '../services/settingsDialogs'

export function registerIpcHandlers(): void {
  ipcMain.handle('dialog:openFolder', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory']
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  ipcMain.handle('folder:scan', async (_event, folderPath: string, rootPath?: string) => {
    return scanFolder(folderPath, rootPath)
  })

  ipcMain.handle('folder:searchSubfolders', async (_event, folderPath: string, query: string) => {
    return searchSubfolders(folderPath, query)
  })

  ipcMain.handle('zip:extract', async (_event, zipPath: string) => {
    return extractZipArchive(zipPath)
  })

  ipcMain.handle(
    'zip:confirmExtract',
    async (_event, zipName: string, extractPath: string, isExtracted: boolean) => {
      return confirmExtractZip(zipName, extractPath, isExtracted)
    }
  )

  ipcMain.handle(
    'image:thumbnailPath',
    async (_event, filePath: string, maxSize: number, modified: number, fileSize: number) => {
      return getOrCreateThumbnailPath(filePath, maxSize, modified, fileSize)
    }
  )

  ipcMain.handle('image:dataUrl', async (_event, filePath: string) => {
    return createImageDataUrl(filePath)
  })

  ipcMain.handle(
    'image:thumbnailDataUrl',
    async (_event, filePath: string, maxSize: number, modified: number, fileSize: number) => {
      return getThumbnailDataUrl(filePath, maxSize, modified, fileSize)
    }
  )

  ipcMain.on('warmup:setContext', (event, images: WarmupImageDescriptor[], maxSize: number) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return
    setWarmupContext(win.id, images, maxSize)
  })

  ipcMain.handle('favorites:get', async () => {
    return getFavorites()
  })

  ipcMain.handle('favorites:add', async (_event, folderPath: string) => {
    return addFavorite(folderPath)
  })

  ipcMain.handle('favorites:remove', async (_event, folderPath: string) => {
    return removeFavorite(folderPath)
  })

  ipcMain.handle('session:get', async () => {
    return getSession()
  })

  ipcMain.handle('session:save', async (_event, session: SessionData) => {
    return saveSession(session)
  })

  ipcMain.handle('fs:rename', async (_event, targetPath: string, newName: string) => {
    return renamePath(targetPath, newName)
  })

  ipcMain.handle('settings:export', async () => {
    return exportSettingsViaDialog()
  })

  ipcMain.handle('settings:import', async () => {
    return importSettingsViaDialog()
  })
}
