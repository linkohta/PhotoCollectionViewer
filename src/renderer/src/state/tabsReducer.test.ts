import { describe, expect, it } from 'vitest'
import { MAX_CLOSED_TABS } from '../../../shared/constants'
import type { TabGroup, TabSnapshot } from '../../../shared/types'
import { createEmptyTab, tabToSnapshot, type TabState } from '../types/tab'
import { initialTabsState, tabsReducer, type TabsAction, type TabsState } from './tabsReducer'

// A tab showing a folder, so closing it is remembered.
const folderTab = (name: string): TabState => ({
  ...createEmptyTab(),
  title: name,
  rootFolderPath: `C:\\Photos\\${name}`
})

const stateOf = (
  tabs: TabState[],
  active: TabState,
  closedTabs: TabSnapshot[] = [],
  groups: TabGroup[] = []
): TabsState => ({
  tabs,
  groups,
  activeTabId: active.id,
  closedTabs
})

const titles = (state: TabsState): string[] => state.tabs.map((tab) => tab.title)

const activeTitle = (state: TabsState): string | undefined =>
  state.tabs.find((tab) => tab.id === state.activeTabId)?.title

const close = (state: TabsState, tab: TabState, replacement = createEmptyTab()): TabsState =>
  tabsReducer(state, { type: 'close', tabId: tab.id, replacement })

