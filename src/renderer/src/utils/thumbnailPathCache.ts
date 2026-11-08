import { LruMap } from '../../../shared/lruMap'

// Caches the resolved on-disk thumbnail path for images the app has already
// looked up (e.g. while preloading the neighbor window), so switching to one
// of those images can show its preview synchronously instead of waiting on
// another `image:thumbnailPath` IPC round-trip.
const pathCache = new LruMap<string, string>(200)

function cacheKey(filePath: string, maxSize: number, modified: number, size: number): string {
  return `${filePath}:${maxSize}:${modified}:${size}`
}

export function getCachedThumbnailPath(
  filePath: string,
  maxSize: number,
  modified: number,
  size: number
): string | undefined {
  return pathCache.get(cacheKey(filePath, maxSize, modified, size))
}

export function setCachedThumbnailPath(
  filePath: string,
  maxSize: number,
  modified: number,
  size: number,
  thumbnailPath: string
): void {
  pathCache.set(cacheKey(filePath, maxSize, modified, size), thumbnailPath)
}
