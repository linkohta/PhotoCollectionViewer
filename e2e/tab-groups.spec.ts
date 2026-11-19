import type { Page } from '@playwright/test'
import { launchApp, launchAppAtLibraryRoot } from './support/app'
import { readSavedSession } from './support/environment'
import { expect, test } from './support/test'

const openTabMenu = async (window: Page, title: string): Promise<void> => {
  await window.locator('.tab-item', { hasText: title }).click({ button: 'right' })
  await expect(window.locator('.context-menu')).toBeVisible()
}

const chooseMenuItem = (window: Page, text: string): Promise<void> =>
  window.locator('.context-menu-item', { hasText: text }).click()

// Longer than the name box, so typing it scrolls the box (which once closed
// the panel, as any scroll closes it).
const GROUP_NAME = 'Summer trips to the sea and the mountains'

test('groups tabs, names and collapses the group, and keeps it after a restart', async ({
  env
}) => {
  const first = await launchAppAtLibraryRoot(env)
  try {
    const { window } = first
    await openTabMenu(window, 'library')
    await chooseMenuItem(window, '新しいグループに追加')

    const panel = window.getByRole('dialog', { name: 'タブグループを作成' })
    await expect(panel.getByLabel('グループ名')).toBeFocused()
    await window.keyboard.type(GROUP_NAME)
    await panel.getByRole('radio', { name: '緑' }).click()
    await panel.getByLabel('グループ名').press('Enter')
    await expect(panel).toHaveCount(0)

    const group = window.locator('.tab-group')
    await expect(group.locator('.tab-group-label')).toHaveText(GROUP_NAME)
    await expect(group).toHaveClass(/tab-group-color-green/)

    // Opened from a tab in the group, the new tab joins it; "+" does not.
    await window.locator('.folder-card', { hasText: 'Albums' }).click({ button: 'right' })
    await chooseMenuItem(window, '新しいタブで開く')
    await expect(group.locator('.tab-title')).toHaveText(['library', 'Albums'])
    await window.locator('.tab-new').click()
    await expect(window.locator('.tab-list > .tab-item .tab-title')).toHaveText(['新しいタブ'])

    // Collapsed, the group hides its tabs (the active one is outside it).
    await group.locator('.tab-group-label').click()
    await expect(group.locator('.tab-item')).toHaveCount(0)
    await expect(group.locator('.tab-group-count')).toHaveText('2')

    await expect
      .poll(() => readSavedSession(env).groups)
      .toEqual([expect.objectContaining({ name: GROUP_NAME, color: 'green', collapsed: true })])
  } finally {
    await first.electronApp.close()
  }

  const second = await launchApp(env)
  try {
    const group = second.window.locator('.tab-group')
    await expect(group.locator('.tab-group-name')).toHaveText(GROUP_NAME)
    await expect(group.locator('.tab-group-count')).toHaveText('2')
    await group.locator('.tab-group-label').click()
    await expect(group.locator('.tab-title')).toHaveText(['library', 'Albums'])
  } finally {
    await second.electronApp.close()
  }
})

test('moves tabs into and out of a group, and ungroups it', async ({ app }) => {
  const { window } = app
  const group = window.locator('.tab-group')
  await window.locator('.tab-new').click()

  // Cancelling the new group's panel takes the tab out of the group again.
  await openTabMenu(window, 'library')
  await chooseMenuItem(window, '新しいグループに追加')
  await window.getByRole('button', { name: 'キャンセル' }).click()
  await expect(group).toHaveCount(0)

  await openTabMenu(window, 'library')
  await chooseMenuItem(window, '新しいグループに追加')
  await window.keyboard.press('Escape')
  await openTabMenu(window, '新しいタブ')
  await chooseMenuItem(window, '名前のないグループに追加')
  await expect(group.locator('.tab-title')).toHaveText(['library', '新しいタブ'])

  // A tab leaving the group moves to just after it.
  await openTabMenu(window, 'library')
  await chooseMenuItem(window, 'グループから外す')
  await expect(window.locator('.tab-title')).toHaveText(['新しいタブ', 'library'])
  await expect(group.locator('.tab-title')).toHaveText(['新しいタブ'])

  await group.locator('.tab-group-label').click({ button: 'right' })
  await window.getByRole('button', { name: 'グループに新しいタブを追加' }).click()
  await expect(group.locator('.tab-item')).toHaveCount(2)
  await expect(group.locator('.tab-item.active')).toHaveCount(1)

  await group.locator('.tab-group-label').click({ button: 'right' })
  await window.getByRole('button', { name: 'グループを解除' }).click()
  await expect(group).toHaveCount(0)
  await expect(window.locator('.tab-item')).toHaveCount(3)
})
