import { describe, expect, it } from 'vitest'
import type { ClosedTab, ClosedTabGroup, TabGroup, TabGroupSnapshot } from '../../../shared/types'
import { createEmptyTab, tabToSnapshot, type TabState } from '../types/tab'
import {
  canSaveGroup,
  closeGroup,
  closeTab,
  isClosedGroup,
  readSavedGroups,
  restoreClosedGroup,
  saveGroup,
  snapshotTabs
} from './closedTabs'
import { initialTabsState, tabsReducer, type TabsState } from './tabsReducer'

const group: TabGroup = { id: 'G', name: 'Trips', color: 'green', collapsed: true }

// A tab showing a folder, so closing it is remembered.
const folderTab = (name: string, groupId: string | null = null): TabState => ({
  ...createEmptyTab(groupId),
  title: name,
  rootFolderPath: `C:\\Photos\\${name}`
})

const stateOf = (tabs: TabState[], active: TabState, groups: TabGroup[] = [group]): TabsState => ({
  ...initialTabsState(active),
  tabs,
  groups
})

const titles = (state: TabsState): string[] => state.tabs.map((tab) => tab.title)

const closedGroup = (tabs: TabState[]): ClosedTabGroup => ({
  kind: 'group',
  group,
  tabs: tabs.map(tabToSnapshot)
})

describe('closeTab', () => {
  const [a, g1, g2] = [folderTab('a'), folderTab('g1', 'G'), folderTab('g2', 'G')]

  it('remembers just the tab while others stay in its group', () => {
    const state = closeTab(stateOf([a, g1, g2], a), g1.id, createEmptyTab())

    expect(state.closedTabs).toEqual([tabToSnapshot(g1)])
    expect(state.groups).toEqual([group])
  })

  it('remembers the group along with its last tab', () => {
    const state = closeTab(stateOf([a, g1], a), g1.id, createEmptyTab())

    expect(state.closedTabs).toEqual([closedGroup([g1])])
    expect(state.groups).toEqual([])
  })

  it('remembers nothing for an empty last tab of a group', () => {
    const empty = createEmptyTab('G')

    expect(closeTab(stateOf([a, empty], a), empty.id, createEmptyTab()).closedTabs).toEqual([])
  })
})

describe('closeGroup', () => {
  const [a, g1, g2, b] = [
    folderTab('a'),
    folderTab('g1', 'G'),
    folderTab('g2', 'G'),
    folderTab('b')
  ]

  it('closes every tab of the group, remembered as one, and activates the next tab', () => {
    const state = closeGroup(stateOf([a, g1, g2, b], g1), 'G', createEmptyTab())

    expect(titles(state)).toEqual(['a', 'b'])
    expect(state.groups).toEqual([])
    expect(state.tabs.find((tab) => tab.id === state.activeTabId)?.title).toBe('b')
    expect(state.closedTabs).toEqual([closedGroup([g1, g2])])
  })

  it('keeps the active tab when it is outside the group', () => {
    expect(closeGroup(stateOf([a, g1, g2, b], a), 'G', createEmptyTab()).activeTabId).toBe(a.id)
  })

  it('leaves out the tabs that showed no folder', () => {
    const empty = createEmptyTab('G')
    const state = closeGroup(stateOf([a, g1, empty], a), 'G', createEmptyTab())

    expect(state.closedTabs).toEqual([closedGroup([g1])])
  })

  it('puts an empty tab in place of the last tabs', () => {
    const replacement = createEmptyTab()
    const state = closeGroup(stateOf([g1, g2], g1), 'G', replacement)

    expect(state.tabs).toEqual([replacement])
    expect(state.activeTabId).toBe(replacement.id)
  })

  it('leaves the state alone for an unknown group', () => {
    const state = stateOf([a, g1], a)

    expect(closeGroup(state, 'gone', createEmptyTab())).toBe(state)
  })
})

