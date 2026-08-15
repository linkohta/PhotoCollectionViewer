import { readAppStateSlice, writeAppStateSlice, type FavoriteFolder } from './appState'

export type { FavoriteFolder }

function readStore(): FavoriteFolder[] {
  return readAppStateSlice('favorites')
}

function writeStore(favorites: FavoriteFolder[]): void {
  writeAppStateSlice('favorites', favorites)
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
