import { describe, expect, it } from 'vitest'
import type { TabGroup } from '../../../shared/types'
import { createEmptyTab } from '../types/tab'
import {
  dropHintAtEnd,
  dropHintOverLabel,
  dropHintOverTab,
  groupDropMark,
  isPointInside,
  pointerFraction,
  tabDropMark,
  type DragPointer,
  type TabDragSource
} from './tabDrop'

const group: TabGroup = { id: 'G', name: 'G', color: 'blue', collapsed: false }
const loose = createEmptyTab()
const grouped = createEmptyTab('G')
const dragTab: TabDragSource = { kind: 'tab', tabId: 'dragged' }
const dragGroup = (groupId: string): TabDragSource => ({ kind: 'group', groupId })

const at = (fraction: number, rest: Partial<DragPointer> = {}): DragPointer => ({
  fraction,
  groupFraction: fraction,
  heldOverMiddle: false,
  ...rest
})

describe('pointerFraction', () => {
  it('measures from the left edge', () => {
    expect(pointerFraction(150, { left: 100, width: 200 })).toBe(0.25)
    expect(pointerFraction(150, { left: 100, width: 0 })).toBe(0)
  })
})

describe('isPointInside', () => {
  const rect = { left: 0, right: 100, top: 0, bottom: 40 }

  it('takes only points within the edges', () => {
    expect(isPointInside(50, 20, rect)).toBe(true)
    expect(isPointInside(100, 20, rect)).toBe(false)
    expect(isPointInside(50, 41, rect)).toBe(false)
  })
})

describe('dropHintOverTab', () => {
  const placeOver = (tab = loose, pointer = at(0.5)): string | undefined => {
    const hint = dropHintOverTab(dragTab, tab, pointer)
    return hint?.target.kind === 'tab' ? hint.target.place : undefined
  }

  it('puts a dragged tab before or after by the half it is over', () => {
    expect(placeOver(loose, at(0.4))).toBe('before')
    expect(placeOver(loose, at(0.6))).toBe('after')
  })

  it('offers grouping once held over the middle of a tab outside any group', () => {
    expect(placeOver(loose, at(0.4, { heldOverMiddle: true }))).toBe('onto')
    expect(placeOver(loose, at(0.8, { heldOverMiddle: true }))).toBe('after')
    expect(placeOver(grouped, at(0.4, { heldOverMiddle: true }))).toBe('before')
  })

  it('offers nothing over the dragged tab itself', () => {
    expect(dropHintOverTab({ kind: 'tab', tabId: loose.id }, loose, at(0.5))).toBeNull()
  })

  it('puts a dragged group next to a tab outside any group', () => {
    expect(dropHintOverTab(dragGroup('H'), loose, at(0.6))?.target).toEqual({
      kind: 'tab',
      tabId: loose.id,
      place: 'after'
    })
  })

  it('puts a dragged group before or after the whole group of the tab it is over', () => {
    expect(
      dropHintOverTab(dragGroup('H'), grouped, at(0.9, { groupFraction: 0.2 }))?.target
    ).toEqual({ kind: 'group', groupId: 'G', place: 'before' })
    expect(dropHintOverTab(dragGroup('G'), grouped, at(0.5))).toBeNull()
  })
})

describe('dropHintOverLabel', () => {
  it('puts a dragged tab before the group or first in it', () => {
    expect(dropHintOverLabel(dragTab, group, at(0.3))?.target).toEqual({
      kind: 'label',
      groupId: 'G',
      place: 'before'
    })
    expect(dropHintOverLabel(dragTab, group, at(0.7))?.target).toMatchObject({ place: 'into' })
  })

  it('puts a dragged group before or after the group', () => {
    expect(
      dropHintOverLabel(dragGroup('H'), group, at(0.3, { groupFraction: 0.6 }))?.target
    ).toEqual({ kind: 'group', groupId: 'G', place: 'after' })
    expect(dropHintOverLabel(dragGroup('G'), group, at(0.3))).toBeNull()
  })
})

describe('marks', () => {
  it('marks the tab, the group or its label the hint points at', () => {
    const ontoTab = dropHintOverTab(dragTab, loose, at(0.5, { heldOverMiddle: true }))
    const intoLabel = dropHintOverLabel(dragTab, group, at(0.9))

    expect(tabDropMark(ontoTab, loose.id)).toBe('onto')
    expect(tabDropMark(ontoTab, grouped.id)).toBeNull()
    expect(groupDropMark(intoLabel, 'G')).toBe('into')
    expect(groupDropMark(intoLabel, 'H')).toBeNull()
    expect(tabDropMark(dropHintAtEnd(dragTab), loose.id)).toBeNull()
  })
})
