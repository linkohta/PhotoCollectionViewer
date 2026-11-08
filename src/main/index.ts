// Has to stay the first import - see bootstrap.ts.
import './bootstrap'
import { app, BrowserWindow } from 'electron'
import { registerIpcHandlers } from './ipc/handlers'
import { serveLocalFiles } from './protocol/localFileProtocol'
import { migrateLegacyStoreFiles } from './store/appState'
import { startPeriodicWarmup, warmupWindow } from './store/warmup'
import { createMainWindow } from './window/mainWindow'

app.whenReady().then(() => {
  serveLocalFiles()

  // A failed migration must not keep the app from starting - an exception
  // here would skip the IPC handlers and the window below.
  try {
    migrateLegacyStoreFiles()
  } catch (error) {
    console.error('Failed to migrate settings from an older version', error)
  }
  registerIpcHandlers()
  createMainWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
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
