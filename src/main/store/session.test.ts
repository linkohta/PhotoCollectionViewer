import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MAX_CLOSED_TABS } from '../../shared/constants'
import type { SessionData, TabGroup, TabSnapshot } from '../../shared/types'
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

const group: TabGroup = { id: 'group-1', name: 'Trips', color: 'blue', collapsed: false }

const EMPTY_SESSION: SessionData = { tabs: [], activeTabIndex: 0, closedTabs: [], groups: [] }

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
    expect(getSession()).toEqual(EMPTY_SESSION)
  })

  it('returns the saved session', () => {
    const saved: SessionData = {
      tabs: [{ ...snapshot, groupId: group.id }],
      activeTabIndex: 0,
      closedTabs: [snapshot],
      groups: [group]
    }
    writeSavedSession(saved)

    expect(getSession()).toEqual(saved)
  })

  it.each([
    [{ activeTabIndex: 2 }, { ...EMPTY_SESSION, activeTabIndex: 2 }],
    [
      { tabs: [snapshot], activeTabIndex: '1', closedTabs: 'none', groups: 'none' },
      { ...EMPTY_SESSION, tabs: [snapshot] }
    ],
    ['not a session', EMPTY_SESSION],
    [null, EMPTY_SESSION]
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

    saveSession({ tabs: [snapshot], activeTabIndex: 0, closedTabs, groups: [] })

    const saved = JSON.parse(readFileSync(storePath(), 'utf-8')).session
    expect(saved.closedTabs).toHaveLength(MAX_CLOSED_TABS)
    expect(getSession().closedTabs).toEqual(closedTabs.slice(0, MAX_CLOSED_TABS))
  })

  it('keeps the tab groups', () => {
    const tabs = [{ ...snapshot, groupId: group.id }]

    saveSession({ tabs, activeTabIndex: 0, closedTabs: [], groups: [group] })

    expect(getSession()).toMatchObject({ tabs, groups: [group] })
  })
})
