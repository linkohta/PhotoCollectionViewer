import { readdir, stat } from 'fs/promises'
import { existsSync } from 'fs'
import { join, extname, basename, dirname } from 'path'
import { getZipExtractPath } from '../utils/zipArchive'

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

// .flv is included so it shows up alongside videos in the grid, but Chromium
// has no built-in FLV demuxer - playback in the viewer's <video> element will
// fail on most FLV files, which the renderer surfaces as an error instead of
// silently omitting the file from the list.
const VIDEO_EXTENSIONS = new Set(['.mp4', '.flv'])

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

function isVideoFile(filename: string): boolean {
  return VIDEO_EXTENSIONS.has(extname(filename).toLowerCase())
}

function isZipFile(filename: string): boolean {
  return extname(filename).toLowerCase() === '.zip'
}

export async function scanFolder(folderPath: string, rootPath?: string): Promise<FolderCollection> {
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

    const isVideo = isVideoFile(entry.name)
    if (!isVideo && !isImageFile(entry.name)) continue

    const filePath = join(folderPath, entry.name)
    try {
      const fileStat = await stat(filePath)
      images.push({
        path: filePath,
        name: entry.name,
        size: fileStat.size,
        modified: fileStat.mtimeMs,
        mediaType: isVideo ? 'video' : 'image'
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
    rootPath != null && folderPath.localeCompare(rootPath, undefined, { sensitivity: 'accent' }) !== 0

  return {
    path: folderPath,
    name: basename(folderPath),
    parentPath: canGoUp ? parentDir : null,
    subfolders,
    zipFiles,
    images
  }
}
