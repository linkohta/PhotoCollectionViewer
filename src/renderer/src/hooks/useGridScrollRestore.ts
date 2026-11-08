import { useEffect, useRef, useState } from 'react'
import { findGridItem } from '../utils/gridItemElements'

// Keyed by folder path so returning to a folder (e.g. via "go up" or a
// breadcrumb) restores the scroll position it was left at, instead of
// always snapping back to the top.
const gridScrollPositions = new Map<string, number>()

export function useGridScrollRestore(
  collectionPath: string,
  highlightPath: string | null
): {
  scrollRoot: HTMLDivElement | null
  setScrollRoot: (el: HTMLDivElement | null) => void
  handleGridScroll: (event: React.UIEvent<HTMLDivElement>) => void
} {
  const [scrollRoot, setScrollRoot] = useState<HTMLDivElement | null>(null)
  const restoredPathRef = useRef<string | null>(null)

  useEffect(() => {
    if (!scrollRoot || restoredPathRef.current === collectionPath) return
    restoredPathRef.current = collectionPath

    if (highlightPath) {
      const target = findGridItem(scrollRoot, highlightPath)
      if (target) {
        target.scrollIntoView({ block: 'center' })
        return
      }
    }

    scrollRoot.scrollTop = gridScrollPositions.get(collectionPath) ?? 0
  }, [scrollRoot, collectionPath, highlightPath])

  // Keeps the highlighted card in view as the user moves the highlight with
  // arrow keys, without re-triggering the initial mount/restore effect above.
  useEffect(() => {
    if (!scrollRoot || !highlightPath || restoredPathRef.current !== collectionPath) return
    const target = findGridItem(scrollRoot, highlightPath)
    target?.scrollIntoView({ block: 'nearest' })
  }, [scrollRoot, collectionPath, highlightPath])

  const handleGridScroll = (event: React.UIEvent<HTMLDivElement>): void => {
    gridScrollPositions.set(collectionPath, event.currentTarget.scrollTop)
  }

  return { scrollRoot, setScrollRoot, handleGridScroll }
}
