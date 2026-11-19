import { describe, expect, it } from 'vitest'
import type { TabGroup } from '../../../shared/types'
import { createEmptyTab, type TabState } from '../types/tab'
import type { TabLayout } from './tabGroups'
import {
  makesGroup,
  moveGroup,
  moveTab,
  type GroupDropTarget,
  type TabDropTarget
} from './tabMoves'

const groupOf = (id: string): TabGroup => ({ id, name: id, color: 'blue', collapsed: false })

const tabOf = (title: string, groupId: string | null = null): TabState => ({
  ...createEmptyTab(groupId),
  title
})

// "a G:b G:c d" - the tabs in order, each as groupId:title or just title.
const describeLayout = ({ tabs }: TabLayout): string =>
  tabs.map((tab) => (tab.groupId ? `${tab.groupId}:${tab.title}` : tab.title)).join(' ')

// a, G:[b c], d, H:[e]
const sample = (): TabLayout => ({
  tabs: [tabOf('a'), tabOf('b', 'G'), tabOf('c', 'G'), tabOf('d'), tabOf('e', 'H')],
  groups: [groupOf('G'), groupOf('H')]
})

const idOf = (layout: TabLayout, title: string): string => {
  const tab = layout.tabs.find((candidate) => candidate.title === title)
  if (!tab) throw new Error(`no tab ${title}`)
  return tab.id
}

describe('moveTab', () => {
  const move = (title: string, target: (layout: TabLayout) => TabDropTarget): TabLayout => {
    const layout = sample()
    return moveTab(layout, idOf(layout, title), target(layout), 'N')
  }
  const besideTab =
    (title: string, place: 'before' | 'after' | 'onto') =>
    (layout: TabLayout): TabDropTarget => ({ kind: 'tab', tabId: idOf(layout, title), place })

  it('puts the tab next to the target tab, in its group', () => {
    expect(describeLayout(move('a', besideTab('c', 'before')))).toBe('G:b G:a G:c d H:e')
    expect(describeLayout(move('a', besideTab('c', 'after')))).toBe('G:b G:c G:a d H:e')
    expect(describeLayout(move('d', besideTab('b', 'before')))).toBe('a G:d G:b G:c H:e')
    expect(describeLayout(move('b', besideTab('d', 'before')))).toBe('a G:c b d H:e')
    expect(describeLayout(move('b', besideTab('d', 'after')))).toBe('a G:c d b H:e')
  })

  it('makes a new group of the tab and one outside any group it is dropped onto', () => {
    const moved = move('b', besideTab('d', 'onto'))

    expect(describeLayout(moved)).toBe('a G:c N:d N:b H:e')
    expect(moved.groups.at(-1)).toEqual({ id: 'N', name: '', color: 'purple', collapsed: false })
  })

  it('drops the group the tab leaves empty', () => {
    const moved = move('e', besideTab('a', 'onto'))

    expect(describeLayout(moved)).toBe('N:a N:e G:b G:c d')
    expect(moved.groups.map((group) => group.id)).toEqual(['G', 'N'])
  })

  it('puts a tab dropped onto a tab in a group after it, in that group', () => {
    expect(describeLayout(move('a', besideTab('b', 'onto')))).toBe('G:b G:a G:c d H:e')
  })

  it('puts the tab before a group or first in it when dropped on its label', () => {
    const label = (place: 'before' | 'into'): TabDropTarget => ({
      kind: 'label',
      groupId: 'G',
      place
    })

    expect(describeLayout(move('d', () => label('before')))).toBe('a d G:b G:c H:e')
    expect(describeLayout(move('d', () => label('into')))).toBe('a G:d G:b G:c H:e')
    expect(describeLayout(move('c', () => label('before')))).toBe('a c G:b d H:e')
  })

  it('puts the tab at the end, outside any group', () => {
    expect(describeLayout(move('b', () => ({ kind: 'end' })))).toBe('a G:c d H:e b')
  })

  it('leaves the layout alone when dropped on itself', () => {
    const layout = sample()
    const id = idOf(layout, 'a')

    expect(moveTab(layout, id, { kind: 'tab', tabId: id, place: 'onto' }, 'N')).toBe(layout)
  })
})

describe('makesGroup', () => {
  it('is true only when dropped onto a tab outside any group', () => {
    const layout = sample()
    const onto = (title: string, place: 'before' | 'onto' = 'onto'): boolean =>
      makesGroup(layout.tabs, { kind: 'tab', tabId: idOf(layout, title), place })

    expect(onto('d')).toBe(true)
    expect(onto('b')).toBe(false)
    expect(onto('d', 'before')).toBe(false)
  })
})

describe('moveGroup', () => {
  const move = (groupId: string, target: (layout: TabLayout) => GroupDropTarget): string => {
    const layout = sample()
    return describeLayout(moveGroup(layout, groupId, target(layout)))
  }
  const besideTab =
    (title: string, place: 'before' | 'after') =>
    (layout: TabLayout): GroupDropTarget => ({ kind: 'tab', tabId: idOf(layout, title), place })

  it('moves the group next to a tab outside any group', () => {
    expect(move('G', besideTab('a', 'before'))).toBe('G:b G:c a d H:e')
    expect(move('G', besideTab('d', 'after'))).toBe('a d G:b G:c H:e')
  })

  it('moves the group before or after another whole group', () => {
    expect(move('H', () => ({ kind: 'group', groupId: 'G', place: 'before' }))).toBe(
      'a H:e G:b G:c d'
    )
    expect(move('G', besideTab('e', 'after'))).toBe('a d H:e G:b G:c')
    expect(move('G', besideTab('e', 'before'))).toBe('a d G:b G:c H:e')
  })

  it('moves the group to the end', () => {
    expect(move('G', () => ({ kind: 'end' }))).toBe('a d H:e G:b G:c')
  })

  it('leaves the layout alone when dropped on itself', () => {
    const layout = sample()

    expect(moveGroup(layout, 'G', { kind: 'group', groupId: 'G', place: 'after' })).toBe(layout)
    expect(moveGroup(layout, 'G', { kind: 'tab', tabId: idOf(layout, 'b'), place: 'after' })).toBe(
      layout
    )
  })
})
