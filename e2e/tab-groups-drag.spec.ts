import type { Locator, Page } from '@playwright/test'
import { expect, test } from './support/test'

type Point = { x: number; y: number }

// A point fraction of the way across the element, halfway down.
const pointIn = async (locator: Locator, fraction = 0.5): Promise<Point> => {
  const box = await locator.boundingBox()
  if (!box) throw new Error('not shown')
  return { x: box.x + box.width * fraction, y: box.y + box.height / 2 }
}

// Drags as a user does: presses on from, moves off it a little, moves to the
// target and lets go.
const dragTo = async (window: Page, from: Point, to: Point): Promise<void> => {
  await window.mouse.move(from.x, from.y)
  await window.mouse.down()
  await window.mouse.move(from.x + 10, from.y, { steps: 5 })
  await window.mouse.move(to.x, to.y, { steps: 10 })
  await window.mouse.up()
}

const tabNamed = (window: Page, title: string): Locator =>
  window.locator('.tab-item', { has: window.locator('.tab-title', { hasText: title }) })

// library, Albums and 2024, the last two opened from the library's grid (2024
// holds only images, so its tab shows the viewer).
const openThreeTabs = async (window: Page): Promise<void> => {
  for (const folder of ['Albums', '2024']) {
    await tabNamed(window, 'library').locator('.tab-label').click()
    await window.locator('.folder-card', { hasText: folder }).click({ button: 'right' })
    await window.locator('.context-menu-item', { hasText: '新しいタブで開く' }).click()
  }
  await expect(window.locator('.tab-title')).toHaveText(['library', 'Albums', '2024'])
}

test('makes a group by holding a tab over the middle of another', async ({ app }) => {
  const { window } = app
  await openThreeTabs(window)

  // While dragging, the tab bar shows where the tab would go - as soon as
  // the pointer is over a tab, before it moves on (one jump brings dragenter
  // there, but no dragover).
  const from = await pointIn(tabNamed(window, '2024'), 0.3)
  await window.mouse.move(from.x, from.y)
  await window.mouse.down()
  await window.mouse.move(from.x + 10, from.y, { steps: 5 })
  const edge = await pointIn(tabNamed(window, 'library'), 0.1)
  await window.mouse.move(edge.x, edge.y)
  await expect(window.locator('.tab-item.dragging')).toHaveCount(1)
  await expect(tabNamed(window, 'library')).toHaveClass(/drop-before/)

  const middle = await pointIn(tabNamed(window, 'library'), 0.5)
  await window.mouse.move(middle.x, middle.y, { steps: 5 })
  await expect(tabNamed(window, 'library')).toHaveClass(/drop-onto/)
  await window.mouse.up()

  await expect(window.locator('.tab-group .tab-title')).toHaveText(['library', '2024'])
  await expect(window.getByRole('dialog', { name: 'タブグループを作成' })).toBeVisible()
})

test('drags tabs into and out of a group, and the group past a tab', async ({ app }) => {
  const { window } = app
  await openThreeTabs(window)
  await tabNamed(window, 'Albums').click({ button: 'right' })
  await window.locator('.context-menu-item', { hasText: '新しいグループに追加' }).click()
  await window.keyboard.press('Escape')
  const label = window.locator('.tab-group-label')
  const groupTitles = window.locator('.tab-group .tab-title')
  const looseTitles = window.locator('.tab-list > .tab-item .tab-title')

  // Onto the right half of the label: first in the group.
  await dragTo(window, await pointIn(tabNamed(window, 'library'), 0.3), await pointIn(label, 0.9))
  await expect(groupTitles).toHaveText(['library', 'Albums'])

  // Past the last tab: out of the group, at the end.
  const list = await pointIn(window.locator('.tab-list'), 0.95)
  await dragTo(window, await pointIn(tabNamed(window, 'Albums'), 0.3), list)
  await expect(groupTitles).toHaveText(['library'])
  await expect(looseTitles).toHaveText(['2024', 'Albums'])

  // The label carries the whole group.
  await dragTo(window, await pointIn(label), await pointIn(tabNamed(window, 'Albums'), 0.9))
  await expect(window.locator('.tab-title')).toHaveText(['2024', 'Albums', 'library'])
  await expect(groupTitles).toHaveText(['library'])
})
