import { useEffect, useLayoutEffect, type RefObject } from 'react'
import { fitTabWidth } from '../utils/tabWidth'

const widthOf = (element: Element): number => element.getBoundingClientRect().width

// Sets --tab-width on the tab list (see .tab-item) to the width that fits
// every tab it shows into it (see fitTabWidth).
const applyTabWidth = (list: HTMLElement): void => {
  const tabs = Array.from(list.querySelectorAll('.tab-item'))
  const tabsWidth = tabs.reduce((sum, tab) => sum + widthOf(tab), 0)
  // The list holds tabs and groups; what a group takes beside its tabs is its
  // label.
  const entriesWidth = Array.from(list.children).reduce((sum, entry) => sum + widthOf(entry), 0)
  const width = fitTabWidth(widthOf(list), entriesWidth - tabsWidth, tabs.length)
  list.style.setProperty('--tab-width', `${width}px`)
}

// Keeps the tabs in the list as wide as fits it: worked out again when the
// list is resized, and before the browser paints whenever shown - what the
// tab bar shows - changes, since tabs and group labels come and go with it.
export function useTabWidth(listRef: RefObject<HTMLElement>, shown: unknown): void {
  useLayoutEffect(() => {
    if (listRef.current) applyTabWidth(listRef.current)
  }, [listRef, shown])

  useEffect(() => {
    const list = listRef.current
    if (!list) return
    const observer = new ResizeObserver(() => applyTabWidth(list))
    observer.observe(list)
    return () => observer.disconnect()
  }, [listRef])
}
