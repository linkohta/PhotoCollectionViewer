import { readdir, stat } from 'fs/promises'
import { existsSync } from 'fs'
import { join, extname, basename, dirname } from 'path'
import { MEDIA_FORMATS, type MediaFormat } from '../../shared/media'
import { getZipExtractPath } from '../utils/zipArchive'
import type {
  FolderCollection,
  ImageFile,
  Subfolder,
  SubfolderSearchResult,
  ZipArchive
} from '../../shared/types'

const mediaKindOf = (filename: string): MediaFormat['kind'] | undefined =>
  MEDIA_FORMATS.get(extname(filename).toLowerCase())?.kind

function isImageFile(filename: string): boolean {
  return mediaKindOf(filename) === 'image'
}

function isVideoFile(filename: string): boolean {
  return mediaKindOf(filename) === 'video'
}

function isZipFile(filename: string): boolean {
  return extname(filename).toLowerCase() === '.zip'
}

// Folders such as .git are left out of the grid, the search and the previews.
const isHiddenFolder = (name: string): boolean => name.startsWith('.')

// Every list the app shows is in this order, so "file2" comes before "file10".
const compareNaturally = (a: string, b: string): number =>
  a.localeCompare(b, undefined, { numeric: true })

const byName = (a: { name: string }, b: { name: string }): number =>
  compareNaturally(a.name, b.name)

// Rejects when the file can't be read.
const toImageFile = async (
  folderPath: string,
  name: string,
  mediaType: ImageFile['mediaType']
): Promise<ImageFile> => {
  const filePath = join(folderPath, name)
  const fileStat = await stat(filePath)
  return { path: filePath, name, size: fileStat.size, modified: fileStat.mtimeMs, mediaType }
}

// Rejects when the file can't be read.
const toZipArchive = async (folderPath: string, name: string): Promise<ZipArchive> => {
  const filePath = join(folderPath, name)
  const fileStat = await stat(filePath)
  const extractPath = getZipExtractPath(filePath)
  return {
    path: filePath,
    name,
    size: fileStat.size,
    modified: fileStat.mtimeMs,
    extractPath,
    isExtracted: existsSync(extractPath)
  }
}

export async function scanFolder(folderPath: string, rootPath?: string): Promise<FolderCollection> {
  const entries = await readdir(folderPath, { withFileTypes: true })
  const images: ImageFile[] = []
  const subfolders: Subfolder[] = []
  const zipFiles: ZipArchive[] = []

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (isHiddenFolder(entry.name)) continue
      subfolders.push({
        path: join(folderPath, entry.name),
        name: entry.name
      })
      continue
    }

    if (!entry.isFile()) continue

    if (isZipFile(entry.name)) {
      try {
        zipFiles.push(await toZipArchive(folderPath, entry.name))
      } catch {
        // skip unreadable zip files
      }
      continue
    }

    const isVideo = isVideoFile(entry.name)
    if (!isVideo && !isImageFile(entry.name)) continue

    try {
      images.push(await toImageFile(folderPath, entry.name, isVideo ? 'video' : 'image'))
    } catch {
      // skip unreadable files
    }
  }

  subfolders.sort(byName)
  zipFiles.sort(byName)
  images.sort(byName)

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
      if (!entry.isDirectory() || isHiddenFolder(entry.name)) continue

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
  results.sort((a, b) => compareNaturally(a.relativePath, b.relativePath))
  return results
}

// How many folder levels below the target findFolderPreviewImage descends
// when the folder itself has no images, mirroring how Explorer still shows a
// preview for folders that only hold image subfolders.
const PREVIEW_SEARCH_DEPTH = 2

// Returns the first image (by the same name ordering as scanFolder) to use as
// the folder card's preview, falling back to the first image found in its
// subfolders. Videos are skipped since they have no sharp thumbnail.
export async function findFolderPreviewImage(
  folderPath: string,
  depth = PREVIEW_SEARCH_DEPTH
): Promise<ImageFile | null> {
  let entries
  try {
    entries = await readdir(folderPath, { withFileTypes: true })
  } catch {
    return null
  }

  const imageNames = entries
    .filter((entry) => entry.isFile() && isImageFile(entry.name))
    .map((entry) => entry.name)
    .sort(compareNaturally)

  for (const name of imageNames) {
    try {
      return await toImageFile(folderPath, name, 'image')
    } catch {
      // try the next image
    }
  }

  if (depth <= 0) return null

  const subfolderNames = entries
    .filter((entry) => entry.isDirectory() && !isHiddenFolder(entry.name))
    .map((entry) => entry.name)
    .sort(compareNaturally)

  for (const name of subfolderNames) {
    const found = await findFolderPreviewImage(join(folderPath, name), depth - 1)
    if (found) return found
  }

  return null
}
