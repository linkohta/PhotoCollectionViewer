// What a key does in the thumbnail grid. Every action also stops the browser's
// own handling of the key.
export type GridKeyAction =
  | { type: 'goBack' }
  | { type: 'goUp' }
  // Highlight the card at this position in the grid's order.
  | { type: 'highlight'; index: number }
  // Highlight the closest card in the row below (1) or above (-1), which
  // depends on the layout on screen.
  | { type: 'highlightRow'; direction: 1 | -1 }
  | { type: 'open'; index: number }

export interface GridKeyContext {
  canGoBack: boolean
  canGoUp: boolean
  itemCount: number
  // Position of the highlighted card, or -1 when none is.
  currentIndex: number
}

// Arrow keys move the highlight (left/right wrap around), Enter opens the
// highlighted card, Esc goes up a folder and Backspace / Alt+Left go back -
// like the "↑" and "←" buttons. Returns null for keys the grid leaves alone.
export function mapGridKey(
  event: { key: string; altKey: boolean },
  { canGoBack, canGoUp, itemCount, currentIndex }: GridKeyContext
): GridKeyAction | null {
  if (event.key === 'Backspace' || (event.altKey && event.key === 'ArrowLeft')) {
    return canGoBack ? { type: 'goBack' } : null
  }

  if (event.key === 'Escape') {
    return canGoUp ? { type: 'goUp' } : null
  }

  if (itemCount === 0) return null

  switch (event.key) {
    case 'ArrowRight':
      return { type: 'highlight', index: (currentIndex + 1) % itemCount }
    case 'ArrowLeft':
      return { type: 'highlight', index: currentIndex <= 0 ? itemCount - 1 : currentIndex - 1 }
    case 'ArrowDown':
      return currentIndex < 0
        ? { type: 'highlight', index: 0 }
        : { type: 'highlightRow', direction: 1 }
    case 'ArrowUp':
      return currentIndex < 0
        ? { type: 'highlight', index: itemCount - 1 }
        : { type: 'highlightRow', direction: -1 }
    case 'Enter':
      return currentIndex < 0 ? null : { type: 'open', index: currentIndex }
    default:
      return null
  }
}
