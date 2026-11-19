import { MAX_CLOSED_TABS } from '../../../shared/constants'
import type { ClosedTab, ClosedTabGroup, TabGroup, TabSnapshot } from '../../../shared/types'
import { hasRestorableContent, tabToSnapshot, type TabState } from '../types/tab'
import { findGroup, removeTab, tabAfterClosing, toTabGroup } from './tabGroups'
import type { TabsState } from './tabsReducer'

export const isClosedGroup = (entry: ClosedTab): entry is ClosedTabGroup =>
  'kind' in entry && entry.kind === 'group'

// The tabs of a closed group, leaving out whatever in the saved session is
// not a tab.
export const closedGroupTabs = (entry: ClosedTabGroup): TabSnapshot[] =>
  Array.isArray(entry.tabs)
    ? entry.tabs.filter((tab) => typeof tab === 'object' && tab !== null)
    : []

// Most recent first. Nothing is remembered for tabs that showed no folder.
const remember = (closedTabs: ClosedTab[], entry: ClosedTab | null): ClosedTab[] =>
  entry ? [entry, ...closedTabs].slice(0, MAX_CLOSED_TABS) : closedTabs

const closedGroupOf = (group: TabGroup, tabs: readonly TabState[]): ClosedTabGroup | null => {
  const kept = tabs.filter(hasRestorableContent)
  return kept.length > 0 ? { kind: 'group', group, tabs: kept.map(tabToSnapshot) } : null
}

// Closing the last tab of a group closes the group too, so the group is
// remembered with it and comes back with its name and colour.
const closedEntryFor = (state: TabsState, closing: TabState): ClosedTab | null => {
  const group = findGroup(state.groups, closing.groupId)
  const lastOfGroup =
    group && !state.tabs.some((tab) => tab !== closing && tab.groupId === group.id)
  if (lastOfGroup) return closedGroupOf(group, [closing])
  return hasRestorableContent(closing) ? tabToSnapshot(closing) : null
}

// Closing the active tab activates the one that slides into its place, or the
// new last tab when it was the last one (passing over collapsed groups).
// replacement takes the place of the last tab, so there is always one.
export const closeTab = (state: TabsState, tabId: string, replacement: TabState): TabsState => {
  const index = state.tabs.findIndex((tab) => tab.id === tabId)
  const closing = state.tabs[index]
  if (!closing) return state

  const closedTabs = remember(state.closedTabs, closedEntryFor(state, closing))

  if (state.tabs.length === 1) {
    return { tabs: [replacement], groups: [], activeTabId: replacement.id, closedTabs }
  }

  const { tabs, groups } = removeTab(state, tabId)
  const activeTabId =
    tabId === state.activeTabId
      ? (tabAfterClosing(tabs, groups, index)?.id ?? state.activeTabId)
      : state.activeTabId
  return { tabs, groups, activeTabId, closedTabs }
}

// Closes every tab of the group, remembered as one entry. The active tab, if
// it was in the group, gives way as when closing a single tab.
export const closeGroup = (state: TabsState, groupId: string, replacement: TabState): TabsState => {
  const group = findGroup(state.groups, groupId)
  if (!group) return state

  const closing = state.tabs.filter((tab) => tab.groupId === groupId)
  const first = state.tabs.findIndex((tab) => tab.groupId === groupId)
  const closedTabs = remember(state.closedTabs, closedGroupOf(group, closing))
  const tabs = state.tabs.filter((tab) => tab.groupId !== groupId)
  const groups = state.groups.filter((candidate) => candidate.id !== groupId)

  if (tabs.length === 0) {
    return { tabs: [replacement], groups, activeTabId: replacement.id, closedTabs }
  }

  const activeTabId = closing.some((tab) => tab.id === state.activeTabId)
    ? (tabAfterClosing(tabs, groups, first)?.id ?? state.activeTabId)
    : state.activeTabId
  return { tabs, groups, activeTabId, closedTabs }
}

// Puts a closed group back at the end of the tab bar, as saved, and activates
// its first tab. It keeps its old id (so a tab of it closed on its own earlier
// can still go back into it) unless another group has taken that id, when it
// gets newGroupId. A group the saved session garbled comes back as plain tabs.
export const restoreClosedGroup = (
  state: TabsState,
  savedGroup: unknown,
  restoredTabs: readonly TabState[],
  newGroupId: string
): TabsState => {
  const group = toTabGroup(savedGroup)
  const groupId = group && findGroup(state.groups, group.id) ? newGroupId : (group?.id ?? null)
  const tabs = restoredTabs.map((tab) => ({ ...tab, groupId }))
  const [first] = tabs
  if (!first) return state

  return {
    ...state,
    tabs: [...state.tabs, ...tabs],
    groups: group && groupId ? [...state.groups, { ...group, id: groupId }] : state.groups,
    activeTabId: first.id
  }
}
