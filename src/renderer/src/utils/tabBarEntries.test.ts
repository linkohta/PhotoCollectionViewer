import { describe, expect, it } from 'vitest'
import type { TabGroup } from '../../../shared/types'
import { createEmptyTab, type TabState } from '../types/tab'
import { buildTabBarEntries, type TabBarEntry } from './tabBarEntries'

const tabOf = (title: string, groupId: string | null = null): TabState => ({
  ...createEmptyTab(groupId),
  title
})

const groupOf = (id: string, collapsed = false): TabGroup => ({
  id,
  name: id,
  color: 'blue',
  collapsed
})

// "a [G 2: b c] d" - a group as [id count: the tabs shown].
const describeEntries = (entries: TabBarEntry[]): string =>
  entries
    .map((entry) =>
      entry.kind === 'tab'
        ? entry.tab.title
        : `[${entry.group.id} ${entry.tabCount}: ${entry.tabs.map((tab) => tab.title).join(' ')}]`
    )
    .join(' ')

describe('buildTabBarEntries', () => {
  const tabs = [tabOf('a'), tabOf('b', 'G'), tabOf('c', 'G'), tabOf('d'), tabOf('e', 'H')]
  const [a, b] = tabs as [TabState, TabState]

  it('puts the tabs of a group under its label', () => {
    expect(describeEntries(buildTabBarEntries(tabs, [groupOf('G'), groupOf('H')], a.id))).toBe(
      'a [G 2: b c] d [H 1: e]'
    )
  })

  it('shows no tab of a collapsed group but the active one', () => {
    const groups = [groupOf('G', true), groupOf('H', true)]

    expect(describeEntries(buildTabBarEntries(tabs, groups, a.id))).toBe('a [G 2: ] d [H 1: ]')
    expect(describeEntries(buildTabBarEntries(tabs, groups, b.id))).toBe('a [G 2: b] d [H 1: ]')
  })

  it('shows a tab of an unknown group on its own', () => {
    expect(describeEntries(buildTabBarEntries([tabOf('a', 'gone')], [], ''))).toBe('a')
  })
})
