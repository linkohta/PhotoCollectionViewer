import { MAX_CLOSED_TABS } from '../../shared/constants'
import type { SessionData } from '../../shared/types'
import { readAppStateSlice, writeAppStateSlice } from './appState'

export function getSession(): SessionData {
  return readAppStateSlice('session')
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
