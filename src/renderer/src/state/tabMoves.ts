import type { TabGroup } from '../../../shared/types'
import type { TabState } from '../types/tab'
import { lastIndexInGroup, nextGroupColor, withoutEmptyGroups, type TabLayout } from './tabGroups'

// Where a dragged tab is dropped.
export type TabDropTarget =
  // Next to the tab, in the same group as it. 'onto' a tab outside any group
  // makes a new group of the two.
  | { kind: 'tab'; tabId: string; place: 'before' | 'after' | 'onto' }
  // On a group's label: just before the group (outside it), or first in it.
  | { kind: 'label'; groupId: string; place: 'before' | 'into' }
  // Past the last tab, outside any group.
  | { kind: 'end' }

// Where a dragged group is dropped. Groups don't nest, so a group dropped
// among the tabs of another one goes before or after that whole group.
export type GroupDropTarget =
  // Next to a tab outside any group.
  | { kind: 'tab'; tabId: string; place: 'before' | 'after' }
  | { kind: 'group'; groupId: string; place: 'before' | 'after' }
  | { kind: 'end' }

const insertAt = <T>(items: readonly T[], index: number, ...inserted: T[]): T[] => [
  ...items.slice(0, index),
  ...inserted,
  ...items.slice(index)
]

// Whether dropping a tab there makes a new group (and so opens its panel).
export const makesGroup = (tabs: readonly TabState[], target: TabDropTarget): boolean =>
  target.kind === 'tab' &&
  target.place === 'onto' &&
  tabs.find((tab) => tab.id === target.tabId)?.groupId === null

// newGroupId names the group made when the tab is dropped onto a tab outside
// any group.
export const moveTab = (
  layout: TabLayout,
  tabId: string,
  target: TabDropTarget,
  newGroupId: string
): TabLayout => {
  const tab = layout.tabs.find((candidate) => candidate.id === tabId)
  if (!tab || (target.kind === 'tab' && target.tabId === tabId)) return layout
  const rest = layout.tabs.filter((candidate) => candidate !== tab)

  const placeAt = (index: number, groupId: string | null): TabLayout =>
    withoutEmptyGroups({ ...layout, tabs: insertAt(rest, index, { ...tab, groupId }) })

  switch (target.kind) {
    case 'end':
      return placeAt(rest.length, null)
    case 'label': {
      const first = rest.findIndex((candidate) => candidate.groupId === target.groupId)
      if (first === -1) return layout
      return placeAt(first, target.place === 'into' ? target.groupId : null)
    }
    case 'tab': {
      const index = rest.findIndex((candidate) => candidate.id === target.tabId)
      const onto = rest[index]
      if (!onto) return layout
      if (target.place === 'before') return placeAt(index, onto.groupId)
      if (target.place === 'after' || onto.groupId !== null) return placeAt(index + 1, onto.groupId)

      // Onto a tab outside any group: the two become a new group. Its colour
      // is picked after the dragged tab has left its old group.
      const { groups } = withoutEmptyGroups({ ...layout, tabs: rest })
      const group: TabGroup = {
        id: newGroupId,
        name: '',
        color: nextGroupColor(groups),
        collapsed: false
      }
      const tabs = rest.map((candidate) =>
        candidate === onto ? { ...candidate, groupId: newGroupId } : candidate
      )
      return {
        ...layout,
        tabs: insertAt(tabs, index + 1, { ...tab, groupId: newGroupId }),
        groups: [...groups, group]
      }
    }
  }
}

// Where in the other tabs a dragged group goes, or null when nowhere (it was
// dropped on itself, or on something that is gone). A tab inside another
// group stands for that whole group.
const groupInsertIndex = (
  rest: readonly TabState[],
  groupId: string,
  target: GroupDropTarget
): number | null => {
  if (target.kind === 'end') return rest.length

  const targetTab = target.kind === 'tab' ? rest.find((tab) => tab.id === target.tabId) : undefined
  if (targetTab && targetTab.groupId === null) {
    const index = rest.indexOf(targetTab)
    return target.place === 'after' ? index + 1 : index
  }

  const otherGroupId = target.kind === 'group' ? target.groupId : targetTab?.groupId
  if (!otherGroupId || otherGroupId === groupId) return null
  const first = rest.findIndex((tab) => tab.groupId === otherGroupId)
  if (first === -1) return null
  return target.place === 'after' ? lastIndexInGroup(rest, otherGroupId) + 1 : first
}

// Moves the whole group, keeping the order of its tabs.
export const moveGroup = (
  layout: TabLayout,
  groupId: string,
  target: GroupDropTarget
): TabLayout => {
  const block = layout.tabs.filter((tab) => tab.groupId === groupId)
  const rest = layout.tabs.filter((tab) => tab.groupId !== groupId)
  const index = block.length === 0 ? null : groupInsertIndex(rest, groupId, target)
  if (index === null) return layout
  return { ...layout, tabs: insertAt(rest, index, ...block) }
}
