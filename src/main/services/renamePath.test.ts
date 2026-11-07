import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renameFavoritePaths } from '../store/favorites'
import { renamePath } from './renamePath'

vi.mock('../store/favorites', () => ({ renameFavoritePaths: vi.fn() }))

// F7 only shows up where file names are case-insensitive (NTFS on Windows):
// there the "already exists" check finds the item being renamed itself.
const isCaseInsensitiveFileSystem = ((): boolean => {
  const probeDir = mkdtempSync(join(tmpdir(), 'pcv-case-'))
  try {
    writeFileSync(join(probeDir, 'probe'), '')
    return existsSync(join(probeDir, 'PROBE'))
  } finally {
    rmSync(probeDir, { recursive: true, force: true })
  }
})()

let workDir: string

beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), 'pcv-rename-'))
  writeFileSync(join(workDir, 'photo.jpg'), 'image')
})

afterEach(() => {
  rmSync(workDir, { recursive: true, force: true })
  vi.mocked(renameFavoritePaths).mockClear()
})

describe('renamePath', () => {
  it.each([
    ['', '名前を入力してください'],
    ['   ', '名前を入力してください'],
    ['a/b.jpg', '使用できない文字が含まれています（\\ / : * ? " < > |）'],
    ['a:b.jpg', '使用できない文字が含まれています（\\ / : * ? " < > |）'],
    ['.', '無効な名前です'],
    ['..', '無効な名前です']
  ])('rejects the name %j', async (newName, message) => {
    await expect(renamePath(join(workDir, 'photo.jpg'), newName)).rejects.toThrow(message)
  })

  it('returns the path unchanged when the name stays the same', async () => {
    const targetPath = join(workDir, 'photo.jpg')

    await expect(renamePath(targetPath, 'photo.jpg')).resolves.toBe(targetPath)
    expect(renameFavoritePaths).not.toHaveBeenCalled()
  })

  it('renames a file, trimming the new name, and updates favorites', async () => {
    const targetPath = join(workDir, 'photo.jpg')
    const newPath = join(workDir, 'renamed.jpg')

    await expect(renamePath(targetPath, '  renamed.jpg  ')).resolves.toBe(newPath)
    expect(existsSync(newPath)).toBe(true)
    expect(existsSync(targetPath)).toBe(false)
    expect(renameFavoritePaths).toHaveBeenCalledWith(targetPath, newPath)
  })

  it('renames a folder', async () => {
    mkdirSync(join(workDir, 'album'))

    await expect(renamePath(join(workDir, 'album'), 'trip')).resolves.toBe(join(workDir, 'trip'))
    expect(readdirSync(workDir)).toContain('trip')
  })

  it('refuses to replace another item', async () => {
    writeFileSync(join(workDir, 'other.jpg'), 'other')

    await expect(renamePath(join(workDir, 'photo.jpg'), 'other.jpg')).rejects.toThrow(
      '同名のファイル・フォルダが既に存在します'
    )
    expect(existsSync(join(workDir, 'photo.jpg'))).toBe(true)
  })

  it('reports a failure when the item cannot be renamed', async () => {
    await expect(renamePath(join(workDir, 'missing.jpg'), 'renamed.jpg')).rejects.toThrow(
      '名前の変更に失敗しました'
    )
  })

  const caseOnlyRenameTest = isCaseInsensitiveFileSystem ? it.fails : it

  caseOnlyRenameTest('allows changing only the letter case of a name', async () => {
    await expect(renamePath(join(workDir, 'photo.jpg'), 'Photo.jpg')).resolves.toBe(
      join(workDir, 'Photo.jpg')
    )
  })
})
