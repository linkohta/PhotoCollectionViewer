import { app, BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { clearWarmupContext } from '../services/warmup'
import { getWindowState, trackWindowState } from '../store/windowState'
import { isExternalWebUrl, isNavigationAllowed } from './navigation'

// The paths below are relative to out/main: the whole main process is bundled
// into out/main/index.js, so __dirname doesn't depend on where this file is.
export function createMainWindow(): void {
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
      // The preload script only uses contextBridge and ipcRenderer, which work
      // in a sandboxed renderer.
      sandbox: true,
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

  // No other windows are opened: web links go to the default browser and
  // anything else is ignored.
  mainWindow.webContents.setWindowOpenHandler((details) => {
    if (isExternalWebUrl(details.url)) void shell.openExternal(details.url)
    return { action: 'deny' }
  })

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!isNavigationAllowed(mainWindow.webContents.getURL(), url)) event.preventDefault()
  })

  if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}
