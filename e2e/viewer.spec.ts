import type { Locator } from '@playwright/test'
import { launchApp } from './support/app'
import { addImage, LARGE_IMAGE } from './support/environment'
import { expect, test } from './support/test'

const renderedWidth = (image: Locator) => async (): Promise<number> =>
  image.evaluate((element) => Number.parseFloat((element as HTMLImageElement).style.width))

test('steps through the images with the arrow keys, wrapping at both ends', async ({ app }) => {
  const { window } = app

  await window.locator('.thumbnail-card', { hasText: '01.png' }).click()
  await expect(window.locator('.viewer-counter')).toHaveText('1 / 4')

  await window.keyboard.press('ArrowLeft')
  await expect(window.locator('.viewer-counter')).toHaveText('4 / 4')
  await expect(window.locator('.viewer-filename')).toContainText('clip.mp4')

  await window.keyboard.press('ArrowRight')
  await expect(window.locator('.viewer-counter')).toHaveText('1 / 4')
  await expect(window.locator('.viewer-filename')).toContainText('01.png')

  await window.keyboard.press('Escape')
  await expect(window.locator('.thumbnail-card.highlighted .thumbnail-name')).toHaveText('01.png')
})

test('switches between fit, actual size and zoom', async ({ app }) => {
  const { window } = app

  await window.locator('.thumbnail-card', { hasText: LARGE_IMAGE.name }).click()
  // Wait for the full image: until then the size comes from the preview.
  const image = window.locator('img.viewer-image.loaded')
  await expect(image).toBeVisible()
  const width = renderedWidth(image)

  const fitWidth = await width()
  expect(fitWidth).toBeLessThan(LARGE_IMAGE.width)

  await window.getByTitle('元のサイズで表示 (1)').click()
  await expect.poll(width).toBe(LARGE_IMAGE.width)
  await expect(window.getByTitle('元のサイズで表示 (1)')).toHaveClass(/active/)

  await window.keyboard.press('+')
  await expect.poll(width).toBeGreaterThan(LARGE_IMAGE.width)

  await window.keyboard.press('f')
  await expect.poll(width).toBe(fitWidth)

  await window.keyboard.press('1')
  await expect.poll(width).toBe(LARGE_IMAGE.width)
})

test('keeps actual size working after a video has been shown', async ({ app }) => {
  const { window } = app
  const image = window.locator('img.viewer-image.loaded')
  const width = renderedWidth(image)

  // Opened on the video, then moved to the image.
  await window.locator('.thumbnail-card', { hasText: 'clip.mp4' }).click()
  await expect(window.locator('.viewer-counter')).toHaveText('4 / 4')
  await window.keyboard.press('ArrowLeft')
  await expect(image).toBeVisible()
  await window.keyboard.press('1')
  await expect.poll(width).toBe(LARGE_IMAGE.width)

  // Image, then video, then back to the image.
  await window.keyboard.press('ArrowRight')
  await expect(window.locator('.viewer-filename')).toContainText('clip.mp4')
  await window.keyboard.press('ArrowLeft')
  await expect(image).toBeVisible()
  await window.keyboard.press('1')
  await expect.poll(width).toBe(LARGE_IMAGE.width)
})

test('shows an image larger than the preview at its own size', async ({ env }) => {
  // The viewer first shows a preview of at most 960px, whose size used to win
  // over the full image's now and then.
  await addImage(env, 'big.png', 2400, 1600)

  const { electronApp, window } = await launchApp(env)
  try {
    await window.locator('.thumbnail-card', { hasText: 'big.png' }).click()
    const image = window.locator('img.viewer-image.loaded')
    await expect(image).toBeVisible()

    await window.keyboard.press('1')
    await expect.poll(renderedWidth(image)).toBe(2400)
  } finally {
    await electronApp.close()
  }
})
