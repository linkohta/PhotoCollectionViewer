type ViewerKeyboardHandler = (event: KeyboardEvent) => void

let activeHandler: ViewerKeyboardHandler | null = null

// How many context menus are open. While any is, the grid / viewer handler
// gets no keys, so Esc only closes the menu instead of also going up a folder
// or closing the viewer behind it.
let openMenuCount = 0

export function registerViewerKeyboardHandler(handler: ViewerKeyboardHandler): () => void {
  activeHandler = handler
  return () => {
    if (activeHandler === handler) {
      activeHandler = null
    }
  }
}

// Call while a context menu is shown; the returned function ends it.
export function suspendViewerKeyboardHandler(): () => void {
  openMenuCount++
  let ended = false
  return () => {
    if (ended) return
    ended = true
    openMenuCount--
  }
}

export function installViewerKeyboardListener(): () => void {
  const onKeyDown = (event: KeyboardEvent): void => {
    if (openMenuCount > 0) return
    activeHandler?.(event)
  }

  document.addEventListener('keydown', onKeyDown, true)
  return () => document.removeEventListener('keydown', onKeyDown, true)
}
