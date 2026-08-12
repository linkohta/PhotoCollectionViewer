import { useCallback, useEffect, useRef, useState } from 'react'
import type { ImageFile } from '../../../preload/index'
import { formatFileSize, toLocalFileUrl } from '../utils/files'

interface ThumbnailCardProps {
  image: ImageFile
  index: number
  onSelect: (index: number) => void
}

export function ThumbnailCard({ image, index, onSelect }: ThumbnailCardProps): JSX.Element {
  const cardRef = useRef<HTMLButtonElement>(null)
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
      { rootMargin: '240px' }
    )

    observer.observe(element)
    return () => {
      observer.disconnect()
      setSrc(null)
    }
  }, [loadThumbnail])

  return (
    <button
      ref={cardRef}
      type="button"
      className="thumbnail-card"
      onClick={() => onSelect(index)}
      title={image.name}
    >
      <div className="thumbnail-image-wrap">
        {loading && <div className="thumbnail-placeholder" />}
        {src && <img src={src} alt={image.name} className="thumbnail-image" loading="lazy" />}
        {!loading && !src && <div className="thumbnail-fallback">🖼</div>}
      </div>
      <div className="thumbnail-info">
        <span className="thumbnail-name">{image.name}</span>
        <span className="thumbnail-size">{formatFileSize(image.size)}</span>
      </div>
    </button>
  )
}
