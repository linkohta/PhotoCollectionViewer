import { LruMap } from '../../../shared/lruMap'

// Sized to cover ~20 images on each side of the current one (preview thumbnails
// for the full window plus full-resolution images for the nearest few), so
// browsing stays fast even after the OS page cache for the photo files has
// been evicted (e.g. after the app sat in the background for a while).
// Clearing the src of a dropped image lets Chromium stop loading it.
const preloadCache = new LruMap<string, HTMLImageElement>(96, (stale) => {
  stale.src = ''
})

export function preloadImage(url: string): void {
  const existing = preloadCache.get(url)
  if (existing) {
    // Store it again so it counts as recently used and survives eviction.
    preloadCache.set(url, existing)
    return
  }

  const img = new Image()
  img.decoding = 'async'
  img.src = url
  preloadCache.set(url, img)
}

export function clearImagePreloadCache(): void {
  for (const img of preloadCache.values()) {
    img.src = ''
  }
  preloadCache.clear()
}
