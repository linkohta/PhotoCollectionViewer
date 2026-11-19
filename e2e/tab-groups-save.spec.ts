import type { Page } from '@playwright/test'
import { launchApp, launchAppAtLibraryRoot } from './support/app'
import { readSavedSession } from './support/environment'
import { expect, test } from './support/test'

const chooseMenuItem = (window: Page, text: string): Promise<void> =>
  window.locator('.context-menu-item', { hasText: text }).click()

const saveGroup = async (window: Page): Promise<void> => {
  await window.locator('.tab-group-label').click({ button: 'right' })
  await window.getByRole('button', { name: 'グループを保存して閉じる' }).click()
}

test('saves a group, keeps it after a restart and opens it again from the sidebar', async ({
  env
}) => {
  const first = await launchAppAtLibraryRoot(env)
  try {
    const { window } = first
    await window.locator('.folder-card', { hasText: 'Albums' }).click({ button: 'right' })
    await chooseMenuItem(window, '新しいタブで開く')
    await window.locator('.tab-item', { hasText: 'library' }).click({ button: 'right' })
    await chooseMenuItem(window, '新しいグループに追加')
    await window.keyboard.type('Trips')
    await window.keyboard.press('Enter')
    await window.locator('.tab-item', { hasText: 'Albums' }).click({ button: 'right' })
    await chooseMenuItem(window, 'グループ「Trips」に追加')

    await saveGroup(window)
    await expect(window.locator('.tab-group')).toHaveCount(0)
    await expect(window.locator('.tab-title')).toHaveText(['新しいタブ'])
    const saved = window.locator('.saved-group-item')
    await expect(saved.locator('.folder-name')).toHaveText(['Trips'])
    await expect(saved.locator('.saved-group-count')).toHaveText('2')
    // Saved, not closed: Ctrl+Shift+T has nothing to bring back.
    await expect(window.locator('.tab-restore')).toBeDisabled()
    await expect
      .poll(() => readSavedSession(env).savedGroups.map((entry) => entry.group.name))
      .toEqual(['Trips'])
  } finally {
    await first.electronApp.close()
  }

  const second = await launchApp(env)
  try {
    const { window } = second
    const saved = window.locator('.saved-group-item')
    await saved.click()
    await expect(window.locator('.tab-group .tab-title')).toHaveText(['library', 'Albums'])
    await expect(window.locator('.tab-item.active .tab-title')).toHaveText('library')
    await expect(saved).toHaveCount(0)

    // Deleting a saved group drops it for good.
    await saveGroup(window)
    await saved.click({ button: 'right' })
    await chooseMenuItem(window, '削除')
    await expect(saved).toHaveCount(0)
    await expect(window.locator('.tab-group')).toHaveCount(0)
    await expect.poll(() => readSavedSession(env).savedGroups).toEqual([])
  } finally {
    await second.electronApp.close()
  }
})
