import { useCallback, useState } from 'react'
import type { RefObject } from 'react'
import type { ImageFile } from '../../../shared/types'
import { toLocalFileUrl } from '../../../shared/localFileUrl'
import { loadGridThumbnail } from '../utils/thumbnailSource'
import { useInView } from './useInView'

interface ThumbnailSource {
  src: string | null
  loading: boolean
  // When the thumbnail fails to show, falls back to the whole image.
  handleImageError: () => void
  handleVideoError: () => void
}

// What an image's grid card shows, loaded once the card scrolls near the
// viewport.
export function useThumbnailSource(
  image: ImageFile,
  elementRef: RefObject<HTMLElement>,
  scrollRoot: HTMLElement | null
): ThumbnailSource {
  const isVideo = image.mediaType === 'video'
  const [src, setSrc] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useInView(
    elementRef,
    scrollRoot,
    `${image.mediaType}|${image.path}|${image.modified}|${image.size}`,
    () => {
      // Videos have no sharp-generated thumbnail - the local-file:// URL is
      // handed straight to a <video preload="metadata"> element, which
      // renders the first frame itself.
      if (isVideo) {
        setSrc(toLocalFileUrl(image.path))
        return
      }

      setLoading(true)
      void (async () => {
        try {
          const url = await loadGridThumbnail(window.photoCollection, image)
          if (url) setSrc(url)
        } finally {
          setLoading(false)
        }
      })()
    }
  )

  const handleImageError = useCallback(() => {
    if (isVideo) return
    void window.photoCollection.getImageDataUrl(image.path).then((dataUrl) => {
      if (dataUrl) {
        setSrc(dataUrl)
      }
    })
  }, [isVideo, image.path])

  const handleVideoError = useCallback(() => setSrc(null), [])

  return { src, loading, handleImageError, handleVideoError }
}
