import { rename } from 'fs/promises'
import { existsSync } from 'fs'
import { join, dirname } from 'path'
import { renameFavoritePaths } from '../store/favorites'

const INVALID_NAME_CHARS = /[\\/:*?"<>|]/

export async function renamePath(targetPath: string, newName: string): Promise<string> {
  const trimmed = newName.trim()
  if (!trimmed) {
    throw new Error('名前を入力してください')
  }
  if (INVALID_NAME_CHARS.test(trimmed)) {
    throw new Error('使用できない文字が含まれています（\\ / : * ? " < > |）')
  }
  if (trimmed === '.' || trimmed === '..') {
    throw new Error('無効な名前です')
  }

  const newPath = join(dirname(targetPath), trimmed)
  if (newPath === targetPath) {
    return targetPath
  }

  if (existsSync(newPath)) {
    throw new Error('同名のファイル・フォルダが既に存在します')
  }

  try {
    await rename(targetPath, newPath)
  } catch {
    throw new Error('名前の変更に失敗しました')
  }

  renameFavoritePaths(targetPath, newPath)

  return newPath
}
