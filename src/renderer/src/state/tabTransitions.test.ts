import { describe, expect, it } from 'vitest'
import type { FolderCollection, ImageFile, Subfolder } from '../../../shared/types'
import { createEmptyTab, type TabState } from '../types/tab'
import {
  findTab,
  planViewerExit,
  removeImage,
  removeSubfolder,
  selectImage,
  showGrid,
  stepImage
} from './tabTransitions'

const ROOT = 'C:\\Photos'
const FOLDER = 'C:\\Photos\\2024'

const imagesNamed = (...names: string[]): ImageFile[] =>
  names.map((name) => ({
    path: `${FOLDER}\\${name}`,
    name,
    size: 1,
    modified: 0,
    mediaType: 'image'
  }))

const subfoldersNamed = (...names: string[]): Subfolder[] =>
  names.map((name) => ({ path: `${FOLDER}\\${name}`, name }))

const collection = (overrides: Partial<FolderCollection> = {}): FolderCollection => ({
  path: FOLDER,
  name: '2024',
  parentPath: ROOT,
  subfolders: subfoldersNamed('trip'),
  zipFiles: [],
  images: imagesNamed('a.png', 'b.png', 'c.png'),
  ...overrides
})

// A tab showing FOLDER (below ROOT) with three images and a subfolder.
const tabWith = (overrides: Partial<TabState> = {}): TabState => ({
  ...createEmptyTab(),
  rootFolderPath: ROOT,
  collection: collection(),
  ...overrides
})

const imagePath = (name: string): string => `${FOLDER}\\${name}`

describe('findTab', () => {
  it('finds a tab by id', () => {
    const [a, b] = [createEmptyTab(), createEmptyTab()]

    expect(findTab([a, b], b.id)).toBe(b)
    expect(findTab([a, b], 'missing')).toBeUndefined()
  })
})

describe('selectImage', () => {
  it('opens the image in the viewer, as opened by hand', () => {
    const tab = selectImage(
      tabWith({ highlightPath: imagePath('a.png'), returnToParentOnCloseViewer: true }),
      2
    )

    expect(tab).toMatchObject({
      selectedIndex: 2,
      viewMode: 'viewer',
      returnToParentOnCloseViewer: false,
      highlightPath: null
    })
  })
})

describe('stepImage', () => {
  it('moves to the next or previous image, wrapping around at both ends', () => {
    const viewing = (selectedIndex: number): TabState => tabWith({ selectedIndex })

    expect(stepImage(viewing(0), 1).selectedIndex).toBe(1)
    expect(stepImage(viewing(2), 1).selectedIndex).toBe(0)
    expect(stepImage(viewing(0), -1).selectedIndex).toBe(2)
  })

  it('leaves a tab without a selection or images alone', () => {
    const noSelection = tabWith({ selectedIndex: null })
    const noImages = tabWith({ selectedIndex: 0, collection: collection({ images: [] }) })

    expect(stepImage(noSelection, 1)).toBe(noSelection)
    expect(stepImage(noImages, 1)).toBe(noImages)
  })
})

describe('removeImage', () => {
  const viewing = (selectedIndex: number | null, names = ['a.png', 'b.png', 'c.png']): TabState =>
    tabWith({
      selectedIndex,
      viewMode: selectedIndex === null ? 'grid' : 'viewer',
      collection: collection({ images: imagesNamed(...names) })
    })

  const names = (tab: TabState): string[] => tab.collection!.images.map((image) => image.name)

  it('drops the image and keeps the viewer at the same position', () => {
    const tab = removeImage(viewing(1), imagePath('b.png'))

    expect(names(tab)).toEqual(['a.png', 'c.png'])
    expect([tab.selectedIndex, tab.viewMode]).toEqual([1, 'viewer'])
  })

  it('moves to the new last image when the last one was removed', () => {
    expect(removeImage(viewing(2), imagePath('c.png')).selectedIndex).toBe(1)
  })

  it('returns to the grid when no image is left', () => {
    const tab = removeImage(viewing(0, ['a.png']), imagePath('a.png'))

    expect([tab.selectedIndex, tab.viewMode]).toEqual([null, 'grid'])
  })

  it('keeps the grid as it is when nothing was selected', () => {
    const tab = removeImage(viewing(null), imagePath('a.png'))

    expect([tab.selectedIndex, tab.viewMode]).toEqual([null, 'grid'])
  })

  it('clears the highlight when it was on the removed image', () => {
    const highlighted = (path: string): TabState => ({ ...viewing(null), highlightPath: path })

    expect(removeImage(highlighted(imagePath('a.png')), imagePath('a.png')).highlightPath).toBe(
      null
    )
    expect(removeImage(highlighted(imagePath('b.png')), imagePath('a.png')).highlightPath).toBe(
      imagePath('b.png')
    )
  })

  it('leaves the tab alone for an image it does not show', () => {
    const tab = viewing(0)

    expect(removeImage(tab, imagePath('other.png'))).toBe(tab)
  })
})

