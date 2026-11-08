import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MAX_CLOSED_TABS } from '../../shared/constants'
import type { TabSnapshot } from '../../shared/types'
import { getSession, saveSession } from './session'

const env = vi.hoisted(() => ({ appRootDir: '' }))

vi.mock('electron', () => ({ app: { isPackaged: false } }))

vi.mock('./appRoot', async () => {
  const { join } = await import('path')
  return {
    getAppRootFilePath: (filename: string): string => join(env.appRootDir, filename),
    getLegacyAppRootDir: (): string => env.appRootDir
  }
})

const snapshot: TabSnapshot = {
  title: 'Photos',
  rootFolderPath: 'C:\\Photos',
  currentFolderPath: 'C:\\Photos',
  selectedIndex: null,
  viewMode: 'grid'
}

const storePath = (): string => join(env.appRootDir, 'app-state.json')
const writeSavedSession = (session: unknown): void =>
  writeFileSync(storePath(), JSON.stringify({ session }))

beforeEach(() => {
  env.appRootDir = mkdtempSync(join(tmpdir(), 'pcv-session-'))
})

afterEach(() => {
  rmSync(env.appRootDir, { recursive: true, force: true })
})

// The renderer restores tabs straight from what getSession returns, so it
// must always get lists and a number, whatever the file holds.
describe('getSession', () => {
  it('returns an empty session without a settings file', () => {
    expect(getSession()).toEqual({ tabs: [], activeTabIndex: 0, closedTabs: [] })
  })

  it('returns the saved session', () => {
    writeSavedSession({ tabs: [snapshot], activeTabIndex: 0, closedTabs: [snapshot] })

    expect(getSession()).toEqual({ tabs: [snapshot], activeTabIndex: 0, closedTabs: [snapshot] })
  })

  it.each([
    [{ activeTabIndex: 2 }, { tabs: [], activeTabIndex: 2, closedTabs: [] }],
    [
      { tabs: [snapshot], activeTabIndex: '1', closedTabs: 'none' },
      { tabs: [snapshot], activeTabIndex: 0, closedTabs: [] }
    ],
    ['not a session', { tabs: [], activeTabIndex: 0, closedTabs: [] }],
    [null, { tabs: [], activeTabIndex: 0, closedTabs: [] }]
  ])('fills in what the saved session %j lacks', (saved, expected) => {
    writeSavedSession(saved)

    expect(getSession()).toEqual(expected)
  })
})

describe('saveSession', () => {
  it(`keeps at most ${MAX_CLOSED_TABS} closed tabs`, () => {
    const closedTabs = Array.from({ length: MAX_CLOSED_TABS + 5 }, (_, i) => ({
      ...snapshot,
      title: `${i}`
    }))

    saveSession({ tabs: [snapshot], activeTabIndex: 0, closedTabs })

    const saved = JSON.parse(readFileSync(storePath(), 'utf-8')).session
    expect(saved.closedTabs).toHaveLength(MAX_CLOSED_TABS)
    expect(getSession().closedTabs).toEqual(closedTabs.slice(0, MAX_CLOSED_TABS))
  })
})
