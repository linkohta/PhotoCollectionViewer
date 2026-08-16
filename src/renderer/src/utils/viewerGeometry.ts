export interface Size {
  width: number
  height: number
}

export function getRotatedSize(size: Size, rotation: number): Size {
  const quarterTurns = ((rotation % 360) + 360) % 360
  if (quarterTurns === 90 || quarterTurns === 270) {
    return { width: size.height, height: size.width }
  }
  return size
}

export function getFitScale(imageSize: Size, containerSize: Size): number {
  if (imageSize.width === 0 || imageSize.height === 0) return 1
  if (containerSize.width === 0 || containerSize.height === 0) return 1
  return Math.min(containerSize.width / imageSize.width, containerSize.height / imageSize.height)
}
