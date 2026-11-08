import { describe, expect, it } from 'vitest'
import { mapGridKey, type GridKeyContext } from './gridKeys'

const press = (key: string, context: Partial<GridKeyContext> = {}, altKey = false) =>
  mapGridKey(
    { key, altKey },
    { canGoBack: true, canGoUp: true, itemCount: 5, currentIndex: 2, ...context }
  )

describe('mapGridKey', () => {
  it('goes back with Backspace or Alt+Left, and does nothing else when it cannot', () => {
    expect(press('Backspace')).toEqual({ type: 'goBack' })
    expect(press('ArrowLeft', {}, true)).toEqual({ type: 'goBack' })
    expect(press('Backspace', { canGoBack: false })).toBeNull()
    // Not a plain Left either: the highlight stays where it is.
    expect(press('ArrowLeft', { canGoBack: false }, true)).toBeNull()
  })

  it('goes up with Esc, unless the folder is the root', () => {
    expect(press('Escape')).toEqual({ type: 'goUp' })
    expect(press('Escape', { canGoUp: false })).toBeNull()
  })

  it('moves the highlight left and right, wrapping around at both ends', () => {
    expect(press('ArrowRight')).toEqual({ type: 'highlight', index: 3 })
    expect(press('ArrowRight', { currentIndex: 4 })).toEqual({ type: 'highlight', index: 0 })
    expect(press('ArrowLeft')).toEqual({ type: 'highlight', index: 1 })
    expect(press('ArrowLeft', { currentIndex: 0 })).toEqual({ type: 'highlight', index: 4 })
  })

  it('starts from the first card (right, down) or the last one (left, up) without a highlight', () => {
    const none = { currentIndex: -1 }

    expect(press('ArrowRight', none)).toEqual({ type: 'highlight', index: 0 })
    expect(press('ArrowDown', none)).toEqual({ type: 'highlight', index: 0 })
    expect(press('ArrowLeft', none)).toEqual({ type: 'highlight', index: 4 })
    expect(press('ArrowUp', none)).toEqual({ type: 'highlight', index: 4 })
  })

  it('moves to the row below or above the highlight', () => {
    expect(press('ArrowDown')).toEqual({ type: 'highlightRow', direction: 1 })
    expect(press('ArrowUp')).toEqual({ type: 'highlightRow', direction: -1 })
  })

  it('opens the highlighted card with Enter, and nothing without a highlight', () => {
    expect(press('Enter')).toEqual({ type: 'open', index: 2 })
    expect(press('Enter', { currentIndex: -1 })).toBeNull()
  })

  it('leaves the arrows and Enter alone in an empty folder, but still goes up and back', () => {
    const empty = { itemCount: 0, currentIndex: -1 }

    for (const key of ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'Enter']) {
      expect(press(key, empty)).toBeNull()
    }
    expect(press('Escape', empty)).toEqual({ type: 'goUp' })
    expect(press('Backspace', empty)).toEqual({ type: 'goBack' })
  })

  it('ignores other keys', () => {
    expect(press('a')).toBeNull()
    expect(press('Delete')).toBeNull()
  })
})
