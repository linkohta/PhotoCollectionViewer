import { readdir, stat } from 'fs/promises'
import { existsSync } from 'fs'
import { join, extname, basename, dirname } from 'path'
import { getZipExtractPath } from '../utils/zipArchive'
import type {
  FolderCollection,
  ImageFile,
  Subfolder,
  SubfolderSearchResult,
  ZipArchive
} from '../../preload/types'

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

// Walks the folder tree under folderPath looking for subfolder names that
// contain the query, so the sidebar search can surface matches nested
// several levels deep, not just the folders shown in the current grid.
export async function searchSubfolders(
  folderPath: string,
  query: string
): Promise<SubfolderSearchResult[]> {
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) return []

  const results: SubfolderSearchResult[] = []

  async function walk(currentPath: string, relativeParts: string[]): Promise<void> {
    let entries
    try {
      entries = await readdir(currentPath, { withFileTypes: true })
    } catch {
      return
    }

    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith('.')) continue

      const entryPath = join(currentPath, entry.name)
      const relativeParts_ = [...relativeParts, entry.name]

      if (entry.name.toLowerCase().includes(normalizedQuery)) {
        results.push({
          path: entryPath,
          name: entry.name,
          relativePath: relativeParts_.join('/')
        })
      }

      await walk(entryPath, relativeParts_)
    }
  }

  await walk(folderPath, [])
  results.sort((a, b) => a.relativePath.localeCompare(b.relativePath, undefined, { numeric: true }))
  return results
}
