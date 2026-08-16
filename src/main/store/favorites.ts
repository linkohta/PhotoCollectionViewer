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

function isChildPath(path: string, parent: string): boolean {
  const normPath = path.replace(/\\/g, '/').toLowerCase()
  const normParent = parent.replace(/\\/g, '/').toLowerCase()
  return normPath.startsWith(`${normParent}/`)
}

export function renameFavoritePaths(oldPath: string, newPath: string): FavoriteFolder[] {
  const favorites = readStore()
  let changed = false

  const updated = favorites.map((favorite) => {
    if (favorite.path === oldPath) {
      changed = true
      return { ...favorite, path: newPath, name: newPath.split(/[/\\]/).pop() ?? newPath }
    }
    if (isChildPath(favorite.path, oldPath)) {
      changed = true
      return { ...favorite, path: newPath + favorite.path.slice(oldPath.length) }
    }
    return favorite
  })

  if (changed) writeStore(updated)
  return updated
}
