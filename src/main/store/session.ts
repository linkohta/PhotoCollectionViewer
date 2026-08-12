import { readFileSync, writeFileSync, existsSync } from 'fs'
import { getAppRootFilePath } from './appRoot'

export type ViewMode = 'grid' | 'viewer'

export interface TabSnapshot {
  title: string
  rootFolderPath: string | null
  currentFolderPath: string | null
  selectedIndex: number | null
  viewMode: ViewMode
}

export interface SessionData {
  tabs: TabSnapshot[]
  activeTabIndex: number
  closedTabs: TabSnapshot[]
}

const MAX_CLOSED_TABS = 25

function getStorePath(): string {
  return getAppRootFilePath('session.json')
}

function readSession(): SessionData {
  const storePath = getStorePath()
  if (!existsSync(storePath)) {
    return { tabs: [], activeTabIndex: 0, closedTabs: [] }
  }

  try {
    const raw = readFileSync(storePath, 'utf-8')
    const data = JSON.parse(raw) as SessionData
    return {
      tabs: Array.isArray(data.tabs) ? data.tabs : [],
      activeTabIndex: typeof data.activeTabIndex === 'number' ? data.activeTabIndex : 0,
      closedTabs: Array.isArray(data.closedTabs) ? data.closedTabs : []
    }
  } catch {
    return { tabs: [], activeTabIndex: 0, closedTabs: [] }
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

  writeFileSync(getStorePath(), JSON.stringify(normalized, null, 2), 'utf-8')
  return normalized
}

export function updateClosedTabs(closedTabs: TabSnapshot[]): TabSnapshot[] {
  const session = readSession()
  const normalized = closedTabs.slice(0, MAX_CLOSED_TABS)
  saveSession({ ...session, closedTabs: normalized })
  return normalized
}
