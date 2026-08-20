import { useCallback, useEffect, useRef, useState } from 'react'
import type { MouseEvent, RefObject } from 'react'
import type { ImageFile } from '../../../preload/index'
import { formatFileSize, toLocalFileUrl } from '../utils/files'
import { RenameInput } from './RenameInput'

interface ThumbnailCardProps {
  image: ImageFile
  index: number
  scrollRoot: HTMLElement | null
  isHighlighted: boolean
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
  isHighlighted,
  onSelect,
  onContextMenu,
  isRenaming,
  onRenameSubmit,
  onRenameCancel
}: ThumbnailCardProps): JSX.Element {
  const isVideo = image.mediaType === 'video'
  const cardRef = useRef<HTMLElement>(null)
  const [src, setSrc] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const loadThumbnail = useCallback(async (): Promise<void> => {
    // Videos have no sharp-generated thumbnail - the local-file:// URL is
    // handed straight to a <video preload="metadata"> element below, which
    // renders the first frame itself.
    if (isVideo) {
      setSrc(toLocalFileUrl(image.path))
      return
    }

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
  }, [isVideo, image.path, image.modified, image.size])

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
    if (isVideo) return
    void window.photoCollection.getImageDataUrl(image.path).then((dataUrl) => {
      if (dataUrl) {
        setSrc(dataUrl)
      }
    })
  }, [isVideo, image.path])

  const handleVideoError = useCallback(() => setSrc(null), [])

  const imageWrap = (
    <div className="thumbnail-image-wrap">
      {loading && <div className="thumbnail-placeholder" />}
      {src && isVideo && (
        <>
          <video src={src} className="thumbnail-image" preload="metadata" muted onError={handleVideoError} />
          <span className="thumbnail-video-badge" aria-hidden="true">▶</span>
        </>
      )}
      {src && !isVideo && (
        <img
          src={src}
          alt={image.name}
          className="thumbnail-image"
          loading="lazy"
          onError={handleImageError}
        />
      )}
      {!loading && !src && <div className="thumbnail-fallback">{isVideo ? '🎬' : '🖼'}</div>}
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
      className={`thumbnail-card ${isHighlighted ? 'highlighted' : ''}`}
      data-path={image.path}
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
