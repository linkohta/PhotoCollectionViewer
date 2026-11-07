import { useCallback, useEffect, useRef, useState } from 'react'
import { getFitScale, getRotatedSize, type Size } from '../utils/viewerGeometry'

export type FitMode = 'fit' | 'actual' | 'custom'

export function useImageTransform(imagePath: string) {
  // Kept as state (set through a callback ref) rather than in a ref object, so
  // the size observer below follows the canvas element: ImageViewer swaps it
  // out while a video is shown and mounts a new one for the next image.
  const [container, setContainer] = useState<HTMLDivElement | null>(null)
  const dragStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 })

  const [fitMode, setFitMode] = useState<FitMode>('fit')
  const [zoomFactor, setZoomFactor] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const [rotation, setRotation] = useState(0)
  const [naturalSize, setNaturalSize] = useState<Size | null>(null)
  const [containerSize, setContainerSize] = useState<Size>({ width: 0, height: 0 })

  const resetView = useCallback(() => {
    setFitMode('fit')
    setZoomFactor(1)
    setOffset({ x: 0, y: 0 })
    setRotation(0)
  }, [])

  const fitToScreen = useCallback(() => {
    setFitMode('fit')
    setZoomFactor(1)
    setOffset({ x: 0, y: 0 })
  }, [])

  const showActualSize = useCallback(() => {
    setFitMode('actual')
    setZoomFactor(1)
    setOffset({ x: 0, y: 0 })
  }, [])

  const fitScale = naturalSize
    ? getFitScale(getRotatedSize(naturalSize, rotation), containerSize)
    : 1

  // zoomFactor is relative to the fit scale. When zooming from actual-size
  // mode, start from the factor equivalent to 1:1 so the zoom continues from
  // what's on screen instead of jumping back to near the fitted size. The
  // upper bound is widened to that factor too, so for very tall/wide images
  // (where 1:1 is already beyond 10x the fit scale) zooming in never shrinks.
  const zoom = useCallback(
    (delta: number) => {
      const actualFactor = 1 / fitScale
      const maxFactor = Math.max(10, actualFactor)
      const startFromActual = fitMode === 'actual'
      setFitMode('custom')
      setZoomFactor((current) =>
        Math.min(Math.max((startFromActual ? actualFactor : current) + delta, 0.1), maxFactor)
      )
    },
    [fitMode, fitScale]
  )

  const toggleActualSize = useCallback(() => {
    setFitMode((current) => (current === 'fit' ? 'actual' : 'fit'))
    setZoomFactor(1)
    setOffset({ x: 0, y: 0 })
  }, [])

  const rotateClockwise = useCallback(() => setRotation((r) => (r + 90) % 360), [])
  const rotateCounterClockwise = useCallback(() => setRotation((r) => (r - 90 + 360) % 360), [])

  useEffect(() => {
    resetView()
    setNaturalSize(null)
  }, [imagePath, resetView])

  useEffect(() => {
    if (!container) {
      setContainerSize({ width: 0, height: 0 })
      return
    }

    const updateSize = (): void => {
      setContainerSize({ width: container.clientWidth, height: container.clientHeight })
    }

    updateSize()
    const observer = new ResizeObserver(updateSize)
    observer.observe(container)
    return () => observer.disconnect()
  }, [container])

  const displayScale = (() => {
    if (!naturalSize) return 1
    if (fitMode === 'actual') return 1
    if (fitMode === 'fit') return fitScale
    return fitScale * zoomFactor
  })()

  // Only produce an explicit pixel size once the container has actually been
  // measured. Before the first ResizeObserver callback fires (e.g. right
  // after regaining focus from minimized, where layout hasn't settled yet)
  // containerSize is {0, 0}, which makes getFitScale fall back to a scale of
  // 1 - i.e. the image's raw natural pixel size with no fitting applied at
  // all, which renders as a huge, "zoomed in" image until the next resize
  // observation corrects it. Falling back to the CSS contain/max-size rule
  // (see ImageViewer.tsx) instead keeps the image properly bounded the whole
  // time.
  const containerMeasured = containerSize.width > 0 && containerSize.height > 0
  const displaySize =
    naturalSize && containerMeasured
      ? {
          width: Math.max(1, Math.round(naturalSize.width * displayScale)),
          height: Math.max(1, Math.round(naturalSize.height * displayScale))
        }
      : null

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault()
      zoom(e.deltaY > 0 ? -0.15 : 0.15)
    },
    [zoom]
  )

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (fitMode === 'fit') return
      setDragging(true)
      dragStart.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y }
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

  const handleMouseUp = useCallback(() => setDragging(false), [])

  // Only fills in a size while none is known yet (e.g. from the preview). The
  // updater form matters: the full image's size, reported through
  // setNaturalSize, can be queued just before this runs for the preview, and a
  // "no size yet" check read from the last render would then overwrite it with
  // the preview's smaller size.
  const handleImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = e.currentTarget
    if (naturalWidth > 0 && naturalHeight > 0) {
      setNaturalSize((current) => current ?? { width: naturalWidth, height: naturalHeight })
    }
  }, [])

  return {
    containerRef: setContainer,
    fitMode,
    offset,
    rotation,
    displayScale,
    displaySize,
    setNaturalSize,
    resetView,
    fitToScreen,
    showActualSize,
    zoom,
    toggleActualSize,
    rotateClockwise,
    rotateCounterClockwise,
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleImageLoad
  }
}
