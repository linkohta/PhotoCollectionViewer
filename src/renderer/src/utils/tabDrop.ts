import type { TabGroup } from '../../../shared/types'
import type { GroupDropTarget, TabDropTarget } from '../state/tabMoves'
import type { TabState } from '../types/tab'

// What is being dragged in the tab bar: a tab, or a group by its label.
export type TabDragSource = { kind: 'tab'; tabId: string } | { kind: 'group'; groupId: string }

// Where the dragged tab or group would be dropped now; the tab bar marks it.
export type TabDropHint =
  { kind: 'tab'; target: TabDropTarget } | { kind: 'group'; target: GroupDropTarget }

// How long a dragged tab has to stay over the middle of a tab outside any
// group before dropping it there makes a group of the two. Firefox waits
// too, so that dragging a tab past others only reorders them.
export const GROUP_HOVER_MS = 300

// How far across an element the pointer is: 0 at its left edge, 1 at its
// right edge.
export const pointerFraction = (clientX: number, rect: Pick<DOMRect, 'left' | 'width'>): number =>
  rect.width > 0 ? (clientX - rect.left) / rect.width : 0

export const isPointInside = (
  x: number,
  y: number,
  rect: Pick<DOMRect, 'left' | 'right' | 'top' | 'bottom'>
): boolean => x > rect.left && x < rect.right && y > rect.top && y < rect.bottom

// The middle half of a tab. Over the quarters at either side, a tab is put
// before or after it.
export const isOverMiddle = (fraction: number): boolean => fraction > 0.25 && fraction < 0.75

const side = (fraction: number): 'before' | 'after' => (fraction < 0.5 ? 'before' : 'after')

export interface DragPointer {
  // Across the element under the pointer.
  fraction: number
  // Across the whole group that element is in (the same as fraction when it
  // is in none).
  groupFraction: number
  // Whether it has stayed over the middle of this tab for GROUP_HOVER_MS.
  heldOverMiddle: boolean
}

export function dropHintOverTab(
  source: TabDragSource,
  tab: TabState,
  pointer: DragPointer
): TabDropHint | null {
  if (source.kind === 'tab') {
    if (source.tabId === tab.id) return null
    const onto = tab.groupId === null && pointer.heldOverMiddle && isOverMiddle(pointer.fraction)
    return {
      kind: 'tab',
      target: { kind: 'tab', tabId: tab.id, place: onto ? 'onto' : side(pointer.fraction) }
    }
  }

  // A dragged group goes next to a tab outside any group, or else before or
  // after the whole group the tab is in.
  if (tab.groupId === null) {
    return { kind: 'group', target: { kind: 'tab', tabId: tab.id, place: side(pointer.fraction) } }
  }
  if (tab.groupId === source.groupId) return null
  return {
    kind: 'group',
    target: { kind: 'group', groupId: tab.groupId, place: side(pointer.groupFraction) }
  }
}

// A dragged tab goes just before the group (left half of the label) or first
// in it (right half).
export function dropHintOverLabel(
  source: TabDragSource,
  group: TabGroup,
  pointer: Omit<DragPointer, 'heldOverMiddle'>
): TabDropHint | null {
  if (source.kind === 'tab') {
    return {
      kind: 'tab',
      target: {
        kind: 'label',
        groupId: group.id,
        place: pointer.fraction < 0.5 ? 'before' : 'into'
      }
    }
  }
  if (source.groupId === group.id) return null
  return {
    kind: 'group',
    target: { kind: 'group', groupId: group.id, place: side(pointer.groupFraction) }
  }
}

// Over the empty part of the tab bar, past the last tab.
export const dropHintAtEnd = (source: TabDragSource): TabDropHint =>
  source.kind === 'tab'
    ? { kind: 'tab', target: { kind: 'end' } }
    : { kind: 'group', target: { kind: 'end' } }

export const sameDropHint = (a: TabDropHint | null, b: TabDropHint | null): boolean =>
  JSON.stringify(a) === JSON.stringify(b)

// How the tab bar marks the hint on a tab.
export const tabDropMark = (
  hint: TabDropHint | null,
  tabId: string
): 'before' | 'after' | 'onto' | null =>
  hint?.target.kind === 'tab' && hint.target.tabId === tabId ? hint.target.place : null

// How the tab bar marks the hint on a group: a line before or after it, or
// its label ('into').
export const groupDropMark = (
  hint: TabDropHint | null,
  groupId: string
): 'before' | 'after' | 'into' | null => {
  const target = hint?.target
  if ((target?.kind === 'label' || target?.kind === 'group') && target.groupId === groupId) {
    return target.place
  }
  return null
}
