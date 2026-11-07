import { join } from 'path'
import { launchApp, launchAppAtLibraryRoot } from './support/app'
import { readSavedSession } from './support/environment'
import { expect, test } from './support/test'

test('reopens the folder that was open when the app was closed', async ({ env }) => {
  const first = await launchAppAtLibraryRoot(env)
  try {
    await first.window.locator('.folder-card', { hasText: 'Albums' }).click()
    await expect(first.window.locator('.breadcrumb-link.current')).toHaveText('Albums')
    // The session is saved shortly after each change.
    await expect
      .poll(() => readSavedSession(env).tabs[0]?.currentFolderPath)
      .toBe(join(env.libraryDir, 'Albums'))
  } finally {
    await first.electronApp.close()
  }

  const second = await launchApp(env)
  try {
    await expect(second.window.locator('.breadcrumb-link.current')).toHaveText('Albums')
    await expect(second.window.locator('.tab-item.active .tab-title')).toHaveText('Albums')
  } finally {
    await second.electronApp.close()
  }
})
