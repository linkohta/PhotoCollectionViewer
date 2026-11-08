import { createHash } from 'crypto'
import { existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import { app } from 'electron'

// Thumbnails are JPEG files in userData/thumbnails, named after a hash of the
// source file's path, modification time and size and of the thumbnail size,
// so an edited photo gets a new one. Changing how the name is worked out
// would orphan every thumbnail users already have (see thumbnails.test.ts).
export function thumbnailCacheKey(
  filePath: string,
  maxSize: number,
  modified: number,
  fileSize: number
): string {
  return createHash('sha256').update(`${filePath}|${modified}|${fileSize}|${maxSize}`).digest('hex')
}

function getCacheDir(): string {
  const dir = join(app.getPath('userData'), 'thumbnails')
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  return dir
}

// Where the thumbnail for cacheKey is (or is to be) stored. Creates the
// folder if needed.
export function thumbnailFilePath(cacheKey: string): string {
  return join(getCacheDir(), `${cacheKey}.jpg`)
}
