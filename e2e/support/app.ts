import { join } from 'path'
import {
  _electron as electron,
  expect,
  type ElectronApplication,
  type Page
} from '@playwright/test'
import { ROOT_COUNT_LABEL, type TestEnvironment } from './environment'

const projectRoot = join(__dirname, '..', '..')

// VS Code's integrated terminal (and other Electron-based tools) export
// ELECTRON_RUN_AS_NODE, which would start Electron as plain Node, and a stray
// ELECTRON_RENDERER_URL would make the app load a dev server instead of out/.
const IGNORED_ENV = new Set(['ELECTRON_RUN_AS_NODE', 'ELECTRON_RENDERER_URL'])

export interface RunningApp {
  electronApp: ElectronApplication
  window: Page
}

// Starts the built app (npm run build:vite) against the environment's
// throwaway profile.
export async function launchApp(env: TestEnvironment): Promise<RunningApp> {
  const childEnv: Record<string, string> = {}
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined && !IGNORED_ENV.has(key)) childEnv[key] = value
  }
  childEnv['PCV_USER_DATA_DIR'] = env.userDataDir

  const electronApp = await electron.launch({
    args: [projectRoot],
    cwd: projectRoot,
    env: childEnv
  })
  const window = await electronApp.firstWindow()
  return { electronApp, window }
}

// Launches the app and waits until the saved tab has been restored.
export async function launchAppAtLibraryRoot(env: TestEnvironment): Promise<RunningApp> {
  const app = await launchApp(env)
  await expect(app.window.locator('.image-count')).toHaveText(ROOT_COUNT_LABEL)
  return app
}
