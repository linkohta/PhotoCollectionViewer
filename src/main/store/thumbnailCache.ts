import { createHash } from 'crypto'
import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import { app, nativeImage } from 'electron'

const memoryCache = new Map<string, string>()
const MAX_MEMORY_CACHE = 120

class ThumbnailQueue {
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

const thumbnailQueue = new ThumbnailQueue(4)

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
  const image = nativeImage.createFromPath(filePath)
  if (image.isEmpty()) return false

  const { width, height } = image.getSize()
  if (width === 0 || height === 0) return false

  const scale = maxSize / Math.max(width, height)
  const target =
    scale >= 1
      ? image
      : image.resize({
          width: Math.round(width * scale),
          height: Math.round(height * scale),
          quality: 'good'
        })

  writeFileSync(outputPath, target.toJPEG(82))
  return true
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
