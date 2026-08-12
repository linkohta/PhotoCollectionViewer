import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ImageFile } from '../../../preload/index'
import { isTypingTarget, preloadImage } from '../utils/imagePreload'
import { registerViewerKeyboardHandler } from '../utils/viewerKeyboard'
import { toLocalFileUrl } from '../utils/files'

interface ImageViewerProps {
  image: ImageFile
  allImages: ImageFile[]
  index: number
  total: number
  onClose: () => void
  onNavigate: (direction: -1 | 1) => void
}

type FitMode = 'fit' | 'actual' | 'custom'

interface Size {
  width: number
  height: number
}

const PREVIEW_THUMB_SIZE = 960

function getRotatedSize(size: Size, rotation: number): Size {
  const quarterTurns = ((rotation % 360) + 360) % 360
  if (quarterTurns === 90 || quarterTurns === 270) {
    return { width: size.height, height: size.width }
  }
  return size
}

function getFitScale(imageSize: Size, containerSize: Size): number {
  if (imageSize.width === 0 || imageSize.height === 0) return 1
  if (containerSize.width === 0 || containerSize.height === 0) return 1
  return Math.min(
    containerSize.width / imageSize.width,
    containerSize.height / imageSize.height
  )
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
  const containerRef = useRef<HTMLDivElement>(null)
  const loaderRef = useRef<HTMLImageElement | null>(null)
  const onCloseRef = useRef(onClose)
  const onNavigateRef = useRef(onNavigate)

  const [fitMode, setFitMode] = useState<FitMode>('fit')
  const [zoomFactor, setZoomFactor] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const dragStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 })
  const [rotation, setRotation] = useState(0)
  const [naturalSize, setNaturalSize] = useState<Size | null>(null)
  const [containerSize, setContainerSize] = useState<Size>({ width: 0, height: 0 })
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [isFullLoaded, setIsFullLoaded] = useState(false)

  onCloseRef.current = onClose
  onNavigateRef.current = onNavigate

  const fullUrl = useMemo(() => toLocalFileUrl(image.path), [image.path])

  const resetView = useCallback(() => {
    setFitMode('fit')
    setZoomFactor(1)
    setOffset({ x: 0, y: 0 })
    setRotation(0)
  }, [])

  const zoom = useCallback((delta: number) => {
    setFitMode('custom')
    setZoomFactor((current) => Math.min(Math.max(current + delta, 0.1), 10))
  }, [])

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
          zoom(0.2)
          break
        case '-':
          event.preventDefault()
          zoom(-0.2)
          break
        case '0':
          resetView()
          break
        case 'f':
        case 'F':
          setFitMode('fit')
          setZoomFactor(1)
          setOffset({ x: 0, y: 0 })
          break
        case 'r':
          setRotation((r) => (r + 90) % 360)
          break
        case 'R':
          setRotation((r) => (r - 90 + 360) % 360)
          break
        default:
          break
      }
    })
  }, [zoom, resetView])

  useEffect(() => {
    let cancelled = false

    resetView()
    setNaturalSize(null)
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
        setNaturalSize({ width: loader.naturalWidth, height: loader.naturalHeight })
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
  }, [image.path, image.modified, image.size, fullUrl, resetView])

  useEffect(() => {
    if (allImages.length <= 1) return

    const nextIndex = (index + 1) % allImages.length
    const neighbor = allImages[nextIndex]
    if (neighbor) {
      preloadImage(toLocalFileUrl(neighbor.path))
    }
  }, [allImages, index])

  useEffect(() => {
    const element = containerRef.current
    if (!element) return

    const updateSize = (): void => {
      setContainerSize({
        width: element.clientWidth,
        height: element.clientHeight
      })
    }

    updateSize()
    const observer = new ResizeObserver(updateSize)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const displayScale = useMemo(() => {
    if (!naturalSize) return 1
    const boundsSize = getRotatedSize(naturalSize, rotation)
    const fitScale = getFitScale(boundsSize, containerSize)

    if (fitMode === 'actual') {
      return Math.min(1, fitScale)
    }
    if (fitMode === 'fit') {
      return fitScale
    }
    return fitScale * zoomFactor
  }, [naturalSize, rotation, containerSize, fitMode, zoomFactor])

  const displaySize = useMemo(() => {
    if (!naturalSize) return null
    return {
      width: Math.max(1, Math.round(naturalSize.width * displayScale)),
      height: Math.max(1, Math.round(naturalSize.height * displayScale))
    }
  }, [naturalSize, displayScale])

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault()
      const delta = e.deltaY > 0 ? -0.15 : 0.15
      zoom(delta)
    },
    [zoom]
  )

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      viewerRef.current?.focus({ preventScroll: true })
      if (fitMode === 'fit') return
      setDragging(true)
      dragStart.current = {
        x: e.clientX,
        y: e.clientY,
        ox: offset.x,
        oy: offset.y
      }
    },
    [fitMode, offset]
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragging) return
      setOffset({
        x: dragStart.current.ox + (e.clientX - dragStart.current.x),
        y: dragStart.current.oy + (e.clientY - dragStart.current.y)
      })
    },
    [dragging]
  )

  const handleMouseUp = useCallback(() => {
    setDragging(false)
  }, [])

  const handleDoubleClick = useCallback(() => {
    if (fitMode === 'fit') {
      setFitMode('actual')
      setZoomFactor(1)
      setOffset({ x: 0, y: 0 })
    } else {
      setFitMode('fit')
      setZoomFactor(1)
      setOffset({ x: 0, y: 0 })
    }
  }, [fitMode])

  const handleImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget
    if (img.naturalWidth > 0 && img.naturalHeight > 0 && !naturalSize) {
      setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight })
    }
  }, [naturalSize])

  return (
    <div
      ref={viewerRef}
      className="viewer"
      tabIndex={0}
      onMouseDown={() => viewerRef.current?.focus({ preventScroll: true })}
    >
      <div className="viewer-toolbar">
        <button
          type="button"
          className="btn"
          onClick={onClose}
          title="一覧に戻る (Esc)"
          tabIndex={-1}
        >
          ← 一覧
        </button>

        <div className="viewer-nav">
          <button
            type="button"
            className="btn"
            onClick={() => onNavigate(-1)}
            disabled={total <= 1}
            title="前の画像 (←) ※最初で押すと最後へ"
            tabIndex={-1}
          >
            ‹
          </button>
          <span className="viewer-counter">
            {index + 1} / {total}
          </span>
          <button
            type="button"
            className="btn"
            onClick={() => onNavigate(1)}
            disabled={total <= 1}
            title="次の画像 (→) ※最後で押すと最初へ"
            tabIndex={-1}
          >
            ›
          </button>
        </div>

        <div className="viewer-controls">
          <button
            type="button"
            className={`btn ${fitMode === 'fit' ? 'active' : ''}`}
            onClick={() => {
              setFitMode('fit')
              setZoomFactor(1)
              setOffset({ x: 0, y: 0 })
            }}
            title="画面に合わせる (F)"
            tabIndex={-1}
          >
            フィット
          </button>
          <button type="button" className="btn" onClick={() => zoom(0.2)} title="拡大 (+)" tabIndex={-1}>
            ＋
          </button>
          <button type="button" className="btn" onClick={() => zoom(-0.2)} title="縮小 (-)" tabIndex={-1}>
            －
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => setRotation((r) => (r + 90) % 360)}
            title="右回転 (R)"
            tabIndex={-1}
          >
            ↻
          </button>
          <button type="button" className="btn" onClick={resetView} title="リセット (0)" tabIndex={-1}>
            リセット
          </button>
        </div>

        <span className="viewer-filename" title={image.path}>
          {image.name}
          {!isFullLoaded && imageSrc && (
            <span className="viewer-loading-badge"> 読み込み中…</span>
          )}
        </span>
      </div>

      <div
        ref={containerRef}
        className={`viewer-canvas ${fitMode !== 'fit' ? 'pannable' : ''}`}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleDoubleClick}
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
              transform: `translate(${offset.x}px, ${offset.y}px) rotate(${rotation}deg)`
            }}
          >
            <img
              key={image.path}
              src={imageSrc}
              alt={image.name}
              className={`viewer-image ${isFullLoaded ? 'loaded' : 'preview'}`}
              style={
                displaySize
                  ? { width: displaySize.width, height: displaySize.height }
                  : { maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }
              }
              draggable={false}
              decoding="async"
              onLoad={handleImageLoad}
            />
          </div>
        )}
      </div>
    </div>
  )
}
