import { useCallback, useEffect, useRef, useState } from 'react'
import { getFitScale, getRotatedSize, type Size } from '../utils/viewerGeometry'

export type FitMode = 'fit' | 'actual' | 'custom'

export function useImageTransform(imagePath: string) {
  const containerRef = useRef<HTMLDivElement>(null)
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

  const zoom = useCallback((delta: number) => {
    setFitMode('custom')
    setZoomFactor((current) => Math.min(Math.max(current + delta, 0.1), 10))
  }, [])

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
    const element = containerRef.current
    if (!element) return

    const updateSize = (): void => {
      setContainerSize({ width: element.clientWidth, height: element.clientHeight })
    }

    updateSize()
    const observer = new ResizeObserver(updateSize)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const displayScale = (() => {
    if (!naturalSize) return 1
    const boundsSize = getRotatedSize(naturalSize, rotation)
    const fitScale = getFitScale(boundsSize, containerSize)

    if (fitMode === 'actual') return Math.min(1, fitScale)
    if (fitMode === 'fit') return fitScale
    return fitScale * zoomFactor
  })()

  const displaySize = naturalSize
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

  const handleImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const img = e.currentTarget
      if (img.naturalWidth > 0 && img.naturalHeight > 0 && !naturalSize) {
        setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight })
      }
    },
    [naturalSize]
  )

  return {
    containerRef,
    fitMode,
    offset,
    rotation,
    displayScale,
    displaySize,
    setNaturalSize,
    resetView,
    fitToScreen,
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
