import { useEffect, useRef, useState } from 'react'
import { toLocalFileUrl } from '../../../shared/localFileUrl'
import { isAnimatedImagePath } from '../../../shared/media'
import type { ImageFile } from '../../../shared/types'
import { PREVIEW_THUMB_SIZE } from '../utils/neighborWindow'
import { getCachedThumbnailPath } from '../utils/thumbnailPathCache'
import type { Size } from '../utils/viewerGeometry'

interface UseViewerImageSourceArgs {
  image: ImageFile
  fullUrl: string
  onNaturalSize: (size: Size) => void
}

// What the viewer shows for the current image: a preview thumbnail at once,
// then the full image once it has loaded (falling back to a data URL from the
// main process when Chromium can't decode the file itself).
export function useViewerImageSource({ image, fullUrl, onNaturalSize }: UseViewerImageSourceArgs): {
  imageSrc: string | null
  isFullLoaded: boolean
} {
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

    const isAnimatedGif = isAnimatedImagePath(image.path)

    const loadPreviewThenFull = async (): Promise<void> => {
      // Videos aren't handled by the sharp-based thumbnail/preview pipeline
      // below (it can't decode them) - the <video> element loads the file
      // directly and manages its own buffering.
      if (image.mediaType === 'video') {
        setImageSrc(fullUrl)
        setIsFullLoaded(true)
        return
      }

      // GIFs must be shown directly via the real <img> element so the
      // animation plays - any thumbnail/data-URL preview would be a single
      // rasterized frame, and pre-probing the source with an off-document
      // Image() (as done below for stills) is unnecessary and only delays
      // the animated element from actually attaching to the DOM.
      if (isAnimatedGif) {
        setImageSrc(fullUrl)
        setIsFullLoaded(true)
        return
      }

      // If this image's preview was already resolved as a path while it was
      // a preloaded (non-hot) neighbor, show it immediately instead of
      // waiting on another IPC round-trip to re-resolve the same path.
      const cachedPreviewPath = getCachedThumbnailPath(
        image.path,
        PREVIEW_THUMB_SIZE,
        image.modified,
        image.size
      )
      if (cachedPreviewPath) {
        setImageSrc(toLocalFileUrl(cachedPreviewPath))
      }

      // The current image is always "hot" - always fetch it as a data URL
      // rather than a path, so it's guaranteed to display without a disk
      // read even if the OS evicted the underlying files while the app sat
      // inactive.
      const previewDataUrl = await window.photoCollection.getThumbnailDataUrl(
        image.path,
        PREVIEW_THUMB_SIZE,
        image.modified,
        image.size
      )

      if (cancelled) return

      if (previewDataUrl) {
        setImageSrc(previewDataUrl)
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
  }, [image.path, image.modified, image.size, image.mediaType, fullUrl, onNaturalSize])

  return { imageSrc, isFullLoaded }
}
