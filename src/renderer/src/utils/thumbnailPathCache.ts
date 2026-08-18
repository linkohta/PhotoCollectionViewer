// Caches the resolved on-disk thumbnail path for images the app has already
// looked up (e.g. while preloading the neighbor window), so switching to one
// of those images can show its preview synchronously instead of waiting on
// another `image:thumbnailPath` IPC round-trip.
const pathCache = new Map<string, string>()
const MAX_ENTRIES = 200

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
  const key = cacheKey(filePath, maxSize, modified, size)
  pathCache.delete(key)
  pathCache.set(key, thumbnailPath)

  if (pathCache.size > MAX_ENTRIES) {
    const oldest = pathCache.keys().next().value
    if (oldest) pathCache.delete(oldest)
  }
}
