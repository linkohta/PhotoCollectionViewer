import { TAB_GROUP_COLORS } from '../../../shared/constants'
import type { TabGroup, TabGroupColor } from '../../../shared/types'
import type { TabState } from '../types/tab'

// The tabs with their groups. Every layout these functions return keeps two
// rules: the tabs of a group sit next to each other, and a group exists only
// while it holds a tab. A tab names its group by TabState.groupId; the order
// of `groups` means nothing.
export interface TabLayout {
  tabs: TabState[]
  groups: TabGroup[]
}

export type TabGroupChanges = Partial<Pick<TabGroup, 'name' | 'color'>>

export const findGroup = (
  groups: readonly TabGroup[],
  groupId: string | null
): TabGroup | undefined =>
  groupId === null ? undefined : groups.find((group) => group.id === groupId)

// The tab bar leaves such a tab out, unless it is the active one.
export const isInCollapsedGroup = (tab: TabState, groups: readonly TabGroup[]): boolean =>
  findGroup(groups, tab.groupId)?.collapsed === true

// The colour the fewest groups have, the earliest one on a tie, so the first
// groups all get different colours.
export const nextGroupColor = (groups: readonly TabGroup[]): TabGroupColor => {
  const uses = (color: TabGroupColor): number =>
    groups.filter((group) => group.color === color).length
  return TAB_GROUP_COLORS.reduce((best, color) => (uses(color) < uses(best) ? color : best))
}

const lastIndexInGroup = (tabs: readonly TabState[], groupId: string): number =>
  tabs.findLastIndex((tab) => tab.groupId === groupId)

const withoutEmptyGroups = (layout: TabLayout): TabLayout => {
  const groups = layout.groups.filter((group) =>
    layout.tabs.some((tab) => tab.groupId === group.id)
  )
  return groups.length === layout.groups.length ? layout : { ...layout, groups }
}

// A tab with a group goes to the end of that group. Without one, or when its
// group is gone (a closed tab brought back after the rest of its group was
// closed), it goes to the end of the tab bar.
export const insertTab = (layout: TabLayout, tab: TabState): TabLayout => {
  const last = tab.groupId === null ? -1 : lastIndexInGroup(layout.tabs, tab.groupId)
  if (last === -1) {
    const ungrouped = tab.groupId === null ? tab : { ...tab, groupId: null }
    return { ...layout, tabs: [...layout.tabs, ungrouped] }
  }

  const tabs = [...layout.tabs]
  tabs.splice(last + 1, 0, tab)
  return { ...layout, tabs }
}

export const removeTab = (layout: TabLayout, tabId: string): TabLayout =>
  withoutEmptyGroups({ ...layout, tabs: layout.tabs.filter((tab) => tab.id !== tabId) })

// Moves the tab to the end of the group.
export const addTabToGroup = (layout: TabLayout, tabId: string, groupId: string): TabLayout => {
  const tab = layout.tabs.find((candidate) => candidate.id === tabId)
  if (!tab || tab.groupId === groupId || !findGroup(layout.groups, groupId)) return layout

  const rest = { ...layout, tabs: layout.tabs.filter((candidate) => candidate.id !== tabId) }
  return withoutEmptyGroups(insertTab(rest, { ...tab, groupId }))
}

// The tab moves to just after the group it leaves (it stays where it is when
// it was the only tab in it).
export const removeTabFromGroup = (layout: TabLayout, tabId: string): TabLayout => {
  const index = layout.tabs.findIndex((tab) => tab.id === tabId)
  const tab = layout.tabs[index]
  if (!tab || tab.groupId === null) return layout

  const tabs = layout.tabs.filter((candidate) => candidate.id !== tabId)
  const last = lastIndexInGroup(tabs, tab.groupId)
  tabs.splice(last === -1 ? index : last + 1, 0, { ...tab, groupId: null })
  return withoutEmptyGroups({ ...layout, tabs })
}

