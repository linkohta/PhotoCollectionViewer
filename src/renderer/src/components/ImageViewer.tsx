import { useEffect, useMemo, useRef } from 'react'
import type { ImageFile } from '../../../preload/index'
import { isTypingTarget } from '../utils/imagePreload'
import { registerViewerKeyboardHandler } from '../utils/viewerKeyboard'
import { toLocalFileUrl } from '../utils/files'
import { useImageTransform } from '../hooks/useImageTransform'
import { useProgressiveImageSource } from '../hooks/useProgressiveImageSource'
import { ImageViewerToolbar } from './ImageViewerToolbar'

interface ImageViewerProps {
  image: ImageFile
  allImages: ImageFile[]
  index: number
  total: number
  onClose: () => void
  onNavigate: (direction: -1 | 1) => void
}

export function ImageViewer({
  image,
  allImages,
  index,
  total,
  onClose,
  onNavigate
}: ImageViewerProps): JSX.Element {
  const viewerRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  const onNavigateRef = useRef(onNavigate)
  onCloseRef.current = onClose
  onNavigateRef.current = onNavigate

  const fullUrl = useMemo(() => toLocalFileUrl(image.path), [image.path])

  const transform = useImageTransform(image.path)
  const { imageSrc, isFullLoaded } = useProgressiveImageSource({
    image,
    allImages,
    index,
    fullUrl,
    onNaturalSize: transform.setNaturalSize
  })

  useEffect(() => {
    viewerRef.current?.focus({ preventScroll: true })
  }, [image.path])

  useEffect(() => {
    return registerViewerKeyboardHandler((event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return

      switch (event.key) {
        case 'Escape':
          event.preventDefault()
          event.stopImmediatePropagation()
          onCloseRef.current()
          break
        case 'ArrowLeft':
          event.preventDefault()
          event.stopImmediatePropagation()
          onNavigateRef.current(-1)
          break
        case 'ArrowRight':
          event.preventDefault()
          event.stopImmediatePropagation()
          onNavigateRef.current(1)
          break
        case '+':
        case '=':
          event.preventDefault()
          transform.zoom(0.2)
          break
        case '-':
          event.preventDefault()
          transform.zoom(-0.2)
          break
        case '0':
          transform.resetView()
          break
        case 'f':
        case 'F':
          transform.fitToScreen()
          break
        case 'r':
          transform.rotateClockwise()
          break
        case 'R':
          transform.rotateCounterClockwise()
          break
        default:
          break
      }
    })
  }, [transform])

  return (
    <div
      ref={viewerRef}
      className="viewer"
      tabIndex={0}
      onMouseDown={() => viewerRef.current?.focus({ preventScroll: true })}
    >
      <ImageViewerToolbar
        fitMode={transform.fitMode}
        index={index}
        total={total}
        imageName={image.name}
        imagePath={image.path}
        showLoadingBadge={!isFullLoaded && !!imageSrc}
        onClose={onClose}
        onNavigate={onNavigate}
        onFit={transform.fitToScreen}
        onZoomIn={() => transform.zoom(0.2)}
        onZoomOut={() => transform.zoom(-0.2)}
        onRotate={transform.rotateClockwise}
        onReset={transform.resetView}
      />

      <div
        ref={transform.containerRef}
        className={`viewer-canvas ${transform.fitMode !== 'fit' ? 'pannable' : ''}`}
        onWheel={transform.handleWheel}
        onMouseDown={(e) => {
          viewerRef.current?.focus({ preventScroll: true })
          transform.handleMouseDown(e)
        }}
        onMouseMove={transform.handleMouseMove}
        onMouseUp={transform.handleMouseUp}
        onMouseLeave={transform.handleMouseUp}
        onDoubleClick={transform.toggleActualSize}
      >
        {!imageSrc && (
          <div className="viewer-loading">
            <span className="tab-spinner" aria-hidden="true" />
          </div>
        )}

        {imageSrc && (
          <div
            className="viewer-image-frame"
            style={{
              transform: `translate(${transform.offset.x}px, ${transform.offset.y}px) rotate(${transform.rotation}deg)`
            }}
          >
            <img
              key={image.path}
              src={imageSrc}
              alt={image.name}
              className={`viewer-image ${isFullLoaded ? 'loaded' : 'preview'}`}
              style={
                transform.displaySize
                  ? { width: transform.displaySize.width, height: transform.displaySize.height }
                  : { maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }
              }
              draggable={false}
              decoding="async"
              onLoad={transform.handleImageLoad}
            />
          </div>
        )}
      </div>
    </div>
  )
}