describe('removeSubfolder', () => {
  const deleted = `${FOLDER}\\trip`

  it('drops the folder, ignoring letter case', () => {
    const tab = removeSubfolder(
      tabWith({ collection: collection({ subfolders: subfoldersNamed('trip', 'work') }) }),
      deleted.toUpperCase()
    )

    expect(tab.collection!.subfolders.map((folder) => folder.name)).toEqual(['work'])
  })

  it('clears a highlight in or below the folder', () => {
    const highlighted = (path: string): string | null =>
      removeSubfolder(tabWith({ highlightPath: path }), deleted).highlightPath

    expect(highlighted(deleted)).toBeNull()
    expect(highlighted(`${deleted}\\1.png`)).toBeNull()
    expect(highlighted(`${deleted}-old`)).toBe(`${deleted}-old`)
  })

  it('forgets "←" history entries in or below the folder', () => {
    const tab = removeSubfolder(
      tabWith({
        history: [
          { folderPath: ROOT, rootFolderPath: ROOT },
          { folderPath: `${deleted}\\day1`, rootFolderPath: ROOT }
        ]
      }),
      deleted
    )

    expect(tab.history).toEqual([{ folderPath: ROOT, rootFolderPath: ROOT }])
  })
})

describe('planViewerExit', () => {
  const imageOnly = collection({ subfolders: [] })

  it('goes up from a viewer opened automatically, highlighting the folder', () => {
    expect(
      planViewerExit(tabWith({ returnToParentOnCloseViewer: true, selectedIndex: 0 }))
    ).toEqual({
      type: 'browse',
      folderPath: ROOT,
      rootFolderPath: ROOT,
      options: { highlightPath: FOLDER, searchQuery: undefined, historyMode: 'back' }
    })
  })

  it('goes up from a folder that holds only images, even when opened by hand', () => {
    const exit = planViewerExit(tabWith({ collection: imageOnly, selectedIndex: 1 }))

    expect(exit).toMatchObject({ type: 'browse', folderPath: ROOT })
  })

  it('returns to the subfolder search the folder was opened from', () => {
    const exit = planViewerExit(
      tabWith({
        returnToParentOnCloseViewer: true,
        returnFolderPath: 'C:\\Photos\\Albums',
        returnSearchQuery: 'trip'
      })
    )

    expect(exit).toEqual({
      type: 'browse',
      folderPath: 'C:\\Photos\\Albums',
      rootFolderPath: ROOT,
      options: { highlightPath: FOLDER, searchQuery: 'trip', historyMode: 'back' }
    })
  })

  it('reopens the folder, highlighting the last image viewed', () => {
    expect(planViewerExit(tabWith({ selectedIndex: 1 }))).toEqual({
      type: 'browse',
      folderPath: FOLDER,
      rootFolderPath: ROOT,
      options: { highlightPath: imagePath('b.png') }
    })
  })

  it('reopens an images-only folder that has no parent to go up to', () => {
    const exit = planViewerExit(
      tabWith({ collection: { ...imageOnly, parentPath: null }, selectedIndex: 0 })
    )

    expect(exit).toMatchObject({ type: 'browse', folderPath: FOLDER })
  })

  it('just shows the grid of a tab without a folder', () => {
    expect(planViewerExit(createEmptyTab())).toEqual({ type: 'showGrid', highlightPath: null })
  })
})

describe('showGrid', () => {
  it('switches to the grid with the given highlight', () => {
    const tab = showGrid(
      tabWith({ viewMode: 'viewer', returnToParentOnCloseViewer: true }),
      imagePath('a.png')
    )

    expect(tab).toMatchObject({
      viewMode: 'grid',
      returnToParentOnCloseViewer: false,
      highlightPath: imagePath('a.png')
    })
  })
})
