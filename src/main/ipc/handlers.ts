import { ipcMain, dialog, BrowserWindow } from 'electron'
import { getFavorites, addFavorite, removeFavorite } from '../store/favorites'
import { getSession, saveSession, type SessionData } from '../store/session'
import { exportAppState, importAppState } from '../store/appState'
import { getOrCreateThumbnailPath, getThumbnailDataUrl } from '../store/thumbnailCache'
import { setWarmupContext, type WarmupImageDescriptor } from '../store/warmup'
import { extractZipArchive } from '../utils/zipArchive'
import { scanFolder } from '../services/folderScan'
import { createImageDataUrl } from '../services/imageDataUrl'
import { renamePath } from '../services/renamePath'

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

  ipcMain.handle('zip:extract', async (_event, zipPath: string) => {
    return extractZipArchive(zipPath)
  })

  ipcMain.handle(
    'zip:confirmExtract',
    async (_event, zipName: string, extractPath: string, isExtracted: boolean) => {
      const result = await dialog.showMessageBox({
        type: 'question',
        buttons: isExtracted ? ['開く', 'キャンセル'] : ['解凍', 'キャンセル'],
        defaultId: 0,
        cancelId: 1,
        noLink: true,
        title: 'ZIPファイル',
        message: isExtracted
          ? `「${zipName}」は既に解凍済みです。`
          : `「${zipName}」を解凍しますか？`,
        detail: isExtracted
          ? `解凍先フォルダを開きます。\n${extractPath}`
          : `ZIP内に同名フォルダがある場合は、その中身を次の場所へ展開します。\n${extractPath}`
      })

      return result.response === 0
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
    const result = await dialog.showSaveDialog({
      title: '設定をエクスポート',
      defaultPath: 'photocollection-settings.json',
      filters: [{ name: 'JSON', extensions: ['json'] }]
    })
    if (result.canceled || !result.filePath) return false

    try {
      exportAppState(result.filePath)
      return true
    } catch {
      throw new Error('設定のエクスポートに失敗しました')
    }
  })

  ipcMain.handle('settings:import', async () => {
    const result = await dialog.showOpenDialog({
      title: '設定をインポート',
      properties: ['openFile'],
      filters: [{ name: 'JSON', extensions: ['json'] }]
    })
    if (result.canceled || result.filePaths.length === 0) return false

    const confirm = await dialog.showMessageBox({
      type: 'question',
      buttons: ['インポート', 'キャンセル'],
      defaultId: 0,
      cancelId: 1,
      noLink: true,
      title: '設定をインポート',
      message: '現在の設定を上書きしてインポートしますか？',
      detail: '反映のためアプリの表示を再読み込みします。'
    })
    if (confirm.response !== 0) return false

    try {
      importAppState(result.filePaths[0])
    } catch {
      throw new Error('設定ファイルの読み込みに失敗しました。ファイルの内容を確認してください。')
    }

    // app.relaunch() は開発時(electron-vite)のプロセス管理と噛み合わず再起動に失敗するため、
    // プロセスは維持したまま各ウィンドウを再読み込みして新しい状態を反映する。
    for (const win of BrowserWindow.getAllWindows()) {
      win.reload()
    }
    return true
  })
}
