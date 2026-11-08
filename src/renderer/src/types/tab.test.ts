import { describe, expect, it } from 'vitest'
import type { FolderCollection, ImageFile } from '../../../shared/types'
import { createEmptyTab, getTabTitle, hasRestorableContent, tabToSnapshot } from './tab'

const collectionAt = (path: string, name: string, images: ImageFile[] = []): FolderCollection => ({
  path,
  name,
  parentPath: null,
  subfolders: [],
  zipFiles: [],
  images
})

describe('createEmptyTab', () => {
  it('creates a blank grid tab with a unique id', () => {
    const tab = createEmptyTab()

    expect(tab).toMatchObject({
      title: '新しいタブ',
      collection: null,
      rootFolderPath: null,
      selectedIndex: null,
      viewMode: 'grid',
      loading: false,
      error: null,
      history: []
    })
    expect(createEmptyTab().id).not.toBe(tab.id)
  })
})

describe('getTabTitle', () => {
  it('prefers the open folder name, then the last segment of the root', () => {
    expect(getTabTitle(collectionAt('C:\\Photos\\2024', '2024'), 'C:\\Photos')).toBe('2024')
    expect(getTabTitle(null, 'C:\\Photos\\')).toBe('Photos')
    expect(getTabTitle(null, 'D:\\')).toBe('D:')
    expect(getTabTitle(null, null)).toBe('新しいタブ')
  })
})

describe('tabToSnapshot / hasRestorableContent', () => {
  it('keeps what is needed to reopen the tab', () => {
    const tab = {
      ...createEmptyTab(),
      title: '2024',
      rootFolderPath: 'C:\\Photos',
      collection: collectionAt('C:\\Photos\\2024', '2024'),
      selectedIndex: 3,
      viewMode: 'viewer' as const
    }

    expect(tabToSnapshot(tab)).toEqual({
      title: '2024',
      rootFolderPath: 'C:\\Photos',
      currentFolderPath: 'C:\\Photos\\2024',
      selectedIndex: 3,
      viewMode: 'viewer'
    })
    expect(hasRestorableContent(tab)).toBe(true)
    expect(hasRestorableContent(createEmptyTab())).toBe(false)
  })
})
