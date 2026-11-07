import { join } from 'path'
import { ROOT_MEDIA, ROOT_SUBFOLDERS, ROOT_ZIP_FILES } from './support/environment'
import { expect, test } from './support/test'

test('restores the saved tab and lists the folder contents', async ({ app }) => {
  const { window } = app

  await expect(window.locator('.tab-item.active .tab-title')).toHaveText('library')
  await expect(window.locator('.folder-card .subfolder-name')).toHaveText(ROOT_SUBFOLDERS)
  await expect(window.locator('.zip-card .subfolder-name')).toHaveText(ROOT_ZIP_FILES)
  await expect(window.locator('.thumbnail-card .thumbnail-name')).toHaveText(ROOT_MEDIA)
})

test('moves the highlight with the arrow keys, opens with Enter and goes up with Esc', async ({
  app,
  env
}) => {
  const { window } = app

  await window.keyboard.press('ArrowRight')
  await expect(window.locator('.highlighted')).toHaveAttribute(
    'data-path',
    join(env.libraryDir, '2024')
  )

  await window.keyboard.press('ArrowRight')
  await window.keyboard.press('Enter')
  await expect(window.locator('.breadcrumb-link.current')).toHaveText('Albums')
  await expect(window.locator('.folder-card .subfolder-name')).toHaveText(['trip'])

  await window.keyboard.press('Escape')
  await expect(window.locator('.breadcrumb-link.current')).toHaveText('library')
  await expect(window.locator('.highlighted')).toHaveAttribute(
    'data-path',
    join(env.libraryDir, 'Albums')
  )
})

test('opens the first image straight away when a folder holds only images', async ({ app }) => {
  const { window } = app

  await window.locator('.folder-card', { hasText: '2024' }).click()

  await expect(window.locator('.viewer-counter')).toHaveText('1 / 2')
  await expect(window.locator('.viewer-filename')).toContainText('a.png')
})
