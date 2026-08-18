import { app, BrowserWindow, shell, protocol, net } from 'electron'
import { join } from 'path'
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

app.whenReady().then(() => {
  app.setName('PhotoCollectionViewer')
  protocol.handle('local-file', (request) => {
    return net.fetch(request.url.replace(/^local-file:/, 'file:'))
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
