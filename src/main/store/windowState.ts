import { screen, type BrowserWindow } from 'electron'
import { readAppStateSlice, writeAppStateSlice, type WindowState } from './appState'

export type { WindowState }

const DEFAULT_STATE: WindowState = {
  width: 1280,
  height: 800
}

const MIN_WIDTH = 900
const MIN_HEIGHT = 600

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

  if (
    state.x !== undefined &&
    state.y !== undefined &&
    isPositionVisible({ ...normalized, x: state.x, y: state.y })
  ) {
    normalized.x = Math.round(state.x)
    normalized.y = Math.round(state.y)
  }

  return normalized
}

export function getWindowState(): WindowState {
  const data = readAppStateSlice('windowState')
  if (typeof data.width !== 'number' || typeof data.height !== 'number') {
    return DEFAULT_STATE
  }

  return normalizeState({
    width: data.width,
    height: data.height,
    x: typeof data.x === 'number' ? data.x : undefined,
    y: typeof data.y === 'number' ? data.y : undefined,
    isMaximized: Boolean(data.isMaximized)
  })
}

export function saveWindowState(state: WindowState): WindowState {
  const normalized = normalizeState(state)
  writeAppStateSlice('windowState', normalized)
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
