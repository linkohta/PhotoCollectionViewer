import { useEffect } from 'react'
import type { RefObject } from 'react'
import { useLatestRef } from './useLatestRef'

// How far outside the visible part of the scroll root an element may still
// be when onEnter is called, so a card starts loading just before it
// scrolls into view.
const ROOT_MARGIN = '240px'

// Calls onEnter once, as soon as the element comes near the visible part of
// scrollRoot (the viewport when null). Starts watching again whenever key or
// scrollRoot changes, so key has to change with anything onEnter reads.
// Whatever onEnter returns is called when that watch ends (key or scrollRoot
// changes, or the component unmounts), e.g. to drop a result that arrives
// too late.
export function useInView(
  elementRef: RefObject<HTMLElement>,
  scrollRoot: HTMLElement | null,
  key: string,
  onEnter: () => (() => void) | void
): void {
  const onEnterRef = useLatestRef(onEnter)

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    let cleanup: (() => void) | void
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return
        observer.disconnect()
        cleanup = onEnterRef.current()
      },
      { root: scrollRoot, rootMargin: ROOT_MARGIN }
    )

    observer.observe(element)
    return () => {
      observer.disconnect()
      cleanup?.()
    }
  }, [elementRef, scrollRoot, key, onEnterRef])
}
