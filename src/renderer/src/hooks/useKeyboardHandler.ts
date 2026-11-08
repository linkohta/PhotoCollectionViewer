import { useEffect } from 'react'
import { registerViewerKeyboardHandler } from '../utils/viewerKeyboard'
import { useLatestRef } from './useLatestRef'

// Makes handler the one that gets the grid / viewer keys (see viewerKeyboard.ts)
// while the component is mounted. It is registered once; each key goes to the
// handler from the latest render, so changing props doesn't re-register it.
export function useKeyboardHandler(handler: (event: KeyboardEvent) => void): void {
  const handlerRef = useLatestRef(handler)
  useEffect(() => registerViewerKeyboardHandler((event) => handlerRef.current(event)), [handlerRef])
}
