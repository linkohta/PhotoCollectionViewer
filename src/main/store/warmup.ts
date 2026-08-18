import { BrowserWindow } from 'electron'
import { getOrCreateThumbnailPath, getThumbnailDataUrl, warmSourceFile, ThumbnailQueue } from './thumbnailCache'

export interface WarmupImageDescriptor {
  path: string
  modified: number
  size: number
}

interface WarmupContext {
  images: WarmupImageDescriptor[]
  maxSize: number
}

// Keyed by BrowserWindow id: each window keeps its own "currently viewing"
// window of images so a focus regain only warms up what that window needs.
const contexts = new Map<number, WarmupContext>()

// Re-reading full source files is the expensive part of warmup (thumbnail
// lookups short-circuit instantly on a cache hit, which is the common case).
// Running those re-reads through the same queue used for interactive
// thumbnail generation would let a burst of ~40 background reads queue
// ahead of - and stall - the thumbnail the renderer needs right now for
// whichever image the user navigates to immediately after regaining focus.
// A separate, low-concurrency queue keeps warmup from starving interactive
// requests and from hammering the disk (especially on slow/network drives)
// hard enough to slow down the very navigation it's meant to speed up.
const warmupQueue = new ThumbnailQueue(2)

// Re-reading the full source file is only worth doing for the images the
// user is actually likely to jump to right after regaining focus; warming
// the whole wide preview-thumbnail window (see THUMBNAIL_PRELOAD_RANGE in
// useProgressiveImageSource.ts) would mean dozens of large re-reads for
// images several clicks away.
const SOURCE_WARMUP_RANGE = 5

export function setWarmupContext(
  windowId: number,
  images: WarmupImageDescriptor[],
  maxSize: number
): void {
  contexts.set(windowId, { images, maxSize })
}

export function clearWarmupContext(windowId: number): void {
  contexts.delete(windowId)
}

// Re-reads (and thumbnail-caches) the images the renderer last reported as
// "in view" when the window regains focus. This re-warms the OS file cache
// for those files even if it was evicted while another app was active in the
// foreground, which the renderer-side preload alone can't do because it only
// runs while the window is actually visible/focused.
//
// warmSourceFile reads the original photo bytes directly, since
// getOrCreateThumbnailPath short-circuits on a thumbnail cache hit (the
// common case, as the renderer already preloads thumbnails for this same
// window while browsing) without touching the source file at all.
export function warmupWindow(windowId: number): void {
  const context = contexts.get(windowId)
  if (!context || context.images.length === 0) return

  // context.images is ordered by ascending distance from the current image
  // (current, +1, -1, +2, -2, ...), so the closest ones are warmed first.
  const sourceWarmupCount = SOURCE_WARMUP_RANGE * 2 + 1

  context.images.forEach((image, position) => {
    if (position < sourceWarmupCount) {
      void warmSourceFile(image.path, warmupQueue)
      // Also keeps the in-memory preview-bytes cache (bufferCache in
      // thumbnailCache.ts) warm for this same hot window, so redisplaying
      // one of these needs no disk access at all, not just a cheap one.
      void getThumbnailDataUrl(image.path, context.maxSize, image.modified, image.size)
      return
    }
    // Thumbnail lookups short-circuit on a cache hit, so warming the full
    // wider window here is cheap and doesn't need the same throttling.
    void getOrCreateThumbnailPath(image.path, context.maxSize, image.modified, image.size)
  })
}

const PERIODIC_WARMUP_INTERVAL_MS = 3 * 60 * 1000

let periodicTimer: ReturnType<typeof setInterval> | null = null

// warmupWindow() alone only fires reactively, when a window regains OS
// focus - so the first navigation right after the app was inactive for a
// while (minimized, another app in the foreground, etc.) can still race the
// warmup and land on cold caches. Periodically re-running it for windows
// that are currently unfocused keeps the hot window from ever going fully
// cold in the first place, instead of only repairing it after the fact.
// Focused windows are skipped since active browsing already keeps their
// caches warm through the renderer's own preloading.
export function startPeriodicWarmup(): void {
  if (periodicTimer) return

  periodicTimer = setInterval(() => {
    for (const windowId of contexts.keys()) {
      const win = BrowserWindow.fromId(windowId)
      if (!win || win.isDestroyed() || win.isFocused()) continue
      warmupWindow(windowId)
    }
  }, PERIODIC_WARMUP_INTERVAL_MS)
}

export function stopPeriodicWarmup(): void {
  if (periodicTimer) {
    clearInterval(periodicTimer)
    periodicTimer = null
  }
}
