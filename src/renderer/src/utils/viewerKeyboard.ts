type ViewerKeyboardHandler = (event: KeyboardEvent) => void

let activeHandler: ViewerKeyboardHandler | null = null

export function registerViewerKeyboardHandler(handler: ViewerKeyboardHandler): () => void {
  activeHandler = handler
  return () => {
    if (activeHandler === handler) {
      activeHandler = null
    }
  }
}

export function installViewerKeyboardListener(): () => void {
  const onKeyDown = (event: KeyboardEvent): void => {
    activeHandler?.(event)
  }

  document.addEventListener('keydown', onKeyDown, true)
  return () => document.removeEventListener('keydown', onKeyDown, true)
}
