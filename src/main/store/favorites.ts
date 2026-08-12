import { readFileSync, writeFileSync, existsSync } from 'fs'
import { getAppRootFilePath } from './appRoot'

export interface FavoriteFolder {
  path: string
  name: string
  addedAt: number
}

function getStorePath(): string {
  return getAppRootFilePath('favorites.json')
}

function readStore(): FavoriteFolder[] {
  const storePath = getStorePath()
  if (!existsSync(storePath)) return []

  try {
    const raw = readFileSync(storePath, 'utf-8')
    const data = JSON.parse(raw) as FavoriteFolder[]
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

function writeStore(favorites: FavoriteFolder[]): void {
  writeFileSync(getStorePath(), JSON.stringify(favorites, null, 2), 'utf-8')
}

export function getFavorites(): FavoriteFolder[] {
  return readStore()
}

export function addFavorite(folderPath: string): FavoriteFolder[] {
  const favorites = readStore()
  if (favorites.some((f) => f.path === folderPath)) {
    return favorites
  }

  const name = folderPath.split(/[/\\]/).pop() ?? folderPath
  favorites.unshift({ path: folderPath, name, addedAt: Date.now() })
  writeStore(favorites)
  return favorites
}

export function removeFavorite(folderPath: string): FavoriteFolder[] {
  const favorites = readStore().filter((f) => f.path !== folderPath)
  writeStore(favorites)
  return favorites
}
