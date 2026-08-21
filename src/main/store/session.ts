import {
  readAppStateSlice,
  writeAppStateSlice,
  type SessionData,
  type TabSnapshot,
  type ViewMode
} from './appState'

export type { SessionData, TabSnapshot, ViewMode }

const MAX_CLOSED_TABS = 25

function readSession(): SessionData {
  const data = readAppStateSlice('session')
  return {
    tabs: Array.isArray(data.tabs) ? data.tabs : [],
    activeTabIndex: typeof data.activeTabIndex === 'number' ? data.activeTabIndex : 0,
    closedTabs: Array.isArray(data.closedTabs) ? data.closedTabs : []
  }
}

export function getSession(): SessionData {
  return readSession()
}

export function saveSession(session: SessionData): SessionData {
  const normalized: SessionData = {
    tabs: session.tabs,
    activeTabIndex: session.activeTabIndex,
    closedTabs: session.closedTabs.slice(0, MAX_CLOSED_TABS)
  }

  writeAppStateSlice('session', normalized)
  return normalized
}

export function updateClosedTabs(closedTabs: TabSnapshot[]): TabSnapshot[] {
  const session = readSession()
  const normalized = closedTabs.slice(0, MAX_CLOSED_TABS)
  saveSession({ ...session, closedTabs: normalized })
  return normalized
}
