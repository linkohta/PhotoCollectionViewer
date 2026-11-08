import { join } from 'path'
import { pathToFileURL } from 'url'
import { expect, test } from './support/test'

test('stays on the app when the page tries to navigate to a file', async ({ app, env }) => {
  const { electronApp, window: page } = app
  // Registered after the app's own listener, so it sees whether that one
  // cancelled the navigation.
  await electronApp.evaluate(({ BrowserWindow }) => {
    const webContents = BrowserWindow.getAllWindows()[0]!.webContents
    const g = globalThis as unknown as { navigation: Promise<boolean> }
    g.navigation = new Promise((resolve) =>
      webContents.once('will-navigate', (event) => resolve(event.defaultPrevented))
    )
  })

  // The same navigation Chromium starts when an image is dropped onto the
  // window from Explorer.
  const imageUrl = pathToFileURL(join(env.libraryDir, '01.png')).href
  await page.evaluate((url) => {
    location.href = url
  }, imageUrl)

  // Playwright keeps waiting for the cancelled navigation to finish and holds
  // back its own clicks and assertions, so the page is checked and clicked
  // from the main process instead.
  const result = await electronApp.evaluate(async ({ BrowserWindow }) => {
    const webContents = BrowserWindow.getAllWindows()[0]!.webContents
    const prevented = await (globalThis as unknown as { navigation: Promise<boolean> }).navigation
    const script = (code: string): Promise<unknown> => webContents.executeJavaScript(code)
    const card = (await script(`(() => {
      const card = [...document.querySelectorAll('.folder-card')]
        .find((element) => element.textContent.includes('Albums'))
      const rect = card.getBoundingClientRect()
      return { x: Math.round(rect.x + rect.width / 2), y: Math.round(rect.y + rect.height / 2) }
    })()`)) as { x: number; y: number }
    webContents.sendInputEvent({ type: 'mouseDown', ...card, button: 'left', clickCount: 1 })
    webContents.sendInputEvent({ type: 'mouseUp', ...card, button: 'left', clickCount: 1 })
    const deadline = Date.now() + 5000
    let folder: unknown = null
    while (folder !== 'Albums' && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 100))
      folder = await script(`document.querySelector('.breadcrumb-link.current')?.textContent`)
    }
    return { prevented, url: webContents.getURL(), folder }
  })

  expect(result.prevented).toBe(true)
  expect(result.url).toMatch(/\/out\/renderer\/index\.html$/)
  // The app still responds: clicking a folder opens it.
  expect(result.folder).toBe('Albums')
})

test('opens only web pages in the default browser', async ({ app }) => {
  const { electronApp, window: page } = app
  await electronApp.evaluate(({ shell }) => {
    const g = globalThis as unknown as { opened: string[] }
    g.opened = []
    shell.openExternal = async (url) => void g.opened.push(url)
  })

  await page.evaluate(() => {
    window.open('file:///C:/Windows/win.ini')
    window.open('ms-settings:privacy')
    window.open('https://example.com/')
  })

  // The web page is the last one asked for, so once it is there the others
  // have been handled too.
  await expect
    .poll(() => electronApp.evaluate(() => (globalThis as unknown as { opened: string[] }).opened))
    .toEqual(['https://example.com/'])
  expect(electronApp.windows()).toHaveLength(1)
})
