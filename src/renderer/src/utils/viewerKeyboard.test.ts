import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  installViewerKeyboardListener,
  registerViewerKeyboardHandler,
  suspendViewerKeyboardHandler
} from './viewerKeyboard'

describe('viewer keyboard dispatch', () => {
  let uninstall: () => void
  const handler = vi.fn()

  const pressKey = (): void => {
    document.dispatchEvent(new Event('keydown'))
  }

  beforeEach(() => {
    vi.stubGlobal('document', new EventTarget())
    uninstall = installViewerKeyboardListener()
  })

  afterEach(() => {
    uninstall()
    vi.unstubAllGlobals()
    handler.mockReset()
  })

  it('passes keys to the registered handler until it unregisters', () => {
    const unregister = registerViewerKeyboardHandler(handler)
    pressKey()
    unregister()
    pressKey()

    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('holds keys back while a context menu is open', () => {
    const unregister = registerViewerKeyboardHandler(handler)

    const closeMenu = suspendViewerKeyboardHandler()
    pressKey()
    expect(handler).not.toHaveBeenCalled()

    closeMenu()
    pressKey()
    expect(handler).toHaveBeenCalledTimes(1)
    unregister()
  })

  it('stays held back until every open menu has closed, even if one closes twice', () => {
    const unregister = registerViewerKeyboardHandler(handler)

    const closeFirst = suspendViewerKeyboardHandler()
    const closeSecond = suspendViewerKeyboardHandler()
    closeFirst()
    closeFirst()
    pressKey()
    expect(handler).not.toHaveBeenCalled()

    closeSecond()
    pressKey()
    expect(handler).toHaveBeenCalledTimes(1)
    unregister()
  })
})
