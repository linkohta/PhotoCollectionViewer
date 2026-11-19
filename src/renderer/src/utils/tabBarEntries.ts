import type { TabGroup } from '../../../shared/types'
import { findGroup } from '../state/tabGroups'
import type { TabState } from '../types/tab'

// What the tab bar shows, in order: tabs outside any group, and groups - a
// label followed by the tabs of the group that are shown.
export type TabBarEntry =
  | { kind: 'tab'; tab: TabState }
  | { kind: 'group'; group: TabGroup; tabs: TabState[]; tabCount: number }

type GroupEntry = Extract<TabBarEntry, { kind: 'group' }>

// A collapsed group shows only the active tab, if it is in the group.
export function buildTabBarEntries(
  tabs: readonly TabState[],
  groups: readonly TabGroup[],
  activeTabId: string
): TabBarEntry[] {
  const entries: TabBarEntry[] = []
  for (const tab of tabs) {
    const group = findGroup(groups, tab.groupId)
    if (!group) {
      entries.push({ kind: 'tab', tab })
      continue
    }

    const last = entries[entries.length - 1]
    let entry: GroupEntry | undefined =
      last?.kind === 'group' && last.group.id === group.id ? last : undefined
    if (!entry) {
      entry = { kind: 'group', group, tabs: [], tabCount: 0 }
      entries.push(entry)
    }

    entry.tabCount++
    if (!group.collapsed || tab.id === activeTabId) entry.tabs.push(tab)
  }
  return entries
}
