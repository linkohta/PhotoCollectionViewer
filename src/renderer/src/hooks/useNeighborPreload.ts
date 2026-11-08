import { useEffect } from 'react'
import { toLocalFileUrl } from '../../../shared/localFileUrl'
import type { ImageFile, WarmupImageDescriptor } from '../../../shared/types'
import { preloadImage } from '../utils/imagePreload'
import { getNeighborWindow, PREVIEW_THUMB_SIZE } from '../utils/neighborWindow'
import { setCachedThumbnailPath } from '../utils/thumbnailPathCache'

// Gets the images around the current one ready (see getNeighborWindow), so
// moving to them shows something at once, and tells the main process which
// images to keep warm while the app sits in the background.
export function useNeighborPreload(allImages: ImageFile[], index: number): void {
  useEffect(() => {
    const total = allImages.length
    if (total === 0) return

    let cancelled = false
    const neighborAt = (offset: number): ImageFile | undefined =>
      allImages[(index + offset + total) % total]
    const { fullOffsets, previews, warmupOffsets } = getNeighborWindow(total)

    for (const offset of fullOffsets) {
      const neighbor = neighborAt(offset)
      if (neighbor && neighbor.mediaType !== 'video') {
        preloadImage(toLocalFileUrl(neighbor.path))
      }
    }

    // One request at a time, nearest first, so the previews most likely to be
    // needed next arrive first.
    const preloadPreviews = async (): Promise<void> => {
      for (const { offset, hot } of previews) {
        if (cancelled) return
        const neighbor = neighborAt(offset)
        if (!neighbor || neighbor.mediaType === 'video') continue

        if (hot) {
          const dataUrl = await window.photoCollection.getThumbnailDataUrl(
            neighbor.path,
            PREVIEW_THUMB_SIZE,
            neighbor.modified,
            neighbor.size
          )
          if (cancelled) return
          if (dataUrl) preloadImage(dataUrl)
          continue
        }

        const thumbPath = await window.photoCollection.getThumbnailPath(
          neighbor.path,
          PREVIEW_THUMB_SIZE,
          neighbor.modified,
          neighbor.size
        )
        if (cancelled) return
        if (thumbPath) {
          preloadImage(toLocalFileUrl(thumbPath))
          setCachedThumbnailPath(
            neighbor.path,
            PREVIEW_THUMB_SIZE,
            neighbor.modified,
            neighbor.size,
            thumbPath
          )
        }
      }
    }

    void preloadPreviews()

    // Tell the main process which images are "in view" so it can re-warm the
    // thumbnail cache (and, transitively, the OS file cache) for this window
    // when the app regains focus after sitting in the background.
    const warmupContext: WarmupImageDescriptor[] = []
    for (const offset of warmupOffsets) {
      const neighbor = neighborAt(offset)
      if (neighbor) {
        warmupContext.push({
          path: neighbor.path,
          modified: neighbor.modified,
          size: neighbor.size
        })
      }
    }

    window.photoCollection.setWarmupContext(warmupContext, PREVIEW_THUMB_SIZE)

    return () => {
      cancelled = true
    }
  }, [allImages, index])
}
