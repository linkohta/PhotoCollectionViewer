import { existsSync } from 'fs'
import { readFile } from 'fs/promises'
import { cpus } from 'os'
import sharp from 'sharp'
import { LruMap } from '../../shared/lruMap'
import { thumbnailCacheKey, thumbnailFilePath } from '../store/thumbnailDiskCache'
import { ConcurrencyLimiter } from '../utils/concurrencyLimiter'

// Where recently used thumbnails were written, so a repeat lookup can skip
// working out the path and checking the folder.
const pathCache = new LruMap<string, string>(400)

// Holds the actual JPEG bytes (not just the on-disk path) for a small "hot"
// window of thumbnails, so they can be served straight from process memory.
// pathCache above only remembers where a thumbnail was written - reading it
// back still means a disk access, which is exactly what's slow again once
// the OS file cache has been evicted (e.g. the app sat minimized for a
// while and other processes reused that RAM). A handful of small preview
// JPEGs costs only a few hundred KB, so it's cheap to keep them resident.
const bufferCache = new LruMap<string, Buffer>(48)

// sharp runs on libuv's threadpool, which bootstrap.ts sizes to the CPU count.
const thumbnailLimiter = new ConcurrencyLimiter(Math.min(8, Math.max(4, cpus().length)))

function rememberPath(key: string, path: string): string {
  pathCache.set(key, path)
  return path
}

async function generateThumbnailFile(
  filePath: string,
  maxSize: number,
  outputPath: string
): Promise<boolean> {
  try {
    await sharp(filePath)
      .resize(maxSize, maxSize, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 82, mozjpeg: true })
      .toFile(outputPath)
    return true
  } catch {
    return false
  }
}

export async function getOrCreateThumbnailPath(
  filePath: string,
  maxSize: number,
  modified: number,
  fileSize: number
): Promise<string | null> {
  const cacheKey = thumbnailCacheKey(filePath, maxSize, modified, fileSize)
  const cachedPath = pathCache.get(cacheKey)
  if (cachedPath && existsSync(cachedPath)) {
    return cachedPath
  }

  const outputPath = thumbnailFilePath(cacheKey)
  if (existsSync(outputPath)) {
    return rememberPath(cacheKey, outputPath)
  }

  return thumbnailLimiter.run(async () => {
    if (existsSync(outputPath)) {
      return rememberPath(cacheKey, outputPath)
    }

    const created = await generateThumbnailFile(filePath, maxSize, outputPath)
    if (!created) return null
    return rememberPath(cacheKey, outputPath)
  })
}

// Same result as getOrCreateThumbnailPath, but returns the bytes as a data
// URL instead of a file path, and remembers them in the in-memory buffer
// cache above so a later call for the same image needs no disk access at
// all, regardless of what the OS has since evicted from its file cache.
export async function getThumbnailDataUrl(
  filePath: string,
  maxSize: number,
  modified: number,
  fileSize: number
): Promise<string | null> {
  const cacheKey = thumbnailCacheKey(filePath, maxSize, modified, fileSize)

  const cachedBuffer = bufferCache.get(cacheKey)
  if (cachedBuffer) {
    bufferCache.set(cacheKey, cachedBuffer)
    return `data:image/jpeg;base64,${cachedBuffer.toString('base64')}`
  }

  const path = await getOrCreateThumbnailPath(filePath, maxSize, modified, fileSize)
  if (!path) return null

  try {
    const buffer = await readFile(path)
    bufferCache.set(cacheKey, buffer)
    return `data:image/jpeg;base64,${buffer.toString('base64')}`
  } catch {
    return null
  }
}
