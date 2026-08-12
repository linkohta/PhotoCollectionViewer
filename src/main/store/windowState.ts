import { readFileSync, writeFileSync, existsSync } from 'fs'
import { screen, type BrowserWindow } from 'electron'
import { getAppRootFilePath } from './appRoot'

export interface WindowState {
  width: number
  height: number
  x?: number
  y?: number
  isMaximized?: boolean
}

const DEFAULT_STATE: WindowState = {
  width: 1280,
  height: 800
}

const MIN_WIDTH = 900
const MIN_HEIGHT = 600

function getStorePath(): string {
  return getAppRootFilePath('window-state.json')
}

function isPositionVisible(state: WindowState): boolean {
  if (state.x === undefined || state.y === undefined) return true

  const windowRect = {
    x: state.x,
    y: state.y,
    width: state.width,
    height: state.height
  }

  return screen.getAllDisplays().some((display) => {
    const area = display.workArea
    return (
      windowRect.x < area.x + area.width &&
      windowRect.x + windowRect.width > area.x &&
      windowRect.y < area.y + area.height &&
      windowRect.y + windowRect.height > area.y
    )
  })
}

function normalizeState(state: WindowState): WindowState {
  const width = Math.max(MIN_WIDTH, Math.round(state.width))
  const height = Math.max(MIN_HEIGHT, Math.round(state.height))

  const normalized: WindowState = {
    width,
    height,
    isMaximized: Boolean(state.isMaximized)
  }

  if (state.x !== undefined && state.y !== undefined && isPositionVisible({ ...normalized, x: state.x, y: state.y })) {
    normalized.x = Math.round(state.x)
    normalized.y = Math.round(state.y)
  }

  return normalized
}

export function getWindowState(): WindowState {
  const storePath = getStorePath()
  if (!existsSync(storePath)) {
    return DEFAULT_STATE
  }

  try {
    const raw = readFileSync(storePath, 'utf-8')
    const data = JSON.parse(raw) as WindowState
    return normalizeState({
      width: typeof data.width === 'number' ? data.width : DEFAULT_STATE.width,
      height: typeof data.height === 'number' ? data.height : DEFAULT_STATE.height,
      x: typeof data.x === 'number' ? data.x : undefined,
      y: typeof data.y === 'number' ? data.y : undefined,
      isMaximized: Boolean(data.isMaximized)
    })
  } catch {
    return DEFAULT_STATE
  }
}

export function saveWindowState(state: WindowState): WindowState {
  const normalized = normalizeState(state)
  writeFileSync(getStorePath(), JSON.stringify(normalized, null, 2), 'utf-8')
  return normalized
}

export function trackWindowState(window: BrowserWindow): void {
  let saveTimer: NodeJS.Timeout | null = null

  const persist = (): void => {
    if (window.isDestroyed()) return

    const isMaximized = window.isMaximized()
    const bounds = isMaximized ? window.getNormalBounds() : window.getBounds()

    saveWindowState({
      width: bounds.width,
      height: bounds.height,
      x: bounds.x,
      y: bounds.y,
      isMaximized
    })
  }

  const debouncedPersist = (): void => {
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(persist, 400)
  }

  window.on('resize', debouncedPersist)
  window.on('move', debouncedPersist)
  window.on('close', () => {
    if (saveTimer) clearTimeout(saveTimer)
    persist()
  })
}
