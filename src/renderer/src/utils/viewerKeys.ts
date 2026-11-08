export type ViewerCommand =
  | 'close'
  | 'previous'
  | 'next'
  | 'zoomIn'
  | 'zoomOut'
  | 'resetView'
  | 'fit'
  | 'actualSize'
  | 'rotateClockwise'
  | 'rotateCounterClockwise'
  | 'moveToTrash'

export interface ViewerKeyBinding {
  command: ViewerCommand
  // Only for images: a video ignores the key (and leaves it to the browser).
  imageOnly?: boolean
  preventDefault?: boolean
  // Keeps the key from other keydown listeners, too.
  stopPropagation?: boolean
}

// The viewer's keyboard shortcuts, by KeyboardEvent.key.
export const VIEWER_KEY_BINDINGS: Readonly<Record<string, ViewerKeyBinding>> = {
  Escape: { command: 'close', preventDefault: true, stopPropagation: true },
  ArrowLeft: { command: 'previous', preventDefault: true, stopPropagation: true },
  ArrowRight: { command: 'next', preventDefault: true, stopPropagation: true },
  '+': { command: 'zoomIn', imageOnly: true, preventDefault: true },
  '=': { command: 'zoomIn', imageOnly: true, preventDefault: true },
  '-': { command: 'zoomOut', imageOnly: true, preventDefault: true },
  '0': { command: 'resetView', imageOnly: true },
  f: { command: 'fit', imageOnly: true },
  F: { command: 'fit', imageOnly: true },
  '1': { command: 'actualSize', imageOnly: true },
  r: { command: 'rotateClockwise', imageOnly: true },
  R: { command: 'rotateCounterClockwise', imageOnly: true },
  Delete: { command: 'moveToTrash', preventDefault: true }
}

// What a key does in the viewer, or null when it does nothing there.
export function mapViewerKey(key: string, isVideo: boolean): ViewerKeyBinding | null {
  const binding = VIEWER_KEY_BINDINGS[key]
  if (!binding || (binding.imageOnly && isVideo)) return null
  return binding
}