describe('saveGroup', () => {
  const [a, g1, g2] = [folderTab('a'), folderTab('g1', 'G'), folderTab('g2', 'G')]

  it('closes the group and keeps it first, with its tabs that showed a folder', () => {
    const older: TabGroupSnapshot = { group: { ...group, id: 'old' }, tabs: [] }
    const empty = createEmptyTab('G')
    const state = saveGroup(
      { ...stateOf([a, g1, empty, g2], g1), savedGroups: [older] },
      'G',
      createEmptyTab()
    )

    expect(titles(state)).toEqual(['a'])
    expect(state.groups).toEqual([])
    expect(state.activeTabId).toBe(a.id)
    expect(state.savedGroups).toEqual([{ group, tabs: [g1, g2].map(tabToSnapshot) }, older])
    expect(state.closedTabs).toEqual([])
  })

  it('keeps a group open when none of its tabs shows a folder', () => {
    const empty = createEmptyTab('G')
    const state = stateOf([a, empty], a)

    expect(canSaveGroup(state.tabs, 'G')).toBe(false)
    expect(saveGroup(state, 'G', createEmptyTab())).toBe(state)
    expect(canSaveGroup([a, g1], 'G')).toBe(true)
  })
})

describe('readSavedGroups', () => {
  it('keeps the groups it can read, each once', () => {
    const snapshot = tabToSnapshot(folderTab('a'))
    const other = { ...group, id: 'H' }

    expect(
      readSavedGroups([
        { group, tabs: [snapshot, null] },
        { group: { ...group, name: 'again' }, tabs: [] },
        { group: 'not a group', tabs: [] },
        { group: other, tabs: 'none' },
        null
      ])
    ).toEqual([
      { group, tabs: [snapshot] },
      { group: other, tabs: [] }
    ])
  })
})

describe('restoreClosedGroup', () => {
  const a = folderTab('a')
  const restored = (): TabState[] => [folderTab('x', 'G'), folderTab('y', 'G')]

  it('puts the group back at the end, as saved, and activates its first tab', () => {
    const tabs = restored()
    const state = restoreClosedGroup(stateOf([a], a, []), group, tabs, 'N')

    expect(titles(state)).toEqual(['a', 'x', 'y'])
    expect(state.tabs.map((tab) => tab.groupId)).toEqual([null, 'G', 'G'])
    expect(state.groups).toEqual([group])
    expect(state.activeTabId).toBe(tabs[0]?.id)
  })

  it('gives the group a new id when another group has its old one', () => {
    const other = folderTab('o', 'G')
    const state = restoreClosedGroup(stateOf([other], other), group, restored(), 'N')

    expect(state.tabs.map((tab) => tab.groupId)).toEqual(['G', 'N', 'N'])
    expect(state.groups.map((candidate) => candidate.id)).toEqual(['G', 'N'])
  })

  it('brings a garbled group back as plain tabs', () => {
    const state = restoreClosedGroup(stateOf([a], a, []), 'not a group', restored(), 'N')

    expect(state.tabs.map((tab) => tab.groupId)).toEqual([null, null, null])
    expect(state.groups).toEqual([])
  })

  it('leaves the state alone without tabs', () => {
    const state = stateOf([a], a, [])

    expect(restoreClosedGroup(state, group, [], 'N')).toBe(state)
  })
})

describe('isClosedGroup / snapshotTabs', () => {
  it('tells a closed group from a closed tab', () => {
    const tab: ClosedTab = tabToSnapshot(folderTab('a'))

    expect(isClosedGroup(tab)).toBe(false)
    expect(isClosedGroup(closedGroup([]))).toBe(true)
  })

  it('reads only the tabs from what the saved session holds', () => {
    const snapshot = tabToSnapshot(folderTab('a'))
    const saved = { kind: 'group', group, tabs: [snapshot, null, 'x'] } as unknown as ClosedTabGroup

    expect(snapshotTabs(saved)).toEqual([snapshot])
    expect(snapshotTabs({ ...saved, tabs: 'none' } as unknown as ClosedTabGroup)).toEqual([])
  })
})

describe('tabsReducer with closed groups', () => {
  it('closes a group and brings it back', () => {
    const [a, g1] = [folderTab('a'), folderTab('g1', 'G')]
    const closed = tabsReducer(stateOf([a, g1], a), {
      type: 'closeGroup',
      groupId: 'G',
      replacement: createEmptyTab()
    })
    const entry = closed.closedTabs[0]
    if (!entry || !isClosedGroup(entry)) throw new Error('the group was not remembered')

    const forgotten = tabsReducer(closed, { type: 'forgetClosedTab', entry })
    const back = tabsReducer(forgotten, {
      type: 'restoreGroup',
      group: entry.group,
      tabs: [folderTab('g1', 'G')],
      newGroupId: 'N'
    })

    expect(forgotten.closedTabs).toEqual([])
    expect(titles(back)).toEqual(['a', 'g1'])
    expect(back.groups).toEqual([group])
  })
})
