import type { Page } from '@playwright/test'
import { ROOT_COUNT_LABEL } from './support/environment'
import { expect, test } from './support/test'

// TAB_MIN_WIDTH in src/renderer/src/utils/tabWidth.ts
const NARROWEST_TAB = 90

// How wide each tab is, and whether the tab bar has to scroll to show them all.
const measureTabBar = async (window: Page): Promise<{ widths: number[]; scrolls: boolean }> => ({
  widths: await window
    .locator('.tab-item')
    .evaluateAll((tabs) => tabs.map((tab) => tab.getBoundingClientRect().width)),
  scrolls: await window.locator('.tab-list').evaluate((list) => list.scrollWidth > list.clientWidth)
})

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

test('narrows the tabs to fit the tab bar, and scrolls only once they are as narrow as they get', async ({
  app
}) => {
  const { window } = app
  const tabs = window.locator('.tab-item')

  // A group's label takes room in the bar as well as its tabs.
  await window.locator('.tab-item', { hasText: 'library' }).click({ button: 'right' })
  await window.locator('.context-menu-item', { hasText: '新しいグループに追加' }).click()
  await window.keyboard.type('Trips')
  await window.keyboard.press('Enter')
  await expect(window.locator('.tab-group-label')).toHaveText('Trips')

  // Adds tabs until they are as narrow as they get: until then, they all fit.
  let count = 1
  let widths: number[] = []
  while (widths[0] !== NARROWEST_TAB) {
    if (count === 30) throw new Error('the tabs never got as narrow as they get')
    await window.locator('.tab-new').click()
    count++
    await expect(tabs).toHaveCount(count)

    const bar = await measureTabBar(window)
    widths = bar.widths
    // Every tab, in the group or not, is as wide as the others.
    expect(new Set(widths).size).toBe(1)
    if (widths[0] !== NARROWEST_TAB) expect(bar.scrolls).toBe(false)
  }

  // One more tab doesn't fit, so the bar scrolls instead of narrowing them more.
  await window.locator('.tab-new').click()
  await expect(tabs).toHaveCount(count + 1)
  const bar = await measureTabBar(window)
  expect(new Set(bar.widths)).toEqual(new Set([NARROWEST_TAB]))
  expect(bar.scrolls).toBe(true)
})
