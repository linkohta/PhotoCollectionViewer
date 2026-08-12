import { readdir, stat } from 'fs/promises'
import { join, extname, basename, dirname } from 'path'
import { ipcMain, dialog, nativeImage } from 'electron'
import { getFavorites, addFavorite, removeFavorite } from '../store/favorites'
import { getSession, saveSession, type SessionData } from '../store/session'
import { getOrCreateThumbnailPath } from '../store/thumbnailCache'

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

export interface FolderCollection {
  path: string
  name: string
  parentPath: string | null
  subfolders: Subfolder[]
  images: ImageFile[]
}

function isImageFile(filename: string): boolean {
  return IMAGE_EXTENSIONS.has(extname(filename).toLowerCase())
}

async function scanFolder(
  folderPath: string,
  rootPath?: string
): Promise<FolderCollection> {
  const entries = await readdir(folderPath, { withFileTypes: true })
  const images: ImageFile[] = []
  const subfolders: Subfolder[] = []

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (entry.name.startsWith('.')) continue
      subfolders.push({
        path: join(folderPath, entry.name),
        name: entry.name
      })
      continue
    }

    if (!entry.isFile() || !isImageFile(entry.name)) continue

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
    images
  }
}

async function createImageDataUrl(filePath: string, maxSize = 4096): Promise<string | null> {
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
}
