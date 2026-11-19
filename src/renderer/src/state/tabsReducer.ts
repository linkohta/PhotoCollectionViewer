import { MAX_CLOSED_TABS } from '../../../shared/constants'
import type { TabGroup, TabSnapshot } from '../../../shared/types'
import { hasRestorableContent, tabToSnapshot, type TabState, type TabUpdater } from '../types/tab'
import {
  addTabToGroup,
  createGroup,
  insertTab,
  removeTab,
  removeTabFromGroup,
  restoreGroups,
  tabAfterClosing,
  ungroupTabs,
  updateGroup,
  type TabGroupChanges,
  type TabLayout
} from './tabGroups'
import { moveGroup, moveTab, type GroupDropTarget, type TabDropTarget } from './tabMoves'

export interface TabsState {
  tabs: TabState[]
  // The groups the tabs are in (see tabGroups.ts for the rules they keep).
  groups: TabGroup[]
  activeTabId: string
  // Most recently closed first, brought back by Ctrl+Shift+T.
  closedTabs: TabSnapshot[]
}

// The reducer must stay pure - React runs it twice in development
// (StrictMode) - so anything new, such as a tab with a fresh random id, comes
// in with the action instead of being made here.
export type TabsAction =
  | { type: 'update'; tabId: string; updater: TabUpdater }
  // Goes to the end of its group (tab.groupId) if that exists, or else to the
  // end of the tab bar.
  | { type: 'add'; tab: TabState }
  | { type: 'select'; tabId: string }
  // Dragged and dropped. newGroupId names the group made by dropping a tab
  // onto a tab outside any group.
  | { type: 'moveTab'; tabId: string; target: TabDropTarget; newGroupId: string }
  | { type: 'moveGroup'; groupId: string; target: GroupDropTarget }
  // replacement takes the place of the last tab, so there is always one.
  | { type: 'close'; tabId: string; replacement: TabState }
  | { type: 'forgetClosedTab'; snapshot: TabSnapshot }
  | { type: 'createGroup'; tabId: string; groupId: string }
  | { type: 'addTabToGroup'; tabId: string; groupId: string }
  | { type: 'removeTabFromGroup'; tabId: string }
  | { type: 'updateGroup'; groupId: string; changes: TabGroupChanges }
  | { type: 'toggleGroupCollapsed'; groupId: string }
  | { type: 'ungroup'; groupId: string }
  // From the saved session. With no tabs to restore, the current ones stay.
  | {
      type: 'restoreSession'
      tabs: TabState[]
      activeTabIndex: number
      closedTabs: TabSnapshot[]
      // As saved: restoring checks them.
      groups: readonly unknown[]
    }

export function initialTabsState(tab: TabState): TabsState {
  return { tabs: [tab], groups: [], activeTabId: tab.id, closedTabs: [] }
}

const withLayout = (state: TabsState, { tabs, groups }: TabLayout): TabsState =>
  tabs === state.tabs && groups === state.groups ? state : { ...state, tabs, groups }

// Closing the active tab activates the one that slides into its place, or the
// new last tab when it was the last one (passing over collapsed groups).
const closeTab = (state: TabsState, tabId: string, replacement: TabState): TabsState => {
  const index = state.tabs.findIndex((tab) => tab.id === tabId)
  const closing = state.tabs[index]
  if (!closing) return state

  const closedTabs = hasRestorableContent(closing)
    ? [tabToSnapshot(closing), ...state.closedTabs].slice(0, MAX_CLOSED_TABS)
    : state.closedTabs

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

const restoreSession = (
  state: TabsState,
  action: Extract<TabsAction, { type: 'restoreSession' }>
): TabsState => {
  if (action.tabs.length === 0) return { ...state, closedTabs: action.closedTabs }
  const { tabs, groups } = restoreGroups(action.tabs, action.groups)
  const activeIndex = Math.min(Math.max(action.activeTabIndex, 0), tabs.length - 1)
  return {
    tabs,
    groups,
    activeTabId: tabs[activeIndex]!.id,
    closedTabs: action.closedTabs
  }
}

export function tabsReducer(state: TabsState, action: TabsAction): TabsState {
  switch (action.type) {
    case 'update':
      return {
        ...state,
        tabs: state.tabs.map((tab) => (tab.id === action.tabId ? action.updater(tab) : tab))
      }
    case 'add':
      return { ...withLayout(state, insertTab(state, action.tab)), activeTabId: action.tab.id }
    case 'select':
      return { ...state, activeTabId: action.tabId }
    case 'moveTab':
      return withLayout(state, moveTab(state, action.tabId, action.target, action.newGroupId))
    case 'moveGroup':
      return withLayout(state, moveGroup(state, action.groupId, action.target))
    case 'close':
      return closeTab(state, action.tabId, action.replacement)
    case 'forgetClosedTab':
      return {
        ...state,
        closedTabs: state.closedTabs.filter((snapshot) => snapshot !== action.snapshot)
      }
    case 'createGroup':
      return withLayout(state, createGroup(state, action.tabId, action.groupId))
    case 'addTabToGroup':
      return withLayout(state, addTabToGroup(state, action.tabId, action.groupId))
    case 'removeTabFromGroup':
      return withLayout(state, removeTabFromGroup(state, action.tabId))
    case 'updateGroup':
      return {
        ...state,
        groups: updateGroup(state.groups, action.groupId, (group) => ({
          ...group,
          ...action.changes
        }))
      }
    case 'toggleGroupCollapsed':
      return {
        ...state,
        groups: updateGroup(state.groups, action.groupId, (group) => ({
          ...group,
          collapsed: !group.collapsed
        }))
      }
    case 'ungroup':
      return withLayout(state, ungroupTabs(state, action.groupId))
    case 'restoreSession':
      return restoreSession(state, action)
  }
}