describe('tabsReducer', () => {
  const [a, b, c] = [folderTab('a'), folderTab('b'), folderTab('c')]

  it('starts with the given tab, active, and nothing closed', () => {
    expect(initialTabsState(a)).toEqual({
      tabs: [a],
      groups: [],
      activeTabId: a.id,
      closedTabs: []
    })
  })

  it('adds a tab at the end and activates it', () => {
    const state = tabsReducer(stateOf([a], a), { type: 'add', tab: b })

    expect(titles(state)).toEqual(['a', 'b'])
    expect(activeTitle(state)).toBe('b')
  })

  it('activates a tab', () => {
    expect(activeTitle(tabsReducer(stateOf([a, b], a), { type: 'select', tabId: b.id }))).toBe('b')
  })

  it('updates only the given tab', () => {
    const state = tabsReducer(stateOf([a, b], a), {
      type: 'update',
      tabId: b.id,
      updater: (tab) => ({ ...tab, title: 'renamed' })
    })

    expect(titles(state)).toEqual(['a', 'renamed'])
  })

  describe('reorder', () => {
    const reorder = (source: TabState, target: TabState, insertAfter: boolean): string[] =>
      titles(
        tabsReducer(stateOf([a, b, c], a), {
          type: 'reorder',
          sourceId: source.id,
          targetId: target.id,
          insertAfter
        })
      )

    it('moves a tab before or after the target', () => {
      expect(reorder(a, c, false)).toEqual(['b', 'a', 'c'])
      expect(reorder(a, c, true)).toEqual(['b', 'c', 'a'])
      expect(reorder(c, a, false)).toEqual(['c', 'a', 'b'])
      expect(reorder(c, a, true)).toEqual(['a', 'c', 'b'])
    })

    it('leaves the state alone when dropped on itself or an unknown tab', () => {
      const state = stateOf([a, b, c], a)
      const unknown = folderTab('x')

      expect(
        tabsReducer(state, { type: 'reorder', sourceId: a.id, targetId: a.id, insertAfter: true })
      ).toBe(state)
      expect(
        tabsReducer(state, {
          type: 'reorder',
          sourceId: a.id,
          targetId: unknown.id,
          insertAfter: true
        })
      ).toBe(state)
    })
  })

  describe('close', () => {
    it('activates the tab that takes the place of the closed active tab', () => {
      const state = close(stateOf([a, b, c], b), b)

      expect(titles(state)).toEqual(['a', 'c'])
      expect(activeTitle(state)).toBe('c')
    })

    it('activates the new last tab when the last tab was active', () => {
      expect(activeTitle(close(stateOf([a, b, c], c), c))).toBe('b')
    })

    it('keeps the active tab when another one is closed', () => {
      expect(activeTitle(close(stateOf([a, b, c], c), a))).toBe('c')
    })

    it('replaces the only tab with the given empty tab', () => {
      const replacement = createEmptyTab()
      const state = close(stateOf([a], a), a, replacement)

      expect(state.tabs).toEqual([replacement])
      expect(state.activeTabId).toBe(replacement.id)
    })

    it('remembers closed tabs that show a folder, most recent first', () => {
      const state = close(close(stateOf([a, b, c], a), a), b)

      expect(state.closedTabs).toEqual([tabToSnapshot(b), tabToSnapshot(a)])
    })

    it('does not remember an empty tab', () => {
      const empty = createEmptyTab()

      expect(close(stateOf([a, empty], a), empty).closedTabs).toEqual([])
    })

    it(`remembers at most ${MAX_CLOSED_TABS} closed tabs`, () => {
      const older = Array.from({ length: MAX_CLOSED_TABS }, (_, i) =>
        tabToSnapshot(folderTab(`${i}`))
      )
      const state = close(stateOf([a, b], a, older), a)

      expect(state.closedTabs).toHaveLength(MAX_CLOSED_TABS)
      expect(state.closedTabs[0]).toEqual(tabToSnapshot(a))
      expect(state.closedTabs.at(-1)).toEqual(older[MAX_CLOSED_TABS - 2])
    })

    it('leaves the state alone for an unknown tab', () => {
      const state = stateOf([a], a)

      expect(close(state, folderTab('x'))).toBe(state)
    })

    // React runs reducers twice in development (StrictMode): both runs must
    // give the same result and leave the previous state as it was.
    it('gives the same result when run twice on the same state', () => {
      const state = stateOf([a, b], a)
      const before = structuredClone(state)
      const action: TabsAction = { type: 'close', tabId: a.id, replacement: createEmptyTab() }

      const first = tabsReducer(state, action)
      const second = tabsReducer(state, action)

      expect(second).toEqual(first)
      expect(first.closedTabs).toHaveLength(1)
      expect(state).toEqual(before)
    })
  })

  it('forgets a closed tab once it has been brought back', () => {
    const [first, second] = [tabToSnapshot(a), tabToSnapshot(b)]
    const state = tabsReducer(stateOf([c], c, [first, second]), {
      type: 'forgetClosedTab',
      snapshot: first
    })

    expect(state.closedTabs).toEqual([second])
  })

  describe('groups', () => {
    const group: TabGroup = { id: 'G', name: 'Trips', color: 'blue', collapsed: false }
    const [g1, g2] = [
      { ...folderTab('g1'), groupId: 'G' },
      { ...folderTab('g2'), groupId: 'G' }
    ]
    const grouped = (active: TabState = a): TabsState =>
      stateOf([a, g1, g2, b], active, [], [group])

    it('adds a tab of a group to the end of the group and activates it', () => {
      const tab = { ...folderTab('x'), groupId: 'G' }
      const state = tabsReducer(grouped(), { type: 'add', tab })

      expect(titles(state)).toEqual(['a', 'g1', 'g2', 'x', 'b'])
      expect(activeTitle(state)).toBe('x')
    })

    it('creates, renames, recolours, collapses and ungroups a group', () => {
      const run = (state: TabsState, ...actions: TabsAction[]): TabsState =>
        actions.reduce(tabsReducer, state)
      const changed = run(
        stateOf([a, b], a),
        { type: 'createGroup', tabId: b.id, groupId: 'N' },
        { type: 'updateGroup', groupId: 'N', changes: { name: 'Sea', color: 'cyan' } },
        { type: 'toggleGroupCollapsed', groupId: 'N' }
      )

      expect(changed.groups).toEqual([{ id: 'N', name: 'Sea', color: 'cyan', collapsed: true }])
      expect(changed.tabs.map((tab) => tab.groupId)).toEqual([null, 'N'])
      expect(run(changed, { type: 'ungroup', groupId: 'N' })).toMatchObject({
        groups: [],
        tabs: [{ groupId: null }, { groupId: null }]
      })
    })

    it('moves a tab into and out of a group', () => {
      const added = tabsReducer(grouped(), { type: 'addTabToGroup', tabId: b.id, groupId: 'G' })
      const removed = tabsReducer(added, { type: 'removeTabFromGroup', tabId: g1.id })

      expect(titles(added)).toEqual(['a', 'g1', 'g2', 'b'])
      expect(titles(removed)).toEqual(['a', 'g2', 'b', 'g1'])
      expect(removed.tabs.map((tab) => tab.groupId)).toEqual([null, 'G', 'G', null])
    })

    it('joins the group a tab is dragged into the middle of', () => {
      const state = tabsReducer(grouped(), {
        type: 'reorder',
        sourceId: b.id,
        targetId: g1.id,
        insertAfter: true
      })

      expect(titles(state)).toEqual(['a', 'g1', 'b', 'g2'])
      expect(state.tabs.map((tab) => tab.groupId)).toEqual([null, 'G', 'G', 'G'])
    })

    it('passes over a collapsed group when activating the next tab', () => {
      const collapsed = { ...grouped(a), groups: [{ ...group, collapsed: true }] }

      expect(activeTitle(close(collapsed, a))).toBe('b')
    })

    it('drops a group once its last tab is closed', () => {
      expect(close(close(grouped(), g1), g2).groups).toEqual([])
    })

    it('restores the groups of the saved session', () => {
      const state = tabsReducer(initialTabsState(createEmptyTab()), {
        type: 'restoreSession',
        tabs: [a, g1, g2],
        activeTabIndex: 1,
        closedTabs: [],
        groups: [group, 'not a group']
      })

      expect(state.groups).toEqual([group])
      expect(activeTitle(state)).toBe('g1')
    })
  })

  describe('restoreSession', () => {
    const restore = (tabs: TabState[], activeTabIndex: number): TabsState =>
      tabsReducer(initialTabsState(createEmptyTab()), {
        type: 'restoreSession',
        tabs,
        activeTabIndex,
        closedTabs: [tabToSnapshot(c)],
        groups: []
      })

    it('replaces the tabs and activates the saved one', () => {
      const state = restore([a, b], 1)

      expect(titles(state)).toEqual(['a', 'b'])
      expect(activeTitle(state)).toBe('b')
      expect(state.closedTabs).toEqual([tabToSnapshot(c)])
    })

    it('keeps the saved active index within the tabs', () => {
      expect(activeTitle(restore([a, b], 5))).toBe('b')
      expect(activeTitle(restore([a, b], -1))).toBe('a')
    })

    it('keeps the current tab when no tabs were saved, but restores the closed ones', () => {
      const initial = initialTabsState(createEmptyTab())
      const state = tabsReducer(initial, {
        type: 'restoreSession',
        tabs: [],
        activeTabIndex: 0,
        closedTabs: [tabToSnapshot(c)],
        groups: []
      })

      expect(state.tabs).toBe(initial.tabs)
      expect(state.activeTabId).toBe(initial.activeTabId)
      expect(state.closedTabs).toEqual([tabToSnapshot(c)])
    })
  })
})
