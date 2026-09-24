import { useEffect, useState } from 'react'
import type { RefObject } from 'react'
import { toLocalFileUrl } from '../utils/files'

const PREVIEW_THUMBNAIL_SIZE = 200

const loadFolderPreview = async (folderPath: string): Promise<string | null> => {
  const image = await window.photoCollection.getFolderPreviewImage(folderPath)
  if (!image) return null

  const thumbnailPath = await window.photoCollection.getThumbnailPath(
    image.path,
    PREVIEW_THUMBNAIL_SIZE,
    image.modified,
    image.size
  )
  if (thumbnailPath) return toLocalFileUrl(thumbnailPath)

  return window.photoCollection.getThumbnailDataUrl(
    image.path,
    PREVIEW_THUMBNAIL_SIZE,
    image.modified,
    image.size
  )
}

// Lazily resolves the thumbnail shown inside a subfolder card's folder icon
// (the folder's first image, like Explorer's folder previews). Loading only
// starts once the card scrolls near the viewport, same as ThumbnailCard.
export function useFolderPreview(
  folderPath: string,
  elementRef: RefObject<HTMLElement>,
  scrollRoot: HTMLElement | null
): string | null {
  const [src, setSrc] = useState<string | null>(null)

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    let cancelled = false
    setSrc(null)

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return
        observer.disconnect()
        void loadFolderPreview(folderPath)
          .then((url) => {
            if (!cancelled) setSrc(url)
          })
          .catch(() => {
            // no preview - the plain folder icon stays
          })
      },
      { root: scrollRoot, rootMargin: '240px' }
    )

    observer.observe(element)
    return () => {
      cancelled = true
      observer.disconnect()
    }
  }, [folderPath, elementRef, scrollRoot])

  return src
}
