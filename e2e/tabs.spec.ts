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

test('reorders tabs by dragging one onto another', async ({ app }) => {
  const { window } = app
  const titles = window.locator('.tab-item .tab-title')
  await window.locator('.tab-new').click()
  await window.locator('.tab-item').nth(0).locator('.tab-label').click()
  await expect(titles).toHaveText(['library', '新しいタブ'])

  // Dropped on the right half of the last tab, so it goes after it.
  const from = (await window.locator('.tab-item').nth(0).boundingBox())!
  const to = (await window.locator('.tab-item').nth(1).boundingBox())!
  await window.mouse.move(from.x + 20, from.y + from.height / 2)
  await window.mouse.down()
  await window.mouse.move(from.x + 50, from.y + from.height / 2, { steps: 5 })
  await window.mouse.move(to.x + to.width - 10, to.y + to.height / 2, { steps: 10 })
  await window.mouse.up()

  await expect(titles).toHaveText(['新しいタブ', 'library'])
  await expect(window.locator('.tab-item.active .tab-title')).toHaveText('library')
})
