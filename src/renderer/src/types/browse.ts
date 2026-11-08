import type { HistoryMode } from '../utils/folderHistory'

// How a folder is opened in a tab (see useBrowseFolder).
export interface BrowseOptions {
  resetRoot?: boolean
  // Use rootPath as the tab's root as-is (going back to a folder that was
  // opened under a different root), instead of keeping the current root.
  replaceRoot?: boolean
  historyMode?: HistoryMode
  fromSubfolder?: boolean
  highlightPath?: string
  returnFolderPath?: string
  returnSearchQuery?: string
  searchQuery?: string
}
