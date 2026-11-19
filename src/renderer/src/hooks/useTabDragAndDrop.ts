import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { TabGroup } from '../../../shared/types'
import type { GroupDropTarget, TabDropTarget } from '../state/tabMoves'
import type { TabState } from '../types/tab'
import {
  dropHintAtEnd,
  dropHintOverLabel,
  dropHintOverTab,
  GROUP_HOVER_MS,
  isOverMiddle,
  isPointInside,
  pointerFraction,
  sameDropHint,
  type TabDragSource,
  type TabDropHint
} from '../utils/tabDrop'
import { useLatestRef } from './useLatestRef'

type DragEvent = React.DragEvent<HTMLElement>

// Spread onto a tab or a group label.
export interface DragSourceProps {
  draggable: true
  onDragStart: (event: DragEvent) => void
  onDragEnter: (event: DragEvent) => void
  onDragOver: (event: DragEvent) => void
  onDragEnd: () => void
}

interface UseTabDragAndDropArgs {
  // The element of a group in the tab bar (label and tabs).
  getGroupElement: (groupId: string) => HTMLElement | undefined
  onMoveTab: (tabId: string, target: TabDropTarget) => void
  onMoveGroup: (groupId: string, target: GroupDropTarget) => void
}

// Dragging tabs, and groups by their labels, around the tab bar. Each tab and
// label works out where a drop would go while the pointer is over it; the
// tab list itself takes the drop (and drops past the last tab).
//
// Entering an element brings dragenter but no dragover until the pointer
// moves again, so both work the drop out, and the tab bar marks it as soon
// as the pointer is over a tab or label. (Chromium sends one more dragover
// right before the drop, so the drop itself always lands where it is let go.)
export function useTabDragAndDrop({
  getGroupElement,
  onMoveTab,
  onMoveGroup
}: UseTabDragAndDropArgs) {
  const [source, setSource] = useState<TabDragSource | null>(null)
  const [hint, setHint] = useState<TabDropHint | null>(null)
  // The handlers read these rather than the state, which may not have been
  // rendered yet when the next drag event comes.
  const sourceRef = useRef<TabDragSource | null>(null)
  const hintRef = useRef<TabDropHint | null>(null)
  // The tab outside any group that a dragged tab is over the middle of, and
  // whether it has stayed there long enough to offer grouping.
  const holdRef = useRef<{ tabId: string; timer: number; held: boolean } | null>(null)
  // The last drag event a tab or label handled, so that the list can tell
  // the ones over the gaps between them (around a group's label).
  const handledRef = useRef<Event | null>(null)
  const argsRef = useLatestRef({ getGroupElement, onMoveTab, onMoveGroup })

  const updateHint = useCallback((next: TabDropHint | null) => {
    if (sameDropHint(hintRef.current, next)) return
    hintRef.current = next
    setHint(next)
  }, [])

  const stopHolding = useCallback(() => {
    if (holdRef.current) window.clearTimeout(holdRef.current.timer)
    holdRef.current = null
  }, [])

  const finish = useCallback(() => {
    stopHolding()
    sourceRef.current = null
    setSource(null)
    updateHint(null)
  }, [stopHolding, updateHint])

  useEffect(() => stopHolding, [stopHolding])

  const startDrag = useCallback((event: DragEvent, dragged: TabDragSource, label: string) => {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', label)
    sourceRef.current = dragged
    setSource(dragged)
  }, [])

  // Measured over the group a tab or label is in, for a dragged group.
  const groupFraction = useCallback(
    (event: DragEvent, groupId: string | null, fraction: number): number => {
      const element = groupId ? argsRef.current.getGroupElement(groupId) : undefined
      return element ? pointerFraction(event.clientX, element.getBoundingClientRect()) : fraction
    },
    [argsRef]
  )

  // Starts (or keeps) the wait over the middle of a tab outside any group;
  // anywhere else it stops. When the wait is over, the hint turns to 'onto'.
  const trackHold = useCallback(
    (dragged: TabDragSource, tab: TabState, fraction: number): boolean => {
      const canGroup = dragged.kind === 'tab' && dragged.tabId !== tab.id && tab.groupId === null
      if (!canGroup || !isOverMiddle(fraction)) {
        stopHolding()
        return false
      }
      if (holdRef.current?.tabId !== tab.id) {
        stopHolding()
        const hold = { tabId: tab.id, held: false, timer: 0 }
        hold.timer = window.setTimeout(() => {
          hold.held = true
          updateHint(
            dropHintOverTab(dragged, tab, {
              fraction,
              groupFraction: fraction,
              heldOverMiddle: true
            })
          )
        }, GROUP_HOVER_MS)
        holdRef.current = hold
      }
      return holdRef.current?.held ?? false
    },
    [stopHolding, updateHint]
  )

  const tabDragProps = (tab: TabState): DragSourceProps => {
    const over = (event: DragEvent): void => {
      const dragged = sourceRef.current
      if (!dragged) return
      event.preventDefault()
      handledRef.current = event.nativeEvent
      const fraction = pointerFraction(event.clientX, event.currentTarget.getBoundingClientRect())
      const heldOverMiddle = trackHold(dragged, tab, fraction)
      updateHint(
        dropHintOverTab(dragged, tab, {
          fraction,
          groupFraction: groupFraction(event, tab.groupId, fraction),
          heldOverMiddle
        })
      )
    }
    return {
      draggable: true,
      onDragStart: (event) => startDrag(event, { kind: 'tab', tabId: tab.id }, tab.title),
      onDragEnter: over,
      onDragOver: over,
      onDragEnd: finish
    }
  }

  const labelDragProps = (group: TabGroup): DragSourceProps => {
    const over = (event: DragEvent): void => {
      const dragged = sourceRef.current
      if (!dragged) return
      event.preventDefault()
      handledRef.current = event.nativeEvent
      stopHolding()
      const fraction = pointerFraction(event.clientX, event.currentTarget.getBoundingClientRect())
      updateHint(
        dropHintOverLabel(dragged, group, {
          fraction,
          groupFraction: groupFraction(event, group.id, fraction)
        })
      )
    }
    return {
      draggable: true,
      onDragStart: (event) => startDrag(event, { kind: 'group', groupId: group.id }, group.name),
      onDragEnter: over,
      onDragOver: over,
      onDragEnd: finish
    }
  }

  const listDropProps = useMemo(() => {
    const over = (event: DragEvent): void => {
      const dragged = sourceRef.current
      if (!dragged) return
      event.preventDefault()
      event.dataTransfer.dropEffect = 'move'
      // Over the list itself, not one of its tabs or groups: past the end.
      if (event.target === event.currentTarget) {
        stopHolding()
        updateHint(dropHintAtEnd(dragged))
      } else if (handledRef.current !== event.nativeEvent) {
        // Over a gap in a group: the hint stays, but a tab the pointer has
        // left must not turn into a new group meanwhile.
        stopHolding()
      }
    }
    return {
      onDragEnter: over,
      onDragOver: over,
      // This also comes when the pointer moves on to a tab inside the list,
      // and relatedTarget does not tell where it went, so the position of the
      // pointer tells whether it has left the list.
      onDragLeave: (event: DragEvent) => {
        const rect = event.currentTarget.getBoundingClientRect()
        if (isPointInside(event.clientX, event.clientY, rect)) return
        stopHolding()
        updateHint(null)
      },
      onDrop: (event: DragEvent) => {
        event.preventDefault()
        const dragged = sourceRef.current
        const dropped = hintRef.current
        if (dragged?.kind === 'tab' && dropped?.kind === 'tab') {
          argsRef.current.onMoveTab(dragged.tabId, dropped.target)
        } else if (dragged?.kind === 'group' && dropped?.kind === 'group') {
          argsRef.current.onMoveGroup(dragged.groupId, dropped.target)
        }
        finish()
      }
    }
  }, [argsRef, finish, stopHolding, updateHint])

  return { source, hint, tabDragProps, labelDragProps, listDropProps }
}
