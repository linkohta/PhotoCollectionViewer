import { useEffect, useMemo, useRef, useState } from 'react'
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
  onMoveToUnnecessary: () => void
}

export function ImageViewer({
  image,
  allImages,
  index,
  total,
  onClose,
  onNavigate,
  onMoveToUnnecessary
}: ImageViewerProps): JSX.Element {
  const isVideo = image.mediaType === 'video'
  const viewerRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  const onNavigateRef = useRef(onNavigate)
  const onMoveToUnnecessaryRef = useRef(onMoveToUnnecessary)
  onCloseRef.current = onClose
  onNavigateRef.current = onNavigate
  onMoveToUnnecessaryRef.current = onMoveToUnnecessary

  const fullUrl = useMemo(() => toLocalFileUrl(image.path), [image.path])
  const [videoError, setVideoError] = useState(false)

  const transform = useImageTransform(image.path)
  const { imageSrc, isFullLoaded } = useProgressiveImageSource({
    image,
    allImages,
    index,
    fullUrl,
    onNaturalSize: transform.setNaturalSize
  })

  useEffect(() => {
    setVideoError(false)
  }, [image.path])

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
          if (isVideo) break
          event.preventDefault()
          transform.zoom(0.2)
          break
        case '-':
          if (isVideo) break
          event.preventDefault()
          transform.zoom(-0.2)
          break
        case '0':
          if (!isVideo) transform.resetView()
          break
        case 'f':
        case 'F':
          if (!isVideo) transform.fitToScreen()
          break
        case 'r':
          if (!isVideo) transform.rotateClockwise()
          break
        case 'R':
          if (!isVideo) transform.rotateCounterClockwise()
          break
        case 'Delete':
          event.preventDefault()
          onMoveToUnnecessaryRef.current()
          break
        default:
          break
      }
    })
  }, [transform, isVideo])

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
        showLoadingBadge={!isVideo && !isFullLoaded && !!imageSrc}
        hideZoomControls={isVideo}
        onClose={onClose}
        onNavigate={onNavigate}
        onFit={transform.fitToScreen}
        onZoomIn={() => transform.zoom(0.2)}
        onZoomOut={() => transform.zoom(-0.2)}
        onRotate={transform.rotateClockwise}
        onReset={transform.resetView}
        onMoveToUnnecessary={onMoveToUnnecessary}
      />

      {isVideo ? (
        <div className="viewer-canvas">
          {videoError ? (
            <div className="viewer-loading">
              <span>この動画は再生できませんでした（未対応の形式の可能性があります）</span>
            </div>
          ) : (
            <video
              key={image.path}
              src={imageSrc ?? undefined}
              className="viewer-video"
              controls
              autoPlay
              onError={() => setVideoError(true)}
            />
          )}
        </div>
      ) : (
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
      )}
    </div>
  )
}
