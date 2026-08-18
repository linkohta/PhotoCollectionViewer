import { readdir, stat, rename } from 'fs/promises'
import { existsSync } from 'fs'
import { join, extname, basename, dirname } from 'path'
import { ipcMain, dialog, nativeImage, BrowserWindow } from 'electron'
import sharp from 'sharp'
import { getFavorites, addFavorite, removeFavorite, renameFavoritePaths } from '../store/favorites'
import { getSession, saveSession, type SessionData } from '../store/session'
import { getOrCreateThumbnailPath, getThumbnailDataUrl, ThumbnailQueue } from '../store/thumbnailCache'
import { setWarmupContext, type WarmupImageDescriptor } from '../store/warmup'
import { extractZipArchive, getZipExtractPath } from '../utils/zipArchive'

// sharp is unsupported for these formats; fall back to Electron's (synchronous)
// nativeImage decoder only for them so the common case never blocks the main process.
const SHARP_UNSUPPORTED_EXTENSIONS = new Set(['.bmp', '.ico'])

const INVALID_NAME_CHARS = /[\\/:*?"<>|]/

const IMAGE_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.bmp',
  '.tif',
  '.tiff',
  '.svg',
  '.ico',
  '.avif'
])

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

function isImageFile(filename: string): boolean {
  return IMAGE_EXTENSIONS.has(extname(filename).toLowerCase())
}

function isZipFile(filename: string): boolean {
  return extname(filename).toLowerCase() === '.zip'
}

async function scanFolder(
  folderPath: string,
  rootPath?: string
): Promise<FolderCollection> {
  const entries = await readdir(folderPath, { withFileTypes: true })
  const images: ImageFile[] = []
  const subfolders: Subfolder[] = []
  const zipFiles: ZipArchive[] = []

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (entry.name.startsWith('.')) continue
      subfolders.push({
        path: join(folderPath, entry.name),
        name: entry.name
      })
      continue
    }

    if (!entry.isFile()) continue

    if (isZipFile(entry.name)) {
      const filePath = join(folderPath, entry.name)
      try {
        const fileStat = await stat(filePath)
        const extractPath = getZipExtractPath(filePath)
        zipFiles.push({
          path: filePath,
          name: entry.name,
          size: fileStat.size,
          modified: fileStat.mtimeMs,
          extractPath,
          isExtracted: existsSync(extractPath)
        })
      } catch {
        // skip unreadable zip files
      }
      continue
    }

    if (!isImageFile(entry.name)) continue

    const filePath = join(folderPath, entry.name)
    try {
      const fileStat = await stat(filePath)
      images.push({
        path: filePath,
        name: entry.name,
        size: fileStat.size,
        modified: fileStat.mtimeMs
      })
    } catch {
      // skip unreadable files
    }
  }

  subfolders.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
  zipFiles.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
  images.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))

  const parentDir = dirname(folderPath)
  const canGoUp =
    rootPath != null &&
    folderPath.localeCompare(rootPath, undefined, { sensitivity: 'accent' }) !== 0

  return {
    path: folderPath,
    name: basename(folderPath),
    parentPath: canGoUp ? parentDir : null,
    subfolders,
    zipFiles,
    images
  }
}

function createImageDataUrlSync(filePath: string, maxSize: number): string | null {
  try {
    const image = nativeImage.createFromPath(filePath)
    if (image.isEmpty()) return null

    const { width, height } = image.getSize()
    if (width === 0 || height === 0) return null

    const scale = maxSize / Math.max(width, height)
    if (scale >= 1) return `data:image/jpeg;base64,${image.toJPEG(85).toString('base64')}`

    const resized = image.resize({
      width: Math.round(width * scale),
      height: Math.round(height * scale),
      quality: 'good'
    })
    return `data:image/jpeg;base64,${resized.toJPEG(85).toString('base64')}`
  } catch {
    return null
  }
}

// nativeImage has no async decode/resize API, so this always runs on the main
// process's JS thread and blocks it for the duration of the call. There's no
// way to make the call itself non-blocking, but serializing calls through a
// single-slot queue (with a setImmediate yield beforehand) prevents several
// of them from piling up back-to-back and keeps other pending IPC replies
// from being starved behind a burst of these.
const syncFallbackQueue = new ThumbnailQueue(1)

function runImageDataUrlSync(filePath: string, maxSize: number): Promise<string | null> {
  return syncFallbackQueue.run(
    () =>
      new Promise((resolve) => {
        setImmediate(() => resolve(createImageDataUrlSync(filePath, maxSize)))
      })
  )
}

async function createImageDataUrl(filePath: string, maxSize = 4096): Promise<string | null> {
  if (SHARP_UNSUPPORTED_EXTENSIONS.has(extname(filePath).toLowerCase())) {
    return runImageDataUrlSync(filePath, maxSize)
  }

  try {
    const buffer = await sharp(filePath)
      .resize(maxSize, maxSize, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer()
    return `data:image/jpeg;base64,${buffer.toString('base64')}`
  } catch {
    return runImageDataUrlSync(filePath, maxSize)
  }
}

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
    async (
      _event,
      zipName: string,
      extractPath: string,
      isExtracted: boolean
    ) => {
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
    async (
      _event,
      filePath: string,
      maxSize: number,
      modified: number,
      fileSize: number
    ) => {
      return getOrCreateThumbnailPath(filePath, maxSize, modified, fileSize)
    }
  )

  ipcMain.handle('image:dataUrl', async (_event, filePath: string) => {
    return createImageDataUrl(filePath)
  })

  ipcMain.handle(
    'image:thumbnailDataUrl',
    async (
      _event,
      filePath: string,
      maxSize: number,
      modified: number,
      fileSize: number
    ) => {
      return getThumbnailDataUrl(filePath, maxSize, modified, fileSize)
    }
  )

  ipcMain.on(
    'warmup:setContext',
    (event, images: WarmupImageDescriptor[], maxSize: number) => {
      const win = BrowserWindow.fromWebContents(event.sender)
      if (!win) return
      setWarmupContext(win.id, images, maxSize)
    }
  )

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
    const trimmed = newName.trim()
    if (!trimmed) {
      throw new Error('名前を入力してください')
    }
    if (INVALID_NAME_CHARS.test(trimmed)) {
      throw new Error('使用できない文字が含まれています（\\ / : * ? " < > |）')
    }
    if (trimmed === '.' || trimmed === '..') {
      throw new Error('無効な名前です')
    }

    const newPath = join(dirname(targetPath), trimmed)
    if (newPath === targetPath) {
      return targetPath
    }

    if (existsSync(newPath)) {
      throw new Error('同名のファイル・フォルダが既に存在します')
    }

    try {
      await rename(targetPath, newPath)
    } catch {
      throw new Error('名前の変更に失敗しました')
    }

    renameFavoritePaths(targetPath, newPath)

    return newPath
  })
}
