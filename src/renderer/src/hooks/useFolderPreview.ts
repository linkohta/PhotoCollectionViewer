import { useEffect, useState } from 'react'
import type { RefObject } from 'react'
import { loadFolderPreview } from '../utils/thumbnailSource'
import { useInView } from './useInView'

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
    setSrc(null)
  }, [folderPath, elementRef, scrollRoot])

  useInView(elementRef, scrollRoot, folderPath, () => {
    let cancelled = false
    void loadFolderPreview(window.photoCollection, folderPath)
      .then((url) => {
        if (!cancelled) setSrc(url)
      })
      .catch(() => {
        // no preview - the plain folder icon stays
      })
    return () => {
      cancelled = true
    }
  })

  return src
}
