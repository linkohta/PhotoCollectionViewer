import { describe, expect, it } from 'vitest'
import { mapViewerKey } from './viewerKeys'

describe('mapViewerKey', () => {
  it.each([
    ['Escape', 'close'],
    ['ArrowLeft', 'previous'],
    ['ArrowRight', 'next'],
    ['+', 'zoomIn'],
    ['=', 'zoomIn'],
    ['-', 'zoomOut'],
    ['0', 'resetView'],
    ['f', 'fit'],
    ['F', 'fit'],
    ['1', 'actualSize'],
    ['r', 'rotateClockwise'],
    ['R', 'rotateCounterClockwise'],
    ['Delete', 'moveToTrash']
  ])('maps %s to %s for an image', (key, command) => {
    expect(mapViewerKey(key, false)?.command).toBe(command)
  })

  it('keeps closing and moving between images, and stops other listeners from seeing them', () => {
    for (const key of ['Escape', 'ArrowLeft', 'ArrowRight']) {
      expect(mapViewerKey(key, false)).toMatchObject({
        preventDefault: true,
        stopPropagation: true
      })
      expect(mapViewerKey(key, true)).toMatchObject({ preventDefault: true, stopPropagation: true })
    }
  })

  // The browser's own handling of these keys is left alone, as before.
  it('does not prevent the default action of the view keys 0, f, 1 and r', () => {
    for (const key of ['0', 'f', 'F', '1', 'r', 'R']) {
      expect(mapViewerKey(key, false)?.preventDefault).toBeFalsy()
    }
  })

  it('leaves the zoom, fit, size and rotation keys to a video', () => {
    for (const key of ['+', '=', '-', '0', 'f', 'F', '1', 'r', 'R']) {
      expect(mapViewerKey(key, true)).toBeNull()
    }
  })

  it('moves a video to the Recycle Bin with Delete too', () => {
    expect(mapViewerKey('Delete', true)).toMatchObject({
      command: 'moveToTrash',
      preventDefault: true
    })
  })

  it('ignores other keys', () => {
    expect(mapViewerKey('a', false)).toBeNull()
    expect(mapViewerKey('Enter', false)).toBeNull()
  })
})
