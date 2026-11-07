import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { FavoriteFolder, TabSnapshot } from '../../preload/types'
import {
  exportAppState,
  importAppState,
  migrateLegacyStoreFiles,
  readAppStateSlice,
  writeAppStateSlice
} from './appState'

const env = vi.hoisted(() => ({ appRootDir: '', legacyAppRootDir: '', isPackaged: false }))

vi.mock('electron', () => ({
  app: {
    get isPackaged(): boolean {
      return env.isPackaged
    }
  }
}))

vi.mock('./appRoot', async () => {
  const { join } = await import('path')
  return {
    getAppRootFilePath: (filename: string): string => join(env.appRootDir, filename),
    getLegacyAppRootDir: (): string => env.legacyAppRootDir
  }
})

const DEFAULT_SESSION = { tabs: [], activeTabIndex: 0, closedTabs: [] }
const DEFAULT_CONFIRMATIONS = { extractZip: true, deleteFolder: true, importSettings: true }

const favorite: FavoriteFolder = { path: 'C:\\Photos', name: 'Photos', addedAt: 1700000000000 }
const snapshot: TabSnapshot = {
  title: 'Photos',
  rootFolderPath: 'C:\\Photos',
  currentFolderPath: 'C:\\Photos',
  selectedIndex: null,
  viewMode: 'grid'
}

const storePath = (): string => join(env.appRootDir, 'app-state.json')
const writeJson = (path: string, value: unknown): void => writeFileSync(path, JSON.stringify(value))

beforeEach(() => {
  env.appRootDir = mkdtempSync(join(tmpdir(), 'pcv-state-'))
  env.legacyAppRootDir = mkdtempSync(join(tmpdir(), 'pcv-legacy-'))
  env.isPackaged = false
})

afterEach(() => {
  rmSync(env.appRootDir, { recursive: true, force: true })
  rmSync(env.legacyAppRootDir, { recursive: true, force: true })
})

describe('reading and writing slices', () => {
  it('returns the defaults when there is no settings file', () => {
    expect(readAppStateSlice('favorites')).toEqual([])
    expect(readAppStateSlice('session')).toEqual(DEFAULT_SESSION)
    expect(readAppStateSlice('windowState')).toEqual({})
    expect(readAppStateSlice('confirmations')).toEqual(DEFAULT_CONFIRMATIONS)
  })

  it('writes one slice at a time, keeping the others', () => {
    writeAppStateSlice('favorites', [favorite])
    writeAppStateSlice('windowState', { width: 1000, height: 700 })

    expect(readAppStateSlice('favorites')).toEqual([favorite])
    expect(readAppStateSlice('windowState')).toEqual({ width: 1000, height: 700 })
  })

  it('stores the whole state as indented JSON', () => {
    writeAppStateSlice('favorites', [favorite])

    expect(readFileSync(storePath(), 'utf-8')).toBe(
      JSON.stringify(
        {
          favorites: [favorite],
          session: DEFAULT_SESSION,
          windowState: {},
          confirmations: DEFAULT_CONFIRMATIONS
        },
        null,
        2
      )
    )
  })

  it('fills in missing or invalid entries when reading', () => {
    writeJson(storePath(), {
      favorites: 'not a list',
      confirmations: { extractZip: false, deleteFolder: 'no' }
    })

    expect(readAppStateSlice('favorites')).toEqual([])
    expect(readAppStateSlice('session')).toEqual(DEFAULT_SESSION)
    expect(readAppStateSlice('windowState')).toEqual({})
    expect(readAppStateSlice('confirmations')).toEqual({
      extractZip: false,
      deleteFolder: true,
      importSettings: true
    })
  })

  it('reads a file that cannot be parsed as the defaults', () => {
    writeFileSync(storePath(), '{"favorites": [')

    expect(readAppStateSlice('favorites')).toEqual([])
  })

  // F1: the next write replaces the unreadable file with the defaults, so its
  // contents (favorites, session) are lost for good.
  it.fails('keeps the contents of an unreadable settings file when writing', () => {
    const corrupt = `{"favorites": [${JSON.stringify(favorite)}`
    writeFileSync(storePath(), corrupt)

    writeAppStateSlice('session', DEFAULT_SESSION)

    const preserved = readdirSync(env.appRootDir).some(
      (name) => readFileSync(join(env.appRootDir, name), 'utf-8') === corrupt
    )
    expect(preserved).toBe(true)
  })
})

