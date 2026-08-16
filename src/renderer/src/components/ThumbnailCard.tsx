import { useCallback, useEffect, useRef, useState } from 'react'
import type { MouseEvent, RefObject } from 'react'
import type { ImageFile } from '../../../preload/index'
import { formatFileSize, toLocalFileUrl } from '../utils/files'
import { RenameInput } from './RenameInput'

interface ThumbnailCardProps {
  image: ImageFile
  index: number
  scrollRoot: HTMLElement | null
  onSelect: (index: number) => void
  onContextMenu: (event: MouseEvent, image: ImageFile) => void
  isRenaming: boolean
  onRenameSubmit: (newName: string) => Promise<void>
  onRenameCancel: () => void
}

export function ThumbnailCard({
  image,
  index,
  scrollRoot,
  onSelect,
  onContextMenu,
  isRenaming,
  onRenameSubmit,
  onRenameCancel
}: ThumbnailCardProps): JSX.Element {
  const cardRef = useRef<HTMLElement>(null)
  const [src, setSrc] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const loadThumbnail = useCallback(async (): Promise<void> => {
    setLoading(true)
    try {
      const path = await window.photoCollection.getThumbnailPath(
        image.path,
        200,
        image.modified,
        image.size
      )
      if (path) {
        setSrc(toLocalFileUrl(path))
        return
      }

      const dataUrl = await window.photoCollection.getImageDataUrl(image.path)
      if (dataUrl) {
        setSrc(dataUrl)
      }
    } finally {
      setLoading(false)
    }
  }, [image.path, image.modified, image.size])

  useEffect(() => {
    const element = cardRef.current
    if (!element) return

    let loaded = false

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting || loaded) return
        loaded = true
        observer.disconnect()
        void loadThumbnail()
      },
      {
        root: scrollRoot,
        rootMargin: '240px'
      }
    )

    observer.observe(element)
    return () => {
      observer.disconnect()
    }
  }, [loadThumbnail, scrollRoot])

  const handleImageError = useCallback(() => {
    void window.photoCollection.getImageDataUrl(image.path).then((dataUrl) => {
      if (dataUrl) {
        setSrc(dataUrl)
      }
    })
  }, [image.path])

  const imageWrap = (
    <div className="thumbnail-image-wrap">
      {loading && <div className="thumbnail-placeholder" />}
      {src && (
        <img
          src={src}
          alt={image.name}
          className="thumbnail-image"
          loading="lazy"
          onError={handleImageError}
        />
      )}
      {!loading && !src && <div className="thumbnail-fallback">🖼</div>}
    </div>
  )

  if (isRenaming) {
    return (
      <div ref={cardRef as RefObject<HTMLDivElement>} className="thumbnail-card renaming">
        {imageWrap}
        <div className="thumbnail-info">
          <RenameInput initialName={image.name} onSubmit={onRenameSubmit} onCancel={onRenameCancel} />
          <span className="thumbnail-size">{formatFileSize(image.size)}</span>
        </div>
      </div>
    )
  }

  return (
    <button
      ref={cardRef as RefObject<HTMLButtonElement>}
      type="button"
      className="thumbnail-card"
      onClick={() => onSelect(index)}
      onContextMenu={(event) => onContextMenu(event, image)}
      title={image.name}
    >
      {imageWrap}
      <div className="thumbnail-info">
        <span className="thumbnail-name">{image.name}</span>
        <span className="thumbnail-size">{formatFileSize(image.size)}</span>
      </div>
    </button>
  )
}
