import { describe, expect, it } from 'vitest'
import { isExternalWebUrl, isNavigationAllowed } from './navigation'

describe('isExternalWebUrl', () => {
  it.each(['https://github.com/linkohta/PhotoCollectionViewer', 'http://localhost:5173/'])(
    'accepts the web page %s',
    (url) => {
      expect(isExternalWebUrl(url)).toBe(true)
    }
  )

  it.each([
    'file:///C:/Windows/win.ini',
    'local-file:///C:/Photos/a.png',
    'ms-settings:privacy',
    'javascript:alert(1)',
    'mailto:someone@example.com',
    'not a url',
    ''
  ])('rejects %s', (url) => {
    expect(isExternalWebUrl(url)).toBe(false)
  })
})

describe('isNavigationAllowed', () => {
  const APP = 'file:///D:/Apps/PhotoCollectionViewer/resources/app.asar/out/renderer/index.html'
  const DEV = 'http://localhost:5173/'

  it('lets the page reload itself', () => {
    expect(isNavigationAllowed(APP, APP)).toBe(true)
    expect(isNavigationAllowed(DEV, DEV)).toBe(true)
  })

  it('ignores the hash', () => {
    expect(isNavigationAllowed(`${APP}#x`, APP)).toBe(true)
    expect(isNavigationAllowed(APP, `${APP}#x`)).toBe(true)
  })

  it.each([
    // What dropping an image from Explorer onto the window navigates to.
    'file:///C:/Photos/a.png',
    'file:///D:/Apps/PhotoCollectionViewer/resources/app.asar/out/renderer/other.html',
    'https://example.com/',
    'http://localhost:5174/'
  ])('blocks navigating to %s', (url) => {
    expect(isNavigationAllowed(APP, url)).toBe(false)
    expect(isNavigationAllowed(DEV, url)).toBe(false)
  })
})