describe('export and import', () => {
  it('exports the current settings to the chosen file', () => {
    writeAppStateSlice('favorites', [favorite])
    const destPath = join(env.appRootDir, 'exported.json')

    exportAppState(destPath)

    expect(JSON.parse(readFileSync(destPath, 'utf-8'))).toEqual({
      favorites: [favorite],
      session: DEFAULT_SESSION,
      windowState: {},
      confirmations: DEFAULT_CONFIRMATIONS
    })
  })

  it('imports a settings file, filling in missing entries', () => {
    const srcPath = join(env.appRootDir, 'import.json')
    writeJson(srcPath, { favorites: [favorite], confirmations: { importSettings: false } })

    const expected = {
      favorites: [favorite],
      session: DEFAULT_SESSION,
      windowState: {},
      confirmations: { ...DEFAULT_CONFIRMATIONS, importSettings: false }
    }
    expect(importAppState(srcPath)).toEqual(expected)
    expect(JSON.parse(readFileSync(storePath(), 'utf-8'))).toEqual(expected)
  })

  it('rejects a file that is not JSON and leaves the current settings alone', () => {
    writeAppStateSlice('favorites', [favorite])
    const srcPath = join(env.appRootDir, 'import.json')
    writeFileSync(srcPath, 'not json')

    expect(() => importAppState(srcPath)).toThrow()
    expect(readAppStateSlice('favorites')).toEqual([favorite])
  })
})

describe('migrating settings from older versions', () => {
  it('copies app-state.json from the install folder in packaged builds', () => {
    env.isPackaged = true
    writeJson(join(env.legacyAppRootDir, 'app-state.json'), { favorites: [favorite] })

    migrateLegacyStoreFiles()

    expect(readAppStateSlice('favorites')).toEqual([favorite])
  })

  it('does not look at the install folder in development', () => {
    writeJson(join(env.legacyAppRootDir, 'app-state.json'), { favorites: [favorite] })

    migrateLegacyStoreFiles()

    expect(existsSync(storePath())).toBe(false)
  })

  it('keeps existing settings over the copy in the install folder', () => {
    env.isPackaged = true
    const current: FavoriteFolder = { ...favorite, path: 'D:\\Current', name: 'Current' }
    writeAppStateSlice('favorites', [current])
    writeJson(join(env.legacyAppRootDir, 'app-state.json'), { favorites: [favorite] })

    migrateLegacyStoreFiles()

    expect(readAppStateSlice('favorites')).toEqual([current])
  })

  it('merges the separate files of older versions and deletes them', () => {
    writeJson(join(env.appRootDir, 'favorites.json'), [favorite])
    writeJson(join(env.appRootDir, 'session.json'), { tabs: [snapshot], activeTabIndex: 2 })
    writeJson(join(env.appRootDir, 'window-state.json'), { width: 1200, height: 800 })

    migrateLegacyStoreFiles()

    expect(readAppStateSlice('favorites')).toEqual([favorite])
    expect(readAppStateSlice('session')).toEqual({
      tabs: [snapshot],
      activeTabIndex: 2,
      closedTabs: []
    })
    expect(readAppStateSlice('windowState')).toEqual({ width: 1200, height: 800 })
    expect(readdirSync(env.appRootDir)).toEqual(['app-state.json'])
  })

  it('skips separate files that cannot be parsed but still deletes them', () => {
    writeFileSync(join(env.appRootDir, 'favorites.json'), 'broken')
    writeJson(join(env.appRootDir, 'session.json'), { tabs: [snapshot] })

    migrateLegacyStoreFiles()

    expect(readAppStateSlice('favorites')).toEqual([])
    expect(readAppStateSlice('session').tabs).toEqual([snapshot])
    expect(readdirSync(env.appRootDir)).toEqual(['app-state.json'])
  })
})
