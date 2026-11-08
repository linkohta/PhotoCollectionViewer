// Settings that Chromium, Electron and libuv pick up during early startup,
// before the app is ready. main/index.ts imports this module first, so it runs
// ahead of every other module of the main process - setting any of these later
// either has no effect or is rejected.
import { app } from 'electron'
import { cpus } from 'os'
import { registerLocalFileScheme } from './protocol/localFileProtocol'

// Must run before app.whenReady() - Chromium resolves the userData path (and
// with it, where the GPU shader disk cache lives) from the app name during
// early startup, before any of the ready-time code runs. Setting the name
// late doesn't retroactively fix a cache path Chromium already picked.
app.setName('PhotoCollectionViewer')

// The E2E tests (e2e/) run the built app against a throwaway profile, so they
// never touch the developer's settings or thumbnail cache. Like setName this
// has to happen before Chromium picks the userData path. Packaged builds
// ignore it.
const e2eUserDataDir = process.env['PCV_USER_DATA_DIR']
if (e2eUserDataDir && !app.isPackaged) {
  app.setPath('userData', e2eUserDataDir)
}

// Silences a benign but noisy Windows warning ("Unable to create cache" /
// "Gpu Cache Creation failed: -2") that shows up when electron-vite's dev
// hot-reload restarts the main process while a previous instance still holds
// the GPU shader cache directory open. The shader cache is a pure
// performance optimization (avoids recompiling shaders across launches); the
// app has no shader-heavy rendering, so disabling it has no visible effect.
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache')

// libuv's threadpool (default size 4) caps how many sharp operations can run
// at once; raise it so thumbnail generation (services/thumbnails.ts) can
// actually run as many at once as its limiter allows instead of queueing
// behind a small fixed pool. libuv reads the size when the pool first starts.
process.env.UV_THREADPOOL_SIZE = String(Math.max(4, cpus().length))

registerLocalFileScheme()
