import { describe, expect, it } from 'vitest'
import {
  mapViewerKey,
  VIEWER_KEY_BINDINGS,
  VIEWER_SHORTCUT_LABELS,
  viewerButtonTitle
} from './viewerKeys'

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

// The KeyboardEvent.key a label stands for: named keys are spelled out, a
// one-letter key cap is the lowercase letter and Shift+ makes it uppercase.
const NAMED_KEYS: Record<string, string> = { Esc: 'Escape', '←': 'ArrowLeft', '→': 'ArrowRight' }
const keyForLabel = (label: string): string => {
  if (label.startsWith('Shift+')) return label.slice('Shift+'.length).toUpperCase()
  return NAMED_KEYS[label] ?? (label.length === 1 ? label.toLowerCase() : label)
}

describe('VIEWER_SHORTCUT_LABELS', () => {
  it.each(Object.entries(VIEWER_SHORTCUT_LABELS))(
    'names a key that really runs %s',
    (command, label) => {
      expect(VIEWER_KEY_BINDINGS[keyForLabel(label)]?.command).toBe(command)
    }
  )
})

describe('viewerButtonTitle', () => {
  it('adds the key, then the note', () => {
    expect(viewerButtonTitle('画面に合わせる', 'fit')).toBe('画面に合わせる (F)')
    expect(viewerButtonTitle('前の画像', 'previous', '※最初で押すと最後へ')).toBe(
      '前の画像 (←) ※最初で押すと最後へ'
    )
  })
})
