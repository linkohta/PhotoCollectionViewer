import { launchAppAtLibraryRoot } from './support/app'
import { updateSettings } from './support/environment'
import { expect, test } from './support/test'

test('keys pressed while a context menu is open only reach the menu', async ({ app }) => {
  const { window } = app
  await window.locator('.folder-card', { hasText: 'Albums' }).click()
  await expect(window.locator('.breadcrumb-link.current')).toHaveText('Albums')
  const highlightedBefore = await window.locator('.highlighted').count()

  await window.locator('.folder-card', { hasText: 'trip' }).click({ button: 'right' })
  await expect(window.locator('.context-menu')).toBeVisible()
  await window.keyboard.press('ArrowRight')
  await window.keyboard.press('Escape')

  await expect(window.locator('.context-menu')).toHaveCount(0)
  // Esc used to also go up to the parent folder, and the arrow key moved the
  // grid's highlight behind the menu.
  await expect(window.locator('.breadcrumb-link.current')).toHaveText('Albums')
  await expect(window.locator('.highlighted')).toHaveCount(highlightedBefore)
})

test('Esc with the favorites menu open closes the menu, not the viewer', async ({ env }) => {
  updateSettings(env, (settings) => {
    settings.favorites = [{ path: env.libraryDir, name: 'library', addedAt: 0 }]
  })

  const { electronApp, window } = await launchAppAtLibraryRoot(env)
  try {
    await window.locator('.thumbnail-card', { hasText: '01.png' }).click()
    await expect(window.locator('.viewer-counter')).toHaveText('1 / 4')

    await window.locator('.folder-item', { hasText: 'library' }).click({ button: 'right' })
    await expect(window.locator('.context-menu')).toBeVisible()
    await window.keyboard.press('Escape')

    await expect(window.locator('.context-menu')).toHaveCount(0)
    await expect(window.locator('.viewer-counter')).toHaveText('1 / 4')
  } finally {
    await electronApp.close()
  }
})
