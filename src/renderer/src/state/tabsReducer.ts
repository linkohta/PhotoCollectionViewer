import { MAX_CLOSED_TABS } from '../../../shared/constants'
import type { TabSnapshot } from '../../../shared/types'
import { hasRestorableContent, tabToSnapshot, type TabState } from '../types/tab'

export interface TabsState {
  tabs: TabState[]
  activeTabId: string
  // Most recently closed first, brought back by Ctrl+Shift+T.
  closedTabs: TabSnapshot[]
}

// The reducer must stay pure - React runs it twice in development
// (StrictMode) - so anything new, such as a tab with a fresh random id, comes
// in with the action instead of being made here.
export type TabsAction =
  | { type: 'update'; tabId: string; updater: (tab: TabState) => TabState }
  | { type: 'add'; tab: TabState }
  | { type: 'select'; tabId: string }
  | { type: 'reorder'; sourceId: string; targetId: string; insertAfter: boolean }
  // replacement takes the place of the last tab, so there is always one.
  | { type: 'close'; tabId: string; replacement: TabState }
  | { type: 'forgetClosedTab'; snapshot: TabSnapshot }
  // From the saved session. With no tabs to restore, the current ones stay.
  | {
      type: 'restoreSession'
      tabs: TabState[]
      activeTabIndex: number
      closedTabs: TabSnapshot[]
    }

export function initialTabsState(tab: TabState): TabsState {
  return { tabs: [tab], activeTabId: tab.id, closedTabs: [] }
}

const reorderTabs = (
  state: TabsState,
  sourceId: string,
  targetId: string,
  insertAfter: boolean
): TabsState => {
  const fromIndex = state.tabs.findIndex((tab) => tab.id === sourceId)
  const toIndex = state.tabs.findIndex((tab) => tab.id === targetId)
  if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
    return state
  }

  const next = [...state.tabs]
  const [moved] = next.splice(fromIndex, 1)
  const adjustedToIndex = next.findIndex((tab) => tab.id === targetId)
  const insertAt = insertAfter ? adjustedToIndex + 1 : adjustedToIndex
  next.splice(insertAt, 0, moved!)
  return { ...state, tabs: next }
}

// Closing the active tab activates the one that slides into its place, or the
// new last tab when it was the last one.
const closeTab = (state: TabsState, tabId: string, replacement: TabState): TabsState => {
  const index = state.tabs.findIndex((tab) => tab.id === tabId)
  const closing = state.tabs[index]
  if (!closing) return state

  const closedTabs = hasRestorableContent(closing)
    ? [tabToSnapshot(closing), ...state.closedTabs].slice(0, MAX_CLOSED_TABS)
    : state.closedTabs

  if (state.tabs.length === 1) {
    return { tabs: [replacement], activeTabId: replacement.id, closedTabs }
  }

  const tabs = state.tabs.filter((tab) => tab.id !== tabId)
  const activeTabId =
    tabId === state.activeTabId ? tabs[Math.min(index, tabs.length - 1)]!.id : state.activeTabId
  return { tabs, activeTabId, closedTabs }
}

export function tabsReducer(state: TabsState, action: TabsAction): TabsState {
  switch (action.type) {
    case 'update':
      return {
        ...state,
        tabs: state.tabs.map((tab) => (tab.id === action.tabId ? action.updater(tab) : tab))
      }
    case 'add':
      return { ...state, tabs: [...state.tabs, action.tab], activeTabId: action.tab.id }
    case 'select':
      return { ...state, activeTabId: action.tabId }
    case 'reorder':
      return reorderTabs(state, action.sourceId, action.targetId, action.insertAfter)
    case 'close':
      return closeTab(state, action.tabId, action.replacement)
    case 'forgetClosedTab':
      return {
        ...state,
        closedTabs: state.closedTabs.filter((snapshot) => snapshot !== action.snapshot)
      }
    case 'restoreSession': {
      if (action.tabs.length === 0) return { ...state, closedTabs: action.closedTabs }
      const activeIndex = Math.min(Math.max(action.activeTabIndex, 0), action.tabs.length - 1)
      return {
        tabs: action.tabs,
        activeTabId: action.tabs[activeIndex]!.id,
        closedTabs: action.closedTabs
      }
    }
  }
}