// A new group, unnamed, holding just the tab where it is - or just after its
// old group, when the tab was in one.
export const createGroup = (layout: TabLayout, tabId: string, groupId: string): TabLayout => {
  const ungrouped = removeTabFromGroup(layout, tabId)
  if (!ungrouped.tabs.some((tab) => tab.id === tabId)) return layout

  const group: TabGroup = {
    id: groupId,
    name: '',
    color: nextGroupColor(ungrouped.groups),
    collapsed: false
  }
  return {
    ...ungrouped,
    tabs: ungrouped.tabs.map((tab) => (tab.id === tabId ? { ...tab, groupId } : tab)),
    groups: [...ungrouped.groups, group]
  }
}

// The tabs stay where they are, out of any group.
export const ungroupTabs = (layout: TabLayout, groupId: string): TabLayout => ({
  ...layout,
  tabs: layout.tabs.map((tab) => (tab.groupId === groupId ? { ...tab, groupId: null } : tab)),
  groups: layout.groups.filter((group) => group.id !== groupId)
})

export const updateGroup = (
  groups: readonly TabGroup[],
  groupId: string,
  change: (group: TabGroup) => TabGroup
): TabGroup[] => groups.map((group) => (group.id === groupId ? change(group) : group))

// After the tab has been dragged to a new place: dropped between two tabs of
// one group, it joins that group; otherwise it keeps its own group only while
// it is still next to the rest of it.
export const regroupMovedTab = (layout: TabLayout, tabId: string): TabLayout => {
  const { tabs } = layout
  const index = tabs.findIndex((tab) => tab.id === tabId)
  const tab = tabs[index]
  if (!tab) return layout

  const before = tabs[index - 1]?.groupId ?? null
  const after = tabs[index + 1]?.groupId ?? null
  const own = tab.groupId
  const besideOwnGroup =
    own !== null &&
    (before === own ||
      after === own ||
      !tabs.some((other) => other !== tab && other.groupId === own))

  let groupId: string | null = null
  if (before !== null && before === after) {
    groupId = before
  } else if (besideOwnGroup) {
    groupId = own
  }
  if (groupId === own) return layout

  const next = [...tabs]
  next[index] = { ...tab, groupId }
  return withoutEmptyGroups({ ...layout, tabs: next })
}

// The tab to activate after the active one, at index, was closed: the one
// that slid into its place, or else the nearest one before it - passing over
// tabs hidden in collapsed groups, unless every tab is.
export const tabAfterClosing = (
  tabs: readonly TabState[],
  groups: readonly TabGroup[],
  index: number
): TabState | undefined => {
  const shown = (tab: TabState): boolean => !isInCollapsedGroup(tab, groups)
  return (
    tabs.slice(index).find(shown) ??
    tabs.slice(0, index).reverse().find(shown) ??
    tabs[Math.min(index, tabs.length - 1)]
  )
}

const isTabGroupColor = (value: unknown): value is TabGroupColor =>
  (TAB_GROUP_COLORS as readonly unknown[]).includes(value)

// A group as read from the saved session, which may hold anything.
const toTabGroup = (value: unknown): TabGroup | null => {
  if (typeof value !== 'object' || value === null) return null
  const { id, name, color, collapsed } = value as Record<string, unknown>
  if (typeof id !== 'string') return null
  return {
    id,
    name: typeof name === 'string' ? name : '',
    color: isTabGroupColor(color) ? color : 'gray',
    collapsed: collapsed === true
  }
}

// Puts the saved groups back on the restored tabs. A tab whose group is
// unknown, or that is away from the rest of its group, leaves the group, and
// groups without tabs are dropped.
export const restoreGroups = (tabs: readonly TabState[], saved: readonly unknown[]): TabLayout => {
  const groups: TabGroup[] = []
  for (const value of saved) {
    const group = toTabGroup(value)
    if (group && !findGroup(groups, group.id)) groups.push(group)
  }

  const ended = new Set<string>()
  let previous: string | null = null
  const restored = tabs.map((tab) => {
    const groupId =
      tab.groupId !== null && !ended.has(tab.groupId) && findGroup(groups, tab.groupId)
        ? tab.groupId
        : null
    if (previous !== null && previous !== groupId) ended.add(previous)
    previous = groupId
    return groupId === tab.groupId ? tab : { ...tab, groupId }
  })

  return withoutEmptyGroups({ tabs: restored, groups })
}
