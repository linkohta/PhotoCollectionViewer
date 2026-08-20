import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'fs'
import { join } from 'path'
import { app } from 'electron'
import { getAppRootFilePath, getLegacyAppRootDir } from './appRoot'

const LEGACY_FAVORITES_FILE = 'favorites.json'
const LEGACY_SESSION_FILE = 'session.json'
const LEGACY_WINDOW_STATE_FILE = 'window-state.json'

export interface FavoriteFolder {
  path: string
  name: string
  addedAt: number
}

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

export interface WindowState {
  width: number
  height: number
  x?: number
  y?: number
  isMaximized?: boolean
}

export interface AppState {
  favorites: FavoriteFolder[]
  session: SessionData
  windowState: Partial<WindowState>
}

function defaultAppState(): AppState {
  return {
    favorites: [],
    session: { tabs: [], activeTabIndex: 0, closedTabs: [] },
    windowState: {}
  }
}

function getStorePath(): string {
  return getAppRootFilePath('app-state.json')
}

function readAppState(): AppState {
  const storePath = getStorePath()
  if (!existsSync(storePath)) {
    return defaultAppState()
  }

  try {
    const raw = readFileSync(storePath, 'utf-8')
    const data = JSON.parse(raw) as Partial<AppState>
    return {
      favorites: Array.isArray(data.favorites) ? data.favorites : [],
      session: data.session ?? defaultAppState().session,
      windowState: data.windowState ?? {}
    }
  } catch {
    return defaultAppState()
  }
}

function writeAppState(state: AppState): void {
  writeFileSync(getStorePath(), JSON.stringify(state, null, 2), 'utf-8')
}

export function exportAppState(destPath: string): void {
  const state = readAppState()
  writeFileSync(destPath, JSON.stringify(state, null, 2), 'utf-8')
}

export function importAppState(srcPath: string): AppState {
  const raw = readFileSync(srcPath, 'utf-8')
  const data = JSON.parse(raw) as Partial<AppState>
  const state: AppState = {
    favorites: Array.isArray(data.favorites) ? data.favorites : [],
    session: data.session ?? defaultAppState().session,
    windowState: data.windowState ?? {}
  }
  writeAppState(state)
  return state
}

export function readAppStateSlice<K extends keyof AppState>(key: K): AppState[K] {
  return readAppState()[key]
}

export function writeAppStateSlice<K extends keyof AppState>(key: K, value: AppState[K]): void {
  const state = readAppState()
  state[key] = value
  writeAppState(state)
}

function readLegacyJson<T>(filename: string): T | null {
  const path = getAppRootFilePath(filename)
  if (!existsSync(path)) return null

  try {
    return JSON.parse(readFileSync(path, 'utf-8')) as T
  } catch {
    return null
  }
}

/**
 * 旧バージョンはインストールディレクトリ(exeと同じ場所)に app-state.json を保存していたため、
 * アップデートインストール時に設定が失われていた。userData に app-state.json がまだ無ければ、
 * 旧パスから移行する。
 */
function migrateLegacyAppStateFile(): void {
  if (!app.isPackaged) return

  const currentStorePath = getStorePath()
  if (existsSync(currentStorePath)) return

  const legacyStorePath = join(getLegacyAppRootDir(), 'app-state.json')
  if (!existsSync(legacyStorePath)) return

  try {
    const raw = readFileSync(legacyStorePath, 'utf-8')
    writeFileSync(currentStorePath, raw, 'utf-8')
  } catch {
    // 読み込みに失敗した場合は何もしない(初期状態で起動)
  }
}

export function migrateLegacyStoreFiles(): void {
  migrateLegacyAppStateFile()

  const legacyPaths = [LEGACY_FAVORITES_FILE, LEGACY_SESSION_FILE, LEGACY_WINDOW_STATE_FILE].map((filename) =>
    getAppRootFilePath(filename)
  )
  if (!legacyPaths.some((path) => existsSync(path))) return

  const state = readAppState()

  const legacyFavorites = readLegacyJson<FavoriteFolder[]>(LEGACY_FAVORITES_FILE)
  if (Array.isArray(legacyFavorites)) {
    state.favorites = legacyFavorites
  }

  const legacySession = readLegacyJson<Partial<SessionData>>(LEGACY_SESSION_FILE)
  if (legacySession) {
    state.session = {
      tabs: Array.isArray(legacySession.tabs) ? legacySession.tabs : [],
      activeTabIndex: typeof legacySession.activeTabIndex === 'number' ? legacySession.activeTabIndex : 0,
      closedTabs: Array.isArray(legacySession.closedTabs) ? legacySession.closedTabs : []
    }
  }

  const legacyWindowState = readLegacyJson<Partial<WindowState>>(LEGACY_WINDOW_STATE_FILE)
  if (legacyWindowState) {
    state.windowState = legacyWindowState
  }

  writeAppState(state)

  for (const path of legacyPaths) {
    if (existsSync(path)) {
      unlinkSync(path)
    }
  }
}
