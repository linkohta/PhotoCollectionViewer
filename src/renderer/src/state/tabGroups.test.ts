import { describe, expect, it } from 'vitest'
import { TAB_GROUP_COLORS } from '../../../shared/constants'
import type { TabGroup } from '../../../shared/types'
import { createEmptyTab, type TabState } from '../types/tab'
import {
  addTabToGroup,
  createGroup,
  insertTab,
  nextGroupColor,
  removeTab,
  removeTabFromGroup,
  restoreGroups,
  tabAfterClosing,
  ungroupTabs,
  type TabLayout
} from './tabGroups'

const groupOf = (id: string, collapsed = false): TabGroup => ({
  id,
  name: id,
  color: 'blue',
  collapsed
})

const tabOf = (title: string, groupId: string | null = null): TabState => ({
  ...createEmptyTab(groupId),
  title
})

// "a G:b G:c d" - the tabs in order, each as groupId:title or just title.
const describeLayout = ({ tabs }: TabLayout): string =>
  tabs.map((tab) => (tab.groupId ? `${tab.groupId}:${tab.title}` : tab.title)).join(' ')

const groupIds = ({ groups }: TabLayout): string[] => groups.map((group) => group.id).sort()

const find = (layout: TabLayout, title: string): TabState => {
  const tab = layout.tabs.find((candidate) => candidate.title === title)
  if (!tab) throw new Error(`no tab ${title}`)
  return tab
}

// a, G:[b c], d, H:[e]
const sample = (): TabLayout => ({
  tabs: [tabOf('a'), tabOf('b', 'G'), tabOf('c', 'G'), tabOf('d'), tabOf('e', 'H')],
  groups: [groupOf('G'), groupOf('H')]
})

describe('nextGroupColor', () => {
  it('picks the colour the fewest groups have, the earliest on a tie', () => {
    expect(nextGroupColor([])).toBe('blue')
    expect(nextGroupColor([{ ...groupOf('G'), color: 'blue' }])).toBe('purple')

    const everyColour = TAB_GROUP_COLORS.map((color, i) => ({ ...groupOf(`${i}`), color }))
    expect(nextGroupColor(everyColour)).toBe('blue')
    expect(nextGroupColor([...everyColour, { ...groupOf('x'), color: 'blue' }])).toBe('purple')
  })
})

describe('insertTab', () => {
  it('puts a tab without a group at the end', () => {
    expect(describeLayout(insertTab(sample(), tabOf('x')))).toBe('a G:b G:c d H:e x')
  })

  it('puts a tab at the end of its group', () => {
    expect(describeLayout(insertTab(sample(), tabOf('x', 'G')))).toBe('a G:b G:c G:x d H:e')
  })

  it('puts a tab whose group is gone at the end, out of any group', () => {
    expect(describeLayout(insertTab(sample(), tabOf('x', 'gone')))).toBe('a G:b G:c d H:e x')
  })
})

describe('removeTab', () => {
  it('drops the group of the last tab in it', () => {
    const layout = sample()
    const removed = removeTab(layout, find(layout, 'e').id)

    expect(describeLayout(removed)).toBe('a G:b G:c d')
    expect(groupIds(removed)).toEqual(['G'])
  })
})

describe('addTabToGroup', () => {
  it('moves the tab to the end of the group', () => {
    const layout = sample()

    expect(describeLayout(addTabToGroup(layout, find(layout, 'a').id, 'G'))).toBe(
      'G:b G:c G:a d H:e'
    )
    expect(describeLayout(addTabToGroup(layout, find(layout, 'b').id, 'H'))).toBe('a G:c d H:e H:b')
  })

  it('drops the group the tab was the only one in', () => {
    const layout = sample()
    const moved = addTabToGroup(layout, find(layout, 'e').id, 'G')

    expect(describeLayout(moved)).toBe('a G:b G:c G:e d')
    expect(groupIds(moved)).toEqual(['G'])
  })

  it('leaves the layout alone for its own group or an unknown one', () => {
    const layout = sample()

    expect(addTabToGroup(layout, find(layout, 'b').id, 'G')).toBe(layout)
    expect(addTabToGroup(layout, find(layout, 'a').id, 'gone')).toBe(layout)
  })
})

