import { existsSync } from 'fs'
import { join } from 'path'
import { launchAppAtLibraryRoot } from './support/app'
import { updateSettings } from './support/environment'
import { expect, test } from './support/test'

test('extracts a ZIP file next to it and opens its images', async ({ app, env }) => {
  const { window } = app

  await window.locator('.zip-card', { hasText: 'photos.zip' }).click()

  await expect(window.locator('.viewer-counter')).toHaveText('1 / 2')
  await expect(window.locator('.viewer-filename')).toContainText('1.png')
  // photos.zip holds a photos/ folder of its own, which is flattened.
  expect(existsSync(join(env.libraryDir, 'photos', '1.png'))).toBe(true)

  await window.keyboard.press('Escape')
  await expect(window.locator('.breadcrumb-link.current')).toHaveText('library')
  await expect(window.locator('.folder-card .subfolder-name')).toHaveText([
    '2024',
    'Albums',
    'photos'
  ])
})

test('cancelling "open in new tab" for a ZIP file leaves no new tab', async ({ env }) => {
  updateSettings(env, (settings) => {
    settings.confirmations.extractZip = true
  })

  const { electronApp, window } = await launchAppAtLibraryRoot(env)
  try {
    const answerConfirmation = (response: number): Promise<void> =>
      electronApp.evaluate(({ dialog }, value) => {
        dialog.showMessageBox = (async () => ({
          response: value,
          checkboxChecked: false
        })) as typeof dialog.showMessageBox
      }, response)
    const openInNewTab = async (): Promise<void> => {
      await window.locator('.zip-card', { hasText: 'photos.zip' }).click({ button: 'right' })
      await window.locator('.context-menu-item', { hasText: '新しいタブで開く' }).click()
    }

    await answerConfirmation(1)
    await openInNewTab()
    await expect(window.locator('.context-menu')).toHaveCount(0)
    await expect(window.locator('.tab-item')).toHaveCount(1)

    await answerConfirmation(0)
    await openInNewTab()
    await expect(window.locator('.tab-item')).toHaveCount(2)
    await expect(window.locator('.viewer-counter')).toHaveText('1 / 2')
  } finally {
    await electronApp.close()
  }
})
