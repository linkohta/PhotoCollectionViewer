import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'fs'
import { join } from 'path'
import { app } from 'electron'
import { getAppRootFilePath, getLegacyAppRootDir } from './appRoot'
import type {
  ConfirmationSettings,
  TabKind,
  YouTubeChannel,
  YouTubeSource
} from '../../preload/types'

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
  kind?: TabKind
  youtubeSource?: YouTubeSource | null
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

export interface YouTubeState {
  // base64 of safeStorage.encryptString(apiKey). Machine/user-bound, so it is
  // left out of exported settings files.
  encryptedApiKey: string | null
  channels: YouTubeChannel[]
}

export interface AppState {
  favorites: FavoriteFolder[]
  session: SessionData
  windowState: Partial<WindowState>
  confirmations: ConfirmationSettings
  youtube: YouTubeState
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
    confirmations: { ...DEFAULT_CONFIRMATIONS },
    youtube: { encryptedApiKey: null, channels: [] }
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

function isYouTubeChannel(value: unknown): value is YouTubeChannel {
  if (typeof value !== 'object' || value === null) return false
  const channel = value as Record<string, unknown>
  return typeof channel['id'] === 'string' && typeof channel['title'] === 'string'
}

function normalizeYouTube(value: unknown): YouTubeState {
  const data = (typeof value === 'object' && value !== null ? value : {}) as Record<string, unknown>
  const channels = Array.isArray(data['channels']) ? data['channels'] : []
  return {
    encryptedApiKey: typeof data['encryptedApiKey'] === 'string' ? data['encryptedApiKey'] : null,
    channels: channels.filter(isYouTubeChannel).map((channel) => ({
      id: channel.id,
      title: channel.title,
      thumbnailUrl: typeof channel.thumbnailUrl === 'string' ? channel.thumbnailUrl : null,
      addedAt: typeof channel.addedAt === 'number' ? channel.addedAt : 0
    }))
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
      windowState: data.windowState ?? {},
      confirmations: normalizeConfirmations(data.confirmations),
      youtube: normalizeYouTube(data.youtube)
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
  const exported: AppState = { ...state, youtube: { ...state.youtube, encryptedApiKey: null } }
  writeFileSync(destPath, JSON.stringify(exported, null, 2), 'utf-8')
}

export function importAppState(srcPath: string): AppState {
  const raw = readFileSync(srcPath, 'utf-8')
  const data = JSON.parse(raw) as Partial<AppState>
  const state: AppState = {
    favorites: Array.isArray(data.favorites) ? data.favorites : [],
    session: data.session ?? defaultAppState().session,
    windowState: data.windowState ?? {},
    confirmations: normalizeConfirmations(data.confirmations),
    // The encrypted API key only decrypts on the machine that stored it, so
    // keep this machine's key and take just the channel list from the file.
    youtube: {
      encryptedApiKey: readAppState().youtube.encryptedApiKey,
      channels: normalizeYouTube(data.youtube).channels
    }
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

  const legacyPaths = [LEGACY_FAVORITES_FILE, LEGACY_SESSION_FILE, LEGACY_WINDOW_STATE_FILE].map(
    (filename) => getAppRootFilePath(filename)
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
      activeTabIndex:
        typeof legacySession.activeTabIndex === 'number' ? legacySession.activeTabIndex : 0,
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
