import { ROOT_COUNT_LABEL } from './support/environment'
import { expect, test } from './support/test'

test('opens and closes tabs, and brings a closed tab back with Ctrl+Shift+T', async ({ app }) => {
  const { window } = app
  const tabs = window.locator('.tab-item')

  // An empty tab's label also carries the title 新しいタブ, so pick the button by class.
  await window.locator('.tab-new').click()
  await expect(tabs).toHaveCount(2)
  await expect(window.locator('.tab-item.active .tab-title')).toHaveText('新しいタブ')

  await window.getByLabel('library を閉じる').click()
  await expect(tabs).toHaveCount(1)

  await window.keyboard.press('Control+Shift+T')
  await expect(tabs).toHaveCount(2)
  await expect(window.locator('.tab-item.active .tab-title')).toHaveText('library')
  await expect(window.locator('.image-count')).toHaveText(ROOT_COUNT_LABEL)
})
