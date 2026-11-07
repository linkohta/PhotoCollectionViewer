import { existsSync, readdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { launchApp, launchAppAtLibraryRoot } from './support/app'
import { readSavedSession, settingsPath } from './support/environment'
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

test('starts from the defaults when the settings file is broken, keeping its contents', async ({
  env
}) => {
  const broken = '{"favorites": [{"path": "kept"'
  writeFileSync(settingsPath(env), broken)

  const { electronApp, window } = await launchApp(env)
  try {
    await expect(window.locator('.tab-item .tab-title')).toHaveText(['新しいタブ'])

    const backups = (): string[] =>
      readdirSync(env.userDataDir).filter((name) => /^app-state\.corrupt-.+\.json$/.test(name))
    await expect.poll(() => backups().length).toBe(1)
    expect(readFileSync(join(env.userDataDir, backups()[0] ?? ''), 'utf-8')).toBe(broken)

    // Changes are saved again, to a fresh settings file.
    await window.locator('.tab-new').click()
    await expect
      .poll(() => (existsSync(settingsPath(env)) ? readSavedSession(env).tabs.length : 0))
      .toBe(2)
  } finally {
    await electronApp.close()
  }
})
