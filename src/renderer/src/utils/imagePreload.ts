const preloadCache = new Map<string, HTMLImageElement>()
const MAX_PRELOAD_CACHE = 12

export function preloadImage(url: string): void {
  if (preloadCache.has(url)) return

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
