import type { FolderHistoryEntry, TabState } from '../types/tab'
import { isSamePath } from './files'

// Caps how many previous folders the "←" back button can walk through per tab.
const HISTORY_LIMIT = 50

// 'push' records the folder being left so "←" can return to it, 'back' drops
// the latest entry when it is the destination (going back, or closing an
// auto-opened viewer returns to where the user came from).
export type HistoryMode = 'push' | 'back'

export function nextFolderHistory(
  tab: TabState,
  nextFolderPath: string,
  mode: HistoryMode
): FolderHistoryEntry[] {
  const current = tab.collection
  if (!current || !tab.rootFolderPath) return tab.history
  if (isSamePath(current.path, nextFolderPath)) return tab.history

  const last = tab.history[tab.history.length - 1]
  if (mode === 'back') {
    return last && isSamePath(last.folderPath, nextFolderPath)
      ? tab.history.slice(0, -1)
      : tab.history
  }

  return [...tab.history, { folderPath: current.path, rootFolderPath: tab.rootFolderPath }].slice(
    -HISTORY_LIMIT
  )
}