describe('removeTabFromGroup', () => {
  it('moves the tab to just after its group', () => {
    const layout = sample()

    expect(describeLayout(removeTabFromGroup(layout, find(layout, 'b').id))).toBe('a G:c b d H:e')
  })

  it('leaves the only tab of a group where it is and drops the group', () => {
    const layout = sample()
    const removed = removeTabFromGroup(layout, find(layout, 'e').id)

    expect(describeLayout(removed)).toBe('a G:b G:c d e')
    expect(groupIds(removed)).toEqual(['G'])
  })

  it('leaves a tab without a group alone', () => {
    const layout = sample()

    expect(removeTabFromGroup(layout, find(layout, 'a').id)).toBe(layout)
  })
})

describe('createGroup', () => {
  it('makes an unnamed group of the tab where it is, in the next colour', () => {
    const layout = sample()
    const created = createGroup(layout, find(layout, 'd').id, 'N')

    expect(describeLayout(created)).toBe('a G:b G:c N:d H:e')
    expect(created.groups.at(-1)).toEqual({ id: 'N', name: '', color: 'purple', collapsed: false })
  })

  it('takes a tab out of its group first, to just after it', () => {
    const layout = sample()

    expect(describeLayout(createGroup(layout, find(layout, 'b').id, 'N'))).toBe('a G:c N:b d H:e')
  })
})

describe('ungroupTabs', () => {
  it('keeps the tabs where they are and drops the group', () => {
    const ungrouped = ungroupTabs(sample(), 'G')

    expect(describeLayout(ungrouped)).toBe('a b c d H:e')
    expect(groupIds(ungrouped)).toEqual(['H'])
  })
})

describe('tabAfterClosing', () => {
  const tabs = [tabOf('a'), tabOf('b', 'G'), tabOf('c', 'G'), tabOf('d')]

  it('takes the tab that slid into place, or the one before at the end', () => {
    expect(tabAfterClosing(tabs, [groupOf('G')], 1)?.title).toBe('b')
    expect(tabAfterClosing(tabs, [groupOf('G')], 4)?.title).toBe('d')
  })

  it('passes over tabs hidden in a collapsed group', () => {
    expect(tabAfterClosing(tabs, [groupOf('G', true)], 1)?.title).toBe('d')
    expect(tabAfterClosing(tabs.slice(0, 3), [groupOf('G', true)], 1)?.title).toBe('a')
  })

  it('takes a hidden tab when every tab is hidden', () => {
    expect(tabAfterClosing(tabs.slice(1, 3), [groupOf('G', true)], 0)?.title).toBe('b')
  })
})

describe('restoreGroups', () => {
  it('keeps valid groups and the tabs in them', () => {
    const layout = sample()

    expect(restoreGroups(layout.tabs, layout.groups)).toEqual(layout)
  })

  it('fills in what a saved group lacks and drops what is not a group', () => {
    const restored = restoreGroups(
      [tabOf('a', 'G'), tabOf('b', 'H')],
      [{ id: 'G', color: 'teal', collapsed: 'yes' }, { name: 'no id' }, null, 'H']
    )

    expect(restored.groups).toEqual([{ id: 'G', name: '', color: 'gray', collapsed: false }])
    expect(describeLayout(restored)).toBe('G:a b')
  })

  it('keeps the first of two groups with the same id', () => {
    const restored = restoreGroups(
      [tabOf('a', 'G')],
      [groupOf('G'), { ...groupOf('G'), name: 'x' }]
    )

    expect(restored.groups).toEqual([groupOf('G')])
  })

  it('takes tabs away from the rest of their group out of it', () => {
    const tabs = [tabOf('a', 'G'), tabOf('b'), tabOf('c', 'G'), tabOf('d', 'H'), tabOf('e', 'G')]

    expect(describeLayout(restoreGroups(tabs, [groupOf('G'), groupOf('H')]))).toBe('G:a b c H:d e')
  })

  it('drops groups without tabs', () => {
    expect(groupIds(restoreGroups([tabOf('a', 'G')], [groupOf('G'), groupOf('H')]))).toEqual(['G'])
  })
})
