import { useEffect, useMemo, useRef, useState } from 'react'
import type { ImageFile } from '../../../shared/types'
import { isTypingTarget } from '../utils/keyboard'
import { mapViewerKey, type ViewerCommand } from '../utils/viewerKeys'
import { useKeyboardHandler } from '../hooks/useKeyboardHandler'
import { toLocalFileUrl } from '../../../shared/localFileUrl'
import { useImageTransform } from '../hooks/useImageTransform'
import { useNeighborPreload } from '../hooks/useNeighborPreload'
import { useViewerImageSource } from '../hooks/useViewerImageSource'
import { ImageViewerToolbar } from './ImageViewerToolbar'

interface ImageViewerProps {
  image: ImageFile
  allImages: ImageFile[]
  index: number
  total: number
  onClose: () => void
  onNavigate: (direction: -1 | 1) => void
  onMoveToTrash: () => void
}

export function ImageViewer({
  image,
  allImages,
  index,
  total,
  onClose,
  onNavigate,
  onMoveToTrash
}: ImageViewerProps): JSX.Element {
  const isVideo = image.mediaType === 'video'
  const viewerRef = useRef<HTMLDivElement>(null)

  const fullUrl = useMemo(() => toLocalFileUrl(image.path), [image.path])
  const [videoError, setVideoError] = useState(false)

  const transform = useImageTransform(image.path)
  const { imageSrc, isFullLoaded } = useViewerImageSource({
    image,
    fullUrl,
    onNaturalSize: transform.setNaturalSize
  })
  useNeighborPreload(allImages, index)

  useEffect(() => {
    setVideoError(false)
  }, [image.path])

  useEffect(() => {
    viewerRef.current?.focus({ preventScroll: true })
  }, [image.path])

  const runCommand = (command: ViewerCommand): void => {
    switch (command) {
      case 'close':
        return onClose()
      case 'previous':
        return onNavigate(-1)
      case 'next':
        return onNavigate(1)
      case 'zoomIn':
        return transform.zoom(0.2)
      case 'zoomOut':
        return transform.zoom(-0.2)
      case 'resetView':
        return transform.resetView()
      case 'fit':
        return transform.fitToScreen()
      case 'actualSize':
        return transform.showActualSize()
      case 'rotateClockwise':
        return transform.rotateClockwise()
      case 'rotateCounterClockwise':
        return transform.rotateCounterClockwise()
      case 'moveToTrash':
        return onMoveToTrash()
    }
  }

  useKeyboardHandler((event) => {
    if (isTypingTarget(event.target)) return

    const binding = mapViewerKey(event.key, isVideo)
    if (!binding) return
    if (binding.preventDefault) event.preventDefault()
    if (binding.stopPropagation) event.stopImmediatePropagation()
    runCommand(binding.command)
  })

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
        onActualSize={transform.showActualSize}
        onZoomIn={() => transform.zoom(0.2)}
        onZoomOut={() => transform.zoom(-0.2)}
        onRotate={transform.rotateClockwise}
        onReset={transform.resetView}
        onMoveToTrash={onMoveToTrash}
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
