import type { ZipArchive } from '../../../shared/types'
import type { GridActions } from './tabActions'

// A card in the grid that a context menu was opened on.
export type GridItem =
  | { kind: 'subfolder'; path: string; name: string }
  | { kind: 'zip'; path: string; name: string; zipFile: ZipArchive }
  | { kind: 'image'; path: string; name: string }

// The context menu's entries, as ContextMenu takes them. An entry that is
// left out is not shown.
export interface GridItemMenuEntries {
  onOpenInNewTab?: () => void
  onRename: () => void
  onMoveToTrash?: () => void
  onDelete?: () => void
}

interface GridItemMenuDeps {
  actions: Pick<GridActions, 'openSubfolderInNewTab' | 'openZipInNewTab' | 'moveToTrash'>
  startRenaming: () => void
  deleteSubfolder: (path: string) => void
}

// What the context menu offers for each kind of card. Every kind can be
// renamed; only folders and ZIP files open in a new tab, only images go to
// the Recycle Bin from here and only folders can be deleted.
export const gridItemMenuEntries = (
  item: GridItem,
  { actions, startRenaming, deleteSubfolder }: GridItemMenuDeps
): GridItemMenuEntries => {
  switch (item.kind) {
    case 'subfolder':
      return {
        onOpenInNewTab: () => actions.openSubfolderInNewTab(item.path),
        onRename: startRenaming,
        onDelete: () => deleteSubfolder(item.path)
      }
    case 'zip':
      return {
        onOpenInNewTab: () => actions.openZipInNewTab(item.zipFile),
        onRename: startRenaming
      }
    case 'image':
      return {
        onRename: startRenaming,
        onMoveToTrash: () => actions.moveToTrash(item.path)
      }
  }
}
