import { existsSync } from 'fs'
import { join } from 'path'
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
