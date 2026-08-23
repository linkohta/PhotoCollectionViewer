import { useEffect, useMemo } from 'react'
import type { FolderCollection, ZipArchive } from '../../../preload/index'
import { isTypingTarget } from '../utils/imagePreload'
import { registerViewerKeyboardHandler } from '../utils/viewerKeyboard'
import type { SearchOrigin } from '../hooks/useFolderNavigation'
import type { SearchableSubfolder } from './useSubfolderSearch'

interface NavigableItem {
  path: string
  kind: 'subfolder' | 'zip' | 'image'
  zipFile?: ZipArchive
  imageIndex?: number
}

// Arrow-key/Enter navigation is only meant to move the highlight between the
// grid's own cards (identified by their data-path attribute) - buttons
// elsewhere in the app (sidebar, tab bar, breadcrumbs, toolbar) are plain
// buttons too and must keep handling their own Enter/Space activation.
function blocksGridKeyNavigation(target: EventTarget | null): boolean {
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
}

// Finds the item whose card sits in the next/previous visual row, closest
// horizontally to the current card - unlike flat list order, this follows
// the actual multi-column layout (subfolders/zip/images each wrap into
// their own row count depending on the window width).
function findRowNeighborPath(
  scrollRoot: HTMLDivElement | null,
  highlightPath: string | null,
  direction: 1 | -1
): string | null {
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
// a folder - mirrors the "↑" breadcrumb button so keyboard users get the
// same shortcut.
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
  onGoUp
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

  useEffect(() => {
    return registerViewerKeyboardHandler((event) => {
      if (blocksGridKeyNavigation(event.target)) return

      if (event.key === 'Escape') {
        if (!collection.parentPath) return
        event.preventDefault()
        onGoUp()
        return
      }

      if (navigableItems.length === 0) return

      const currentIndex = highlightPath
        ? navigableItems.findIndex((item) => item.path === highlightPath)
        : -1

      switch (event.key) {
        case 'ArrowRight': {
          event.preventDefault()
          const next = navigableItems[(currentIndex + 1) % navigableItems.length]
          onHighlightChange(next.path)
          break
        }
        case 'ArrowLeft': {
          event.preventDefault()
          const prevIndex = currentIndex <= 0 ? navigableItems.length - 1 : currentIndex - 1
          onHighlightChange(navigableItems[prevIndex].path)
          break
        }
        case 'ArrowDown': {
          event.preventDefault()
          if (currentIndex < 0) {
            onHighlightChange(navigableItems[0].path)
            break
          }
          const next = findRowNeighborPath(scrollRoot, highlightPath, 1)
          if (next) onHighlightChange(next)
          break
        }
        case 'ArrowUp': {
          event.preventDefault()
          if (currentIndex < 0) {
            onHighlightChange(navigableItems[navigableItems.length - 1].path)
            break
          }
          const prev = findRowNeighborPath(scrollRoot, highlightPath, -1)
          if (prev) onHighlightChange(prev)
          break
        }
        case 'Enter': {
          if (currentIndex < 0) return
          event.preventDefault()
          const item = navigableItems[currentIndex]
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
          break
        }
        default:
          break
      }
    })
  }, [
    navigableItems,
    highlightPath,
    scrollRoot,
    onHighlightChange,
    onSelectSubfolder,
    onSelectZip,
    onSelect,
    onGoUp,
    isSearching,
    collection.path,
    collection.parentPath,
    subfolderQuery
  ])
}
