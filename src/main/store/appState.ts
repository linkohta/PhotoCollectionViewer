import { readFileSync, renameSync, writeFileSync, existsSync, unlinkSync } from 'fs'
import { join } from 'path'
import { app } from 'electron'
import { writeFileAtomicSync } from '../utils/atomicWrite'
import { getAppRootFilePath, getLegacyAppRootDir } from './appRoot'
import type { ConfirmationSettings, FavoriteFolder, SessionData } from '../../shared/types'

const LEGACY_FAVORITES_FILE = 'favorites.json'
const LEGACY_SESSION_FILE = 'session.json'
const LEGACY_WINDOW_STATE_FILE = 'window-state.json'

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
  confirmations: ConfirmationSettings
}

const DEFAULT_CONFIRMATIONS: ConfirmationSettings = {
  extractZip: true,
  deleteFolder: true,
  importSettings: true
}

function defaultAppState(): AppState {
  return {
    favorites: [],
    session: { tabs: [], activeTabIndex: 0, closedTabs: [] },
    windowState: {},
    confirmations: { ...DEFAULT_CONFIRMATIONS }
  }
}

// Missing or non-boolean entries (e.g. an app-state.json written by an older
// version) fall back to showing the dialog.
function normalizeConfirmations(value: unknown): ConfirmationSettings {
  const data = (typeof value === 'object' && value !== null ? value : {}) as Record<string, unknown>
  const pick = (key: keyof ConfirmationSettings): boolean => {
    const entry = data[key]
    return typeof entry === 'boolean' ? entry : DEFAULT_CONFIRMATIONS[key]
  }
  return {
    extractZip: pick('extractZip'),
    deleteFolder: pick('deleteFolder'),
    importSettings: pick('importSettings')
  }
}

// Fills in what a parsed app-state.json, or an imported settings file, lacks.
function normalizeAppState(data: Partial<AppState>): AppState {
  return {
    favorites: Array.isArray(data.favorites) ? data.favorites : [],
    session: normalizeSession(data.session),
    windowState: data.windowState ?? {},
    confirmations: normalizeConfirmations(data.confirmations)
  }
}

// The renderer restores tabs straight from the session, so it always gets
// lists and a number, whatever the file holds.
function normalizeSession(value: unknown): SessionData {
  const data = (typeof value === 'object' && value !== null ? value : {}) as Partial<SessionData>
  return {
    tabs: Array.isArray(data.tabs) ? data.tabs : [],
    activeTabIndex: typeof data.activeTabIndex === 'number' ? data.activeTabIndex : 0,
    closedTabs: Array.isArray(data.closedTabs) ? data.closedTabs : []
  }
}

function getStorePath(): string {
  return getAppRootFilePath('app-state.json')
}

interface LoadedAppState {
  state: AppState
  // false when app-state.json exists but could neither be read nor moved
  // aside: writing then would replace settings that are still on disk.
  writable: boolean
}

function loadAppState(): LoadedAppState {
  const storePath = getStorePath()

  let raw: string
  try {
    raw = readFileSync(storePath, 'utf-8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return { state: defaultAppState(), writable: true }
    }
    console.warn('app-state.json could not be read, so changes will not be saved', error)
    return { state: defaultAppState(), writable: false }
  }

  try {
    return { state: normalizeAppState(JSON.parse(raw) as Partial<AppState>), writable: true }
  } catch {
    return { state: defaultAppState(), writable: moveCorruptStoreAside(storePath) }
  }
}

// An app-state.json that is not valid JSON is renamed instead of being
// overwritten with the defaults, so what it held (favorites, session) can
// still be recovered by hand.
function moveCorruptStoreAside(storePath: string): boolean {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupPath = getAppRootFilePath(`app-state.corrupt-${stamp}.json`)
  try {
    renameSync(storePath, backupPath)
    console.warn(`app-state.json was not valid JSON and has been moved to ${backupPath}`)
    return true
  } catch (error) {
    console.warn('app-state.json is not valid JSON and could not be moved aside', error)
    return false
  }
}

function readAppState(): AppState {
  return loadAppState().state
}

function writeAppState(state: AppState): void {
  writeFileAtomicSync(getStorePath(), JSON.stringify(state, null, 2))
}

export function exportAppState(destPath: string): void {
  const state = readAppState()
  writeFileSync(destPath, JSON.stringify(state, null, 2), 'utf-8')
}

export function importAppState(srcPath: string): AppState {
  const state = normalizeAppState(JSON.parse(readFileSync(srcPath, 'utf-8')) as Partial<AppState>)
  writeAppState(state)
  return state
}

export function readAppStateSlice<K extends keyof AppState>(key: K): AppState[K] {
  return readAppState()[key]
}

export function writeAppStateSlice<K extends keyof AppState>(key: K, value: AppState[K]): void {
  const { state, writable } = loadAppState()
  if (!writable) return
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
    writeFileAtomicSync(currentStorePath, raw)
  } catch {
    // 読み込みに失敗した場合は何もしない(初期状態で起動)
  }
}

export function migrateLegacyStoreFiles(): void {
  migrateLegacyAppStateFile()

  const legacyPaths = [LEGACY_FAVORITES_FILE, LEGACY_SESSION_FILE, LEGACY_WINDOW_STATE_FILE].map(
    (filename) => getAppRootFilePath(filename)
  )
  if (!legacyPaths.some((path) => existsSync(path))) return

  const { state, writable } = loadAppState()
  if (!writable) return

  const legacyFavorites = readLegacyJson<FavoriteFolder[]>(LEGACY_FAVORITES_FILE)
  if (Array.isArray(legacyFavorites)) {
    state.favorites = legacyFavorites
  }

  const legacySession = readLegacyJson<Partial<SessionData>>(LEGACY_SESSION_FILE)
  if (legacySession) {
    state.session = normalizeSession(legacySession)
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
