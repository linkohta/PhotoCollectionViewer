import { getOrCreateThumbnailPath } from './thumbnailCache'

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
export function warmupWindow(windowId: number): void {
  const context = contexts.get(windowId)
  if (!context || context.images.length === 0) return

  for (const image of context.images) {
    void getOrCreateThumbnailPath(image.path, context.maxSize, image.modified, image.size)
  }
}
