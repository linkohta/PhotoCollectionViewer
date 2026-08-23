import { useEffect, useMemo, useState } from 'react'
import type { FolderCollection, SubfolderSearchResult } from '../../../preload/index'

interface UseSubfolderSearchArgs {
  collection: FolderCollection
  pendingSearchQuery: string | null
  onConsumePendingSearchQuery: () => void
}

export interface SearchableSubfolder {
  path: string
  name: string
  subtitle?: string
}

export function useSubfolderSearch({
  collection,
  pendingSearchQuery,
  onConsumePendingSearchQuery
}: UseSubfolderSearchArgs): {
  subfolderQuery: string
  setSubfolderQuery: (query: string) => void
  isSearching: boolean
  searchResults: SubfolderSearchResult[] | null
  filteredSubfolders: SearchableSubfolder[]
} {
  const [subfolderQuery, setSubfolderQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SubfolderSearchResult[] | null>(null)

  useEffect(() => {
    if (pendingSearchQuery) {
      setSubfolderQuery(pendingSearchQuery)
      onConsumePendingSearchQuery()
    } else {
      setSubfolderQuery('')
    }
    setSearchResults(null)
    // Only re-run when the folder itself changes - pendingSearchQuery is a
    // one-shot value consumed above, not something to react to independently.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collection.path])

  // Debounced so quick typing doesn't spawn a full-tree filesystem walk per keystroke.
  useEffect(() => {
    const query = subfolderQuery.trim()
    if (!query) {
      setSearchResults(null)
      return
    }

    let cancelled = false
    const timer = setTimeout(async () => {
      const results = await window.photoCollection.searchSubfolders(collection.path, query)
      if (!cancelled) setSearchResults(results)
    }, 200)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [collection.path, subfolderQuery])

  const isSearching = subfolderQuery.trim().length > 0
  const filteredSubfolders = useMemo(
    () =>
      isSearching
        ? (searchResults ?? []).map((result) => ({
            path: result.path,
            name: result.name,
            subtitle: result.relativePath.split('/').slice(0, -1).join(' › ') || undefined
          }))
        : collection.subfolders.map((subfolder) => ({ ...subfolder, subtitle: undefined })),
    [isSearching, searchResults, collection.subfolders]
  )

  return { subfolderQuery, setSubfolderQuery, isSearching, searchResults, filteredSubfolders }
}
