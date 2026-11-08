import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { FolderCollection, ImageFile, TabSnapshot } from '../../../shared/types'
import { restoreTabFromSnapshot } from './restoreTab'

const imagesNamed = (...names: string[]): ImageFile[] =>
  names.map((name) => ({
    path: `C:\\Photos\\2024\\${name}`,
    name,
    size: 1,
    modified: 0,
    mediaType: 'image'
  }))

const collectionAt = (path: string, name: string, images: ImageFile[] = []): FolderCollection => ({
  path,
  name,
  parentPath: null,
  subfolders: [],
  zipFiles: [],
  images
})

describe('restoreTabFromSnapshot', () => {
  const scanFolder = vi.fn<(folderPath: string, rootPath?: string) => Promise<FolderCollection>>()

  const snapshot = (overrides: Partial<TabSnapshot>): TabSnapshot => ({
    title: 'saved title',
    rootFolderPath: 'C:\\Photos',
    currentFolderPath: 'C:\\Photos\\2024',
    selectedIndex: null,
    viewMode: 'grid',
    ...overrides
  })

  beforeEach(() => {
    vi.stubGlobal('window', { photoCollection: { scanFolder } })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    scanFolder.mockReset()
  })

  it('restores an empty tab without scanning when no folder was open', async () => {
    const tab = await restoreTabFromSnapshot(
      snapshot({ title: '新しいタブ', rootFolderPath: null, currentFolderPath: null })
    )

    expect(scanFolder).not.toHaveBeenCalled()
    expect(tab).toMatchObject({ title: '新しいタブ', collection: null, rootFolderPath: null })
  })

  it('rescans the saved folder and takes the title from it', async () => {
    scanFolder.mockResolvedValue(
      collectionAt('C:\\Photos\\2024', '2024', imagesNamed('a.jpg', 'b.jpg', 'c.jpg'))
    )

    const tab = await restoreTabFromSnapshot(snapshot({ selectedIndex: 1, viewMode: 'viewer' }))

    expect(scanFolder).toHaveBeenCalledWith('C:\\Photos\\2024', 'C:\\Photos')
    expect(tab).toMatchObject({
      title: '2024',
      rootFolderPath: 'C:\\Photos',
      selectedIndex: 1,
      viewMode: 'viewer',
      loading: false,
      error: null
    })
    expect(tab.collection?.path).toBe('C:\\Photos\\2024')
  })

  it('uses the open folder as the root when none was saved', async () => {
    scanFolder.mockResolvedValue(collectionAt('C:\\Photos', 'Photos'))

    const tab = await restoreTabFromSnapshot(
      snapshot({ rootFolderPath: null, currentFolderPath: 'C:\\Photos' })
    )

    expect(scanFolder).toHaveBeenCalledWith('C:\\Photos', 'C:\\Photos')
    expect(tab.rootFolderPath).toBe('C:\\Photos')
  })

  it('moves a selection that no longer fits back to the first image', async () => {
    scanFolder.mockResolvedValue(
      collectionAt('C:\\Photos\\2024', '2024', imagesNamed('a.jpg', 'b.jpg'))
    )

    const tab = await restoreTabFromSnapshot(snapshot({ selectedIndex: 5, viewMode: 'viewer' }))

    expect(tab).toMatchObject({ selectedIndex: 0, viewMode: 'viewer' })
  })

  it('falls back to the grid when the folder no longer has images', async () => {
    scanFolder.mockResolvedValue(collectionAt('C:\\Photos\\2024', '2024'))

    const tab = await restoreTabFromSnapshot(snapshot({ selectedIndex: 0, viewMode: 'viewer' }))

    expect(tab).toMatchObject({ selectedIndex: null, viewMode: 'grid' })
  })

  it('shows an error in the grid when the folder can no longer be read', async () => {
    scanFolder.mockRejectedValue(new Error('ENOENT'))

    const tab = await restoreTabFromSnapshot(snapshot({ selectedIndex: 2, viewMode: 'viewer' }))

    expect(tab).toMatchObject({
      collection: null,
      error: 'フォルダを読み込めませんでした',
      loading: false,
      selectedIndex: null,
      viewMode: 'grid'
    })
  })
})
