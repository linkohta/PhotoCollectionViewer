import { describe, expect, it } from 'vitest'
import { createEmptyTab, type FolderHistoryEntry, type TabState } from '../types/tab'
import { nextFolderHistory } from './folderHistory'

const ROOT = 'C:\\Photos'

const tabShowing = (folderPath: string, history: FolderHistoryEntry[] = []): TabState => ({
  ...createEmptyTab(),
  rootFolderPath: ROOT,
  collection: {
    path: folderPath,
    name: folderPath,
    parentPath: null,
    subfolders: [],
    zipFiles: [],
    images: []
  },
  history
})

const entry = (folderPath: string): FolderHistoryEntry => ({ folderPath, rootFolderPath: ROOT })

describe('nextFolderHistory', () => {
  it('leaves the history alone when the tab has no folder open', () => {
    const tab = { ...createEmptyTab(), history: [entry('C:\\Photos\\a')] }
    expect(nextFolderHistory(tab, 'C:\\Photos\\b', 'push')).toBe(tab.history)
  })

  it('leaves the history alone when the destination is the folder already shown', () => {
    const tab = tabShowing('C:\\Photos\\a', [entry(ROOT)])
    expect(nextFolderHistory(tab, 'c:/photos/A', 'push')).toBe(tab.history)
  })

  it("'push' records the folder being left", () => {
    const tab = tabShowing('C:\\Photos\\a', [entry(ROOT)])
    expect(nextFolderHistory(tab, 'C:\\Photos\\b', 'push')).toEqual([
      entry(ROOT),
      entry('C:\\Photos\\a')
    ])
  })

  it("'back' drops the latest entry when it is the destination", () => {
    const tab = tabShowing('C:\\Photos\\b', [entry(ROOT), entry('C:\\Photos\\a')])
    expect(nextFolderHistory(tab, 'c:\\photos\\A', 'back')).toEqual([entry(ROOT)])
  })

  it("'back' keeps the history when the destination is not the latest entry", () => {
    const tab = tabShowing('C:\\Photos\\b', [entry(ROOT), entry('C:\\Photos\\a')])
    expect(nextFolderHistory(tab, ROOT, 'back')).toBe(tab.history)
  })

  it('keeps only the 50 most recent entries', () => {
    const history = Array.from({ length: 50 }, (_, index) => entry(`C:\\Photos\\${index}`))
    const next = nextFolderHistory(tabShowing('C:\\Photos\\current', history), ROOT, 'push')

    expect(next).toHaveLength(50)
    expect(next[0]).toEqual(entry('C:\\Photos\\1'))
    expect(next[49]).toEqual(entry('C:\\Photos\\current'))
  })
})
