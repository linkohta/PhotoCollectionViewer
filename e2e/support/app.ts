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

// An uncaught error in the main process would normally show Electron's error
// dialog, which keeps the app from quitting, so the test would just hang until
// it times out. Each launched app reports such errors on stderr under this
// marker instead, and the test fails on them once it is over (see test.ts).
const MAIN_ERROR_MARKER = '[e2e:main-process-error]'
const mainProcessErrors: string[] = []

// Returns the errors reported since the last call, and forgets them.
export function takeMainProcessErrors(): string[] {
  return mainProcessErrors.splice(0)
}

export interface RunningApp {
  electronApp: ElectronApplication
  window: Page
}

const collectMainProcessErrors = (electronApp: ElectronApplication): void => {
  let pending = ''
  electronApp.process().stderr?.on('data', (chunk: Buffer) => {
    pending += chunk.toString()
    const lines = pending.split(/\r?\n/)
    pending = lines.pop() ?? ''
    for (const line of lines) {
      if (line.includes(MAIN_ERROR_MARKER)) mainProcessErrors.push(line.trim())
    }
  })
}

const reportMainProcessErrors = (electronApp: ElectronApplication): Promise<void> =>
  electronApp.evaluate((_electron, marker) => {
    const report = (error: unknown): void => {
      const text = error instanceof Error ? (error.stack ?? error.message) : String(error)
      console.error(`${marker} ${text.replace(/\s*\n\s*/g, ' | ')}`)
    }
    process.on('uncaughtException', report)
    process.on('unhandledRejection', report)
  }, MAIN_ERROR_MARKER)

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
  collectMainProcessErrors(electronApp)
  await reportMainProcessErrors(electronApp)
  const window = await electronApp.firstWindow()
  return { electronApp, window }
}

// Launches the app and waits until the saved tab has been restored.
export async function launchAppAtLibraryRoot(env: TestEnvironment): Promise<RunningApp> {
  const app = await launchApp(env)
  await expect(app.window.locator('.image-count')).toHaveText(ROOT_COUNT_LABEL)
  return app
}
