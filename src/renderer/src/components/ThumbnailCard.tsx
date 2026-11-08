import { useRef } from 'react'
import type { MouseEvent, RefObject } from 'react'
import type { ImageFile } from '../../../shared/types'
import { useThumbnailSource } from '../hooks/useThumbnailSource'
import { formatFileSize } from '../utils/files'
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
  const { src, loading, handleImageError, handleVideoError } = useThumbnailSource(
    image,
    cardRef,
    scrollRoot
  )

  const imageWrap = (
    <div className="thumbnail-image-wrap">
      {loading && <div className="thumbnail-placeholder" />}
      {src && isVideo && (
        <>
          <video
            src={src}
            className="thumbnail-image"
            preload="metadata"
            muted
            onError={handleVideoError}
          />
          <span className="thumbnail-video-badge" aria-hidden="true">
            ▶
          </span>
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
          <RenameInput
            initialName={image.name}
            onSubmit={onRenameSubmit}
            onCancel={onRenameCancel}
          />
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
