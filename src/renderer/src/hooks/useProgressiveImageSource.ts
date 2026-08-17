import { useEffect, useRef, useState } from 'react'
import type { ImageFile, WarmupImageDescriptor } from '../../../preload/index'
import { preloadImage } from '../utils/imagePreload'
import { toLocalFileUrl } from '../utils/files'
import type { Size } from '../utils/viewerGeometry'

const PREVIEW_THUMB_SIZE = 960
// Full-resolution images are decoded in full, so only preload a small window
// around the current image to keep memory/CPU use reasonable.
const FULL_PRELOAD_RANGE = 2
// Preview thumbnails are cheap (generated/cached by the main process), so we
// can afford to warm a much wider window - this is what keeps navigation
// snappy after the app has been idle in the background for a while and the
// OS file cache for the photos has been evicted.
const THUMBNAIL_PRELOAD_RANGE = 20

interface UseProgressiveImageSourceArgs {
  image: ImageFile
  allImages: ImageFile[]
  index: number
  fullUrl: string
  onNaturalSize: (size: Size) => void
}

export function useProgressiveImageSource({
  image,
  allImages,
  index,
  fullUrl,
  onNaturalSize
}: UseProgressiveImageSourceArgs): { imageSrc: string | null; isFullLoaded: boolean } {
  const loaderRef = useRef<HTMLImageElement | null>(null)
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [isFullLoaded, setIsFullLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false

    setIsFullLoaded(false)
    setImageSrc(null)

    if (loaderRef.current) {
      loaderRef.current.onload = null
      loaderRef.current.onerror = null
      loaderRef.current.src = ''
      loaderRef.current = null
    }

    const loadPreviewThenFull = async (): Promise<void> => {
      const previewPath = await window.photoCollection.getThumbnailPath(
        image.path,
        PREVIEW_THUMB_SIZE,
        image.modified,
        image.size
      )

      if (cancelled) return

      if (previewPath) {
        setImageSrc(toLocalFileUrl(previewPath))
      }

      const loader = new Image()
      loader.decoding = 'async'
      loaderRef.current = loader

      loader.onload = () => {
        if (cancelled) return
        setImageSrc(fullUrl)
        onNaturalSize({ width: loader.naturalWidth, height: loader.naturalHeight })
        setIsFullLoaded(true)
      }

      loader.onerror = () => {
        if (cancelled) return
        void window.photoCollection.getImageDataUrl(image.path).then((dataUrl) => {
          if (!cancelled && dataUrl) {
            setImageSrc(dataUrl)
            setIsFullLoaded(true)
          }
        })
      }

      loader.src = fullUrl
    }

    void loadPreviewThenFull()

    return () => {
      cancelled = true
      if (loaderRef.current) {
        loaderRef.current.onload = null
        loaderRef.current.onerror = null
        loaderRef.current.src = ''
        loaderRef.current = null
      }
    }
  }, [image.path, image.modified, image.size, fullUrl, onNaturalSize])

  useEffect(() => {
    const total = allImages.length
    if (total === 0) return

    let cancelled = false
    const maxRange = Math.floor((total - 1) / 2)
    const neighborAt = (offset: number): ImageFile | undefined =>
      allImages[(index + offset + total) % total]

    if (total > 1) {
      const fullOffsets = [1, 2, -1, -2].filter(
        (offset) => Math.abs(offset) <= FULL_PRELOAD_RANGE
      )
      for (const offset of fullOffsets) {
        const neighbor = neighborAt(offset)
        if (neighbor) {
          preloadImage(toLocalFileUrl(neighbor.path))
        }
      }
    }

    const preloadThumbnailWindow = async (): Promise<void> => {
      const range = Math.min(THUMBNAIL_PRELOAD_RANGE, maxRange)
      for (let distance = FULL_PRELOAD_RANGE + 1; distance <= range; distance++) {
        for (const offset of [distance, -distance]) {
          if (cancelled) return
          const neighbor = neighborAt(offset)
          if (!neighbor) continue

          const thumbPath = await window.photoCollection.getThumbnailPath(
            neighbor.path,
            PREVIEW_THUMB_SIZE,
            neighbor.modified,
            neighbor.size
          )
          if (cancelled) return
          if (thumbPath) preloadImage(toLocalFileUrl(thumbPath))
        }
      }
    }

    void preloadThumbnailWindow()

    // Tell the main process which images are "in view" so it can re-warm the
    // thumbnail cache (and, transitively, the OS file cache) for this window
    // when the app regains focus after sitting in the background.
    const warmupRange = Math.min(THUMBNAIL_PRELOAD_RANGE, maxRange)
    const warmupOffsets = [0]
    for (let distance = 1; distance <= warmupRange; distance++) {
      warmupOffsets.push(distance, -distance)
    }

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

  return { imageSrc, isFullLoaded }
}
