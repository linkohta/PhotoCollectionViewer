import { useCallback, useEffect, useState } from 'react'
import type { FavoriteFolder } from '../../../preload/index'

export function useFavorites() {
  const [favorites, setFavorites] = useState<FavoriteFolder[]>([])

  const loadFavorites = useCallback(async () => {
    const list = await window.photoCollection.getFavorites()
    setFavorites(list)
  }, [])

  useEffect(() => {
    void loadFavorites()
  }, [loadFavorites])

  const toggleFavorite = useCallback(
    async (folderPath: string) => {
      const isFavorite = favorites.some((f) => f.path === folderPath)
      const updated = isFavorite
        ? await window.photoCollection.removeFavorite(folderPath)
        : await window.photoCollection.addFavorite(folderPath)
      setFavorites(updated)
    },
    [favorites]
  )

  return { favorites, toggleFavorite }
}
