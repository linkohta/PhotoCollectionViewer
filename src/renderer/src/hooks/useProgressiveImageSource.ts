import { useEffect, useRef, useState } from 'react'
import type { ImageFile } from '../../../preload/index'
import { preloadImage } from '../utils/imagePreload'
import { toLocalFileUrl } from '../utils/files'
import type { Size } from '../utils/viewerGeometry'

const PREVIEW_THUMB_SIZE = 960

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
    if (allImages.length <= 1) return

    const total = allImages.length
    const neighborOffsets = [1, 2, -1]

    for (const offset of neighborOffsets) {
      const neighborIndex = (index + offset + total) % total
      const neighbor = allImages[neighborIndex]
      if (neighbor) {
        preloadImage(toLocalFileUrl(neighbor.path))
      }
    }
  }, [allImages, index])

  return { imageSrc, isFullLoaded }
}
