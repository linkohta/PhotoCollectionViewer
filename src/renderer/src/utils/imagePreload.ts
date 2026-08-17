const preloadCache = new Map<string, HTMLImageElement>()
// Sized to cover ~20 images on each side of the current one (preview thumbnails
// for the full window plus full-resolution images for the nearest few), so
// browsing stays fast even after the OS page cache for the photo files has
// been evicted (e.g. after the app sat in the background for a while).
const MAX_PRELOAD_CACHE = 96

export function preloadImage(url: string): void {
  if (preloadCache.has(url)) {
    // Touch the entry so it counts as recently used and survives eviction.
    const existing = preloadCache.get(url)
    if (existing) {
      preloadCache.delete(url)
      preloadCache.set(url, existing)
    }
    return
  }

  const img = new Image()
  img.decoding = 'async'
  img.src = url
  preloadCache.set(url, img)

  if (preloadCache.size > MAX_PRELOAD_CACHE) {
    const oldest = preloadCache.keys().next().value
    if (oldest) {
      const stale = preloadCache.get(oldest)
      if (stale) stale.src = ''
      preloadCache.delete(oldest)
    }
  }
}

export function clearImagePreloadCache(): void {
  for (const img of preloadCache.values()) {
    img.src = ''
  }
  preloadCache.clear()
}

export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable
}
