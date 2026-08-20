import { app, BrowserWindow, shell, protocol } from 'electron'
import { join, extname } from 'path'
import { readFile } from 'fs/promises'
import { registerIpcHandlers } from './ipc/handlers'
import { getWindowState, trackWindowState } from './store/windowState'
import { migrateLegacyStoreFiles } from './store/appState'
import { clearWarmupContext, startPeriodicWarmup, warmupWindow } from './store/warmup'

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'local-file',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      bypassCSP: true,
      stream: true
    }
  }
])

function createWindow(): void {
  const savedState = getWindowState()

  const mainWindow = new BrowserWindow({
    width: savedState.width,
    height: savedState.height,
    x: savedState.x,
    y: savedState.y,
    minWidth: 900,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    title: 'PhotoCollectionViewer',
    icon: join(__dirname, '../../resources/icon.png'),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  if (savedState.isMaximized) {
    mainWindow.maximize()
  }

  trackWindowState(mainWindow)

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.on('closed', () => {
    clearWarmupContext(mainWindow.id)
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

const MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',
  '.avif': 'image/avif',
  '.svg': 'image/svg+xml'
}

// `toLocalFileUrl` (utils/files.ts, renderer side) emits Windows paths as
// `local-file:///C:/foo/bar` (drive letter immediately after the triple
// slash). Chromium's URL canonicalizer for custom "standard" privileged
// schemes parses "C:" right after "//" as authority "host:port" syntax,
// silently drops the invalid/empty port along with the colon, and folds the
// bare drive letter into `request.url`'s hostname - e.g. the above becomes
// `local-file://c/foo/bar` (hostname "c", pathname "/foo/bar") by the time
// it reaches this handler. Reattach the colon to the hostname to recover a
// valid path; Windows drive letters are case-insensitive so the lowercased
// hostname works as-is.
function localFileUrlToPath(requestUrl: string): string {
  const url = new URL(requestUrl)
  const decodedPath = decodeURIComponent(url.pathname)
  if (/^[a-zA-Z]$/.test(url.hostname)) {
    return `${url.hostname}:${decodedPath}`
  }
  return decodedPath
}

app.whenReady().then(() => {
  app.setName('PhotoCollectionViewer')
  // Reads the file directly with Node's fs rather than delegating to
  // net.fetch('file://...'), which intermittently fails with
  // net::ERR_UNEXPECTED for larger files (observed with animated GIFs).
  protocol.handle('local-file', async (request) => {
    try {
      const filePath = localFileUrlToPath(request.url)
      const data = await readFile(filePath)
      const mime = MIME_TYPES[extname(filePath).toLowerCase()] ?? 'application/octet-stream'
      return new Response(data, { headers: { 'Content-Type': mime } })
    } catch {
      return new Response(null, { status: 404 })
    }
  })

  migrateLegacyStoreFiles()
  registerIpcHandlers()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })

  // Re-warm the thumbnail cache for whatever the renderer last reported as
  // "in view" whenever the window regains focus (e.g. after another app was
  // active for a while and the OS evicted the photo files from its cache).
  app.on('browser-window-focus', (_event, window) => {
    warmupWindow(window.id)
  })

  startPeriodicWarmup()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
