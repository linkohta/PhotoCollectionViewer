import { useMemo } from 'react'
import type { FolderCollection, ZipArchive } from '../../../shared/types'
import type { GridItemKind, SearchOrigin } from '../types/grid'
import { mapGridKey } from '../utils/gridKeys'
import { isTypingTarget } from '../utils/keyboard'
import { useKeyboardHandler } from './useKeyboardHandler'
import type { SearchableSubfolder } from './useSubfolderSearch'

interface NavigableItem {
  path: string
  kind: GridItemKind
  zipFile?: ZipArchive
  imageIndex?: number
}

// Arrow-key/Enter navigation is only meant to move the highlight between the
// grid's own cards (identified by their data-path attribute) - buttons
// elsewhere in the app (sidebar, tab bar, breadcrumbs, toolbar) are plain
// buttons too and must keep handling their own Enter/Space activation.
const blocksGridKeyNavigation = (target: EventTarget | null): boolean => {
  if (isTypingTarget(target)) return true
  if (!(target instanceof HTMLElement)) return false
  return target.tagName === 'BUTTON' && !target.hasAttribute('data-path')
}

interface UseGridKeyboardNavArgs {
  collection: FolderCollection
  filteredSubfolders: SearchableSubfolder[]
  highlightPath: string | null
  scrollRoot: HTMLDivElement | null
  isSearching: boolean
  subfolderQuery: string
  onHighlightChange: (path: string) => void
  onSelectSubfolder: (path: string, searchOrigin?: SearchOrigin) => void
  onSelectZip: (zipFile: ZipArchive) => void
  onSelect: (index: number) => void
  onGoUp: () => void
  canGoBack: boolean
  onGoBack: () => void
}

// Finds the item whose card sits in the next/previous visual row, closest
// horizontally to the current card - unlike flat list order, this follows
// the actual multi-column layout (subfolders/zip/images each wrap into
// their own row count depending on the window width).
const findRowNeighborPath = (
  scrollRoot: HTMLDivElement | null,
  highlightPath: string | null,
  direction: 1 | -1
): string | null => {
  if (!scrollRoot || !highlightPath) return null
  const currentEl = scrollRoot.querySelector(`[data-path="${CSS.escape(highlightPath)}"]`)
  if (!currentEl) return null

  const currentRect = currentEl.getBoundingClientRect()
  const centerX = currentRect.left + currentRect.width / 2

  const candidates = Array.from(scrollRoot.querySelectorAll<HTMLElement>('[data-path]'))
    .filter((el) => el !== currentEl)
    .map((el) => ({ path: el.dataset.path ?? '', rect: el.getBoundingClientRect() }))
    .filter(({ rect }) =>
      direction === 1 ? rect.top > currentRect.top + 1 : rect.top < currentRect.top - 1
    )
  if (candidates.length === 0) return null

  const nearestRowTop = candidates.reduce(
    (best, c) => (direction === 1 ? Math.min(best, c.rect.top) : Math.max(best, c.rect.top)),
    direction === 1 ? Infinity : -Infinity
  )
  const sameRow = candidates.filter((c) => Math.abs(c.rect.top - nearestRowTop) <= 4)
  sameRow.sort(
    (a, b) =>
      Math.abs(a.rect.left + a.rect.width / 2 - centerX) -
      Math.abs(b.rect.left + b.rect.width / 2 - centerX)
  )
  return sameRow[0]?.path ?? null
}

// Wires arrow-key/Enter navigation between grid cards, plus Escape to go up
// a folder and Alt+Left / Backspace to go back - mirrors the "↑" and "←"
// breadcrumb buttons so keyboard users get the same shortcuts.
export function useGridKeyboardNav({
  collection,
  filteredSubfolders,
  highlightPath,
  scrollRoot,
  isSearching,
  subfolderQuery,
  onHighlightChange,
  onSelectSubfolder,
  onSelectZip,
  onSelect,
  onGoUp,
  canGoBack,
  onGoBack
}: UseGridKeyboardNavArgs): void {
  const navigableItems = useMemo<NavigableItem[]>(
    () => [
      ...filteredSubfolders.map((subfolder) => ({
        path: subfolder.path,
        kind: 'subfolder' as const
      })),
      ...collection.zipFiles.map((zipFile) => ({
        path: zipFile.path,
        kind: 'zip' as const,
        zipFile
      })),
      ...collection.images.map((image, imageIndex) => ({
        path: image.path,
        kind: 'image' as const,
        imageIndex
      }))
    ],
    [collection, filteredSubfolders]
  )

  const openItem = (item: NavigableItem): void => {
    if (item.kind === 'subfolder') {
      onSelectSubfolder(
        item.path,
        isSearching ? { originFolderPath: collection.path, query: subfolderQuery } : undefined
      )
    } else if (item.kind === 'zip' && item.zipFile) {
      onSelectZip(item.zipFile)
    } else if (item.kind === 'image' && item.imageIndex !== undefined) {
      onSelect(item.imageIndex)
    }
  }

  useKeyboardHandler((event) => {
    if (blocksGridKeyNavigation(event.target)) return

    const action = mapGridKey(event, {
      canGoBack,
      canGoUp: Boolean(collection.parentPath),
      itemCount: navigableItems.length,
      currentIndex: highlightPath
        ? navigableItems.findIndex((item) => item.path === highlightPath)
        : -1
    })
    if (!action) return
    event.preventDefault()

    switch (action.type) {
      case 'goBack':
        return onGoBack()
      case 'goUp':
        return onGoUp()
      case 'highlight':
        return onHighlightChange(navigableItems[action.index]!.path)
      case 'highlightRow': {
        const neighbor = findRowNeighborPath(scrollRoot, highlightPath, action.direction)
        if (neighbor) onHighlightChange(neighbor)
        return
      }
      case 'open':
        return openItem(navigableItems[action.index]!)
    }
  })
}
