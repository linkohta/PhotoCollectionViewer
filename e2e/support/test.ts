import { expect, test as base } from '@playwright/test'
import { launchAppAtLibraryRoot, takeMainProcessErrors, type RunningApp } from './app'
import {
  createTestEnvironment,
  removeTestEnvironment,
  writeSettings,
  type TestEnvironment
} from './environment'

// Every test gets a fresh library and profile (env), and the app already
// showing the library root (app). Tests that need to restart the app use env
// with launchApp directly instead of app.
export const test = base.extend<{
  env: TestEnvironment
  app: RunningApp
  noMainProcessErrors: void
}>({
  // Applies to every test, including apps it starts itself: fails it when a
  // main process hit an uncaught error (see app.ts). Set up first, so it is
  // checked last, after every app has been closed.
  noMainProcessErrors: [
    async ({}, use) => {
      takeMainProcessErrors()
      await use()
      expect(takeMainProcessErrors(), 'uncaught errors in the main process').toEqual([])
    },
    { auto: true }
  ],
  env: async ({}, use) => {
    const env = await createTestEnvironment()
    writeSettings(env)
    await use(env)
    removeTestEnvironment(env)
  },
  app: async ({ env }, use) => {
    const app = await launchAppAtLibraryRoot(env)
    await use(app)
    await app.electronApp.close()
  }
})

export { expect }
