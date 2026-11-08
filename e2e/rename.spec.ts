import { readdirSync } from 'fs'
import type { Page } from '@playwright/test'
import { expect, test } from './support/test'

const startRenaming = async (window: Page, name: string): Promise<void> => {
  await window.locator('.thumbnail-card', { hasText: name }).click({ button: 'right' })
  await window.locator('.context-menu-item', { hasText: '名前の変更' }).click()
}

test('renames a file when only the letter case changes', async ({ app, env }) => {
  const { window } = app

  await startRenaming(window, '01.png')
  await window.locator('input.rename-input').fill('01.PNG')
  await window.locator('input.rename-input').press('Enter')

  await expect(window.locator('.thumbnail-card .thumbnail-name').first()).toHaveText('01.PNG')
  expect(readdirSync(env.libraryDir)).toContain('01.PNG')
  expect(readdirSync(env.libraryDir)).not.toContain('01.png')
})

test('shows why a rename was refused, without the IPC error wrapper', async ({ app }) => {
  const { window } = app

  await startRenaming(window, '01.png')
  await window.locator('input.rename-input').fill('bad:name.png')
  await window.locator('input.rename-input').press('Enter')

  await expect(window.locator('.rename-input-error')).toHaveText(
    '使用できない文字が含まれています（\\ / : * ? " < > |）'
  )
})
