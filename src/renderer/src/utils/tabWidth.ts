// Every tab in the tab bar is the same width (see useTabWidth): TAB_MAX_WIDTH
// while they fit, narrower as tabs are added so that they still all fit
// without the bar scrolling, down to TAB_MIN_WIDTH - past that the bar
// scrolls. Names too long for a tab end in "…" (see .tab-title).
export const TAB_MIN_WIDTH = 90
export const TAB_MAX_WIDTH = 220

// The width for each of tabCount tabs in a list available pixels wide, of
// which fixed pixels go to things other than tabs (group labels). Rounded
// down to whole pixels, so the tabs never come to more than the list.
export function fitTabWidth(available: number, fixed: number, tabCount: number): number {
  if (tabCount <= 0) return TAB_MAX_WIDTH
  const share = Math.floor((available - fixed) / tabCount)
  return Math.min(TAB_MAX_WIDTH, Math.max(TAB_MIN_WIDTH, share))
}
