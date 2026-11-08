import { describe, expect, it, vi } from 'vitest'
import type { ZipArchive } from '../../../shared/types'
import { gridItemMenuEntries, type GridItem } from './gridItemMenu'

const ZIP: ZipArchive = {
  path: 'C:\\Photos\\a.zip',
  name: 'a.zip',
  size: 1,
  modified: 0,
  extractPath: 'C:\\Photos\\a',
  isExtracted: false
}

const SUBFOLDER: GridItem = { kind: 'subfolder', path: 'C:\\Photos\\trip', name: 'trip' }
const ZIP_ITEM: GridItem = { kind: 'zip', path: ZIP.path, name: ZIP.name, zipFile: ZIP }
const IMAGE: GridItem = { kind: 'image', path: 'C:\\Photos\\a.png', name: 'a.png' }

const entriesFor = (item: GridItem) => {
  const deps = {
    actions: {
      openSubfolderInNewTab: vi.fn(),
      openZipInNewTab: vi.fn(),
      moveToTrash: vi.fn()
    },
    startRenaming: vi.fn(),
    deleteSubfolder: vi.fn()
  }
  return { ...deps, entries: gridItemMenuEntries(item, deps) }
}

const offered = (item: GridItem): string[] => Object.keys(entriesFor(item).entries).sort()

describe('gridItemMenuEntries', () => {
  it('offers the entries that fit each kind of card', () => {
    expect(offered(SUBFOLDER)).toEqual(['onDelete', 'onOpenInNewTab', 'onRename'])
    expect(offered(ZIP_ITEM)).toEqual(['onOpenInNewTab', 'onRename'])
    expect(offered(IMAGE)).toEqual(['onMoveToTrash', 'onRename'])
  })

  it('opens a subfolder in a new tab and deletes it', () => {
    const { actions, deleteSubfolder, entries } = entriesFor(SUBFOLDER)

    entries.onOpenInNewTab?.()
    entries.onDelete?.()

    expect(actions.openSubfolderInNewTab).toHaveBeenCalledWith('C:\\Photos\\trip')
    expect(deleteSubfolder).toHaveBeenCalledWith('C:\\Photos\\trip')
  })

  it('opens a ZIP file in a new tab', () => {
    const { actions, entries } = entriesFor(ZIP_ITEM)

    entries.onOpenInNewTab?.()

    expect(actions.openZipInNewTab).toHaveBeenCalledWith(ZIP)
    expect(actions.openSubfolderInNewTab).not.toHaveBeenCalled()
  })

  it('moves an image to the Recycle Bin', () => {
    const { actions, entries } = entriesFor(IMAGE)

    entries.onMoveToTrash?.()

    expect(actions.moveToTrash).toHaveBeenCalledWith('C:\\Photos\\a.png')
  })

  it.each([SUBFOLDER, ZIP_ITEM, IMAGE])('starts renaming a $kind', (item) => {
    const { startRenaming, entries } = entriesFor(item)

    entries.onRename()

    expect(startRenaming).toHaveBeenCalledOnce()
  })
})
