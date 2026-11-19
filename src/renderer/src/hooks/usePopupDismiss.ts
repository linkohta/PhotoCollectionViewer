import { useEffect, type RefObject } from 'react'
import { suspendViewerKeyboardHandler } from '../utils/viewerKeyboard'

// Closes a popup (a context menu, a panel) on a click outside it, on Esc and
// on a scroll outside it (a long name scrolls the text box inside a panel).
// Keys pressed while it is open are for the popup, not for the grid or the
// viewer behind it.
export function usePopupDismiss(ref: RefObject<HTMLElement>, onClose: () => void): void {
  useEffect(() => suspendViewerKeyboardHandler(), [])

  useEffect(() => {
    const handleOutside = (event: Event): void => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClose()
      }
    }

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('mousedown', handleOutside)
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('scroll', handleOutside, true)

    return () => {
      window.removeEventListener('mousedown', handleOutside)
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('scroll', handleOutside, true)
    }
  }, [ref, onClose])
}
