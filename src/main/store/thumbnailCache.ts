import { createHash } from 'crypto'
import { createReadStream, existsSync, mkdirSync } from 'fs'
import { readFile } from 'fs/promises'
import { cpus } from 'os'
import { join } from 'path'
import { app } from 'electron'
import sharp from 'sharp'

// libuv's threadpool (default size 4) caps how many sharp operations can run
// at once; raise it so the concurrent thumbnail queue below can actually use
// all its slots in parallel instead of queueing behind a small fixed pool.
process.env.UV_THREADPOOL_SIZE = String(Math.max(4, cpus().length))

const memoryCache = new Map<string, string>()
const MAX_MEMORY_CACHE = 400

// Holds the actual JPEG bytes (not just the on-disk path) for a small "hot"
// window of thumbnails, so they can be served straight from process memory.
// memoryCache above only remembers where a thumbnail was written - reading it
// back still means a disk access, which is exactly what's slow again once
// the OS file cache has been evicted (e.g. the app sat minimized for a
// while and other processes reused that RAM). A handful of small preview
// JPEGs costs only a few hundred KB, so it's cheap to keep them resident.
const bufferCache = new Map<string, Buffer>()
const MAX_BUFFER_CACHE = 48

export class ThumbnailQueue {
  private running = 0
  private readonly waiters: Array<() => void> = []
  private readonly maxConcurrent: number

  constructor(maxConcurrent = 4) {
    this.maxConcurrent = maxConcurrent
  }

  async run<T>(task: () => Promise<T>): Promise<T> {
    if (this.running >= this.maxConcurrent) {
      await new Promise<void>((resolve) => {
        this.waiters.push(resolve)
      })
    }

    this.running++
    try {
      return await task()
    } finally {
      this.running--
      const next = this.waiters.shift()
      if (next) next()
    }
  }
}

const thumbnailQueue = new ThumbnailQueue(Math.min(8, Math.max(4, cpus().length)))

function getCacheDir(): string {
  const dir = join(app.getPath('userData'), 'thumbnails')
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  return dir
}

function buildCacheKey(
  filePath: string,
  maxSize: number,
  modified: number,
  fileSize: number
): string {
  return createHash('sha256')
    .update(`${filePath}|${modified}|${fileSize}|${maxSize}`)
    .digest('hex')
}

function rememberInMemory(key: string, path: string): string {
  if (memoryCache.has(key)) {
    memoryCache.delete(key)
  }
  memoryCache.set(key, path)

  if (memoryCache.size > MAX_MEMORY_CACHE) {
    const oldest = memoryCache.keys().next().value
    if (oldest) memoryCache.delete(oldest)
  }

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

// Reads the original file's bytes so the OS file cache holds it, independent
// of whether a thumbnail for it already exists. getOrCreateThumbnailPath
// short-circuits on a thumbnail cache hit without touching the source file
// at all, so it alone can't re-warm the OS cache for the full-size photo.
async function readFileForCacheWarmup(filePath: string): Promise<void> {
  await new Promise<void>((resolve) => {
    const stream = createReadStream(filePath)
    stream.on('data', () => {})
    stream.on('error', () => resolve())
    stream.on('close', () => resolve())
  })
}

export function warmSourceFile(filePath: string, queue: ThumbnailQueue = thumbnailQueue): Promise<void> {
  return queue.run(() => readFileForCacheWarmup(filePath))
}

export async function getOrCreateThumbnailPath(
  filePath: string,
  maxSize: number,
  modified: number,
  fileSize: number
): Promise<string | null> {
  const cacheKey = buildCacheKey(filePath, maxSize, modified, fileSize)
  const cachedMemory = memoryCache.get(cacheKey)
  if (cachedMemory && existsSync(cachedMemory)) {
    return cachedMemory
  }

  const outputPath = join(getCacheDir(), `${cacheKey}.jpg`)
  if (existsSync(outputPath)) {
    return rememberInMemory(cacheKey, outputPath)
  }

  return thumbnailQueue.run(async () => {
    if (existsSync(outputPath)) {
      return rememberInMemory(cacheKey, outputPath)
    }

    const created = await generateThumbnailFile(filePath, maxSize, outputPath)
    if (!created) return null
    return rememberInMemory(cacheKey, outputPath)
  })
}

function rememberBuffer(key: string, buffer: Buffer): void {
  if (bufferCache.has(key)) {
    bufferCache.delete(key)
  }
  bufferCache.set(key, buffer)

  if (bufferCache.size > MAX_BUFFER_CACHE) {
    const oldest = bufferCache.keys().next().value
    if (oldest) bufferCache.delete(oldest)
  }
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
  const cacheKey = buildCacheKey(filePath, maxSize, modified, fileSize)

  const cachedBuffer = bufferCache.get(cacheKey)
  if (cachedBuffer) {
    rememberBuffer(cacheKey, cachedBuffer)
    return `data:image/jpeg;base64,${cachedBuffer.toString('base64')}`
  }

  const path = await getOrCreateThumbnailPath(filePath, maxSize, modified, fileSize)
  if (!path) return null

  try {
    const buffer = await readFile(path)
    rememberBuffer(cacheKey, buffer)
    return `data:image/jpeg;base64,${buffer.toString('base64')}`
  } catch {
    return null
  }
}
