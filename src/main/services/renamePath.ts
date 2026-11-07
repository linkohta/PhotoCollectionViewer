import { rename } from 'fs/promises'
import { existsSync, statSync } from 'fs'
import { join, dirname } from 'path'
import { renameFavoritePaths } from '../store/favorites'

const INVALID_NAME_CHARS = /[\\/:*?"<>|]/

// On case-insensitive file systems (Windows) a new name that differs only in
// letter case still "exists" - it is the item being renamed - which must not
// count as a conflict. Compared by file id rather than by name, so a separate
// item on a case-sensitive file system is still refused.
const isSameItem = (a: string, b: string): boolean => {
  try {
    const statA = statSync(a, { bigint: true })
    const statB = statSync(b, { bigint: true })
    return statA.dev === statB.dev && statA.ino === statB.ino
  } catch {
    return false
  }
}

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

  if (existsSync(newPath) && !isSameItem(newPath, targetPath)) {
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
