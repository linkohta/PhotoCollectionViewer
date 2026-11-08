import { useState } from 'react'
import type { GridItemKind } from '../types/grid'
import { gridItemMenuEntries, type GridItem, type GridItemMenuEntries } from '../utils/gridItemMenu'
import type { GridActions } from '../utils/tabActions'

interface UseGridItemMenuArgs {
  actions: GridActions
  // Drops a deleted folder from the subfolder search results.
  removeSearchResult: (path: string) => void
}

// The grid's context menu, ready to be passed to ContextMenu as it is.
interface OpenItemMenu extends GridItemMenuEntries {
  x: number
  y: number
  label: string
}

interface MenuTarget {
  x: number
  y: number
  item: GridItem
}

interface RenamingTarget {
  kind: GridItemKind
  path: string
}

interface MouseEventLike {
  clientX: number
  clientY: number
  preventDefault: () => void
}

// The context menu of the grid's cards and the renaming it can start: which
// card the menu is open on, which card is being renamed, and what each menu
// entry does.
export function useGridItemMenu({ actions, removeSearchResult }: UseGridItemMenuArgs) {
  const [target, setTarget] = useState<MenuTarget | null>(null)
  const [renaming, setRenaming] = useState<RenamingTarget | null>(null)

  const openMenu = (event: MouseEventLike, item: GridItem): void => {
    event.preventDefault()
    setTarget({ x: event.clientX, y: event.clientY, item })
  }

  const closeMenu = (): void => setTarget(null)

  const isRenaming = (kind: GridItemKind, path: string): boolean =>
    renaming?.kind === kind && renaming.path === path

  const submitRename = async (newName: string): Promise<void> => {
    if (!renaming) return
    await actions.renameItem(renaming.path, newName)
    setRenaming(null)
  }

  const cancelRename = (): void => setRenaming(null)

  const deleteSubfolder = async (path: string): Promise<void> => {
    if (await actions.deleteSubfolder(path)) removeSearchResult(path)
  }

  const menu: OpenItemMenu | null = target && {
    x: target.x,
    y: target.y,
    label: target.item.name,
    ...gridItemMenuEntries(target.item, {
      actions,
      startRenaming: () => setRenaming({ kind: target.item.kind, path: target.item.path }),
      deleteSubfolder: (path) => void deleteSubfolder(path)
    })
  }

  return { menu, openMenu, closeMenu, isRenaming, submitRename, cancelRename }
}
