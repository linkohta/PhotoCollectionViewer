import type { ZipArchive } from '../../../shared/types'
import type { FolderNavigation } from '../hooks/useFolderNavigation'
import type { SearchOrigin } from '../types/grid'
import type { UpdateTab } from '../types/tab'
import { toUserMessage } from './errorMessage'

// What the grid of one tab can ask for. Each function is already bound to that
// tab, so the components below don't need to know its id.
export interface GridActions {
  selectImage: (index: number) => void
  selectSubfolder: (path: string, searchOrigin?: SearchOrigin) => void
  openSubfolderInNewTab: (path: string) => void
  selectZip: (zipFile: ZipArchive) => void
  openZipInNewTab: (zipFile: ZipArchive) => void
  highlight: (path: string) => void
  consumePendingSearchQuery: () => void
  goUp: () => void
  goBack: () => void
  refresh: () => void
  renameItem: (path: string, newName: string) => Promise<void>
  moveToTrash: (path: string) => void
  // Resolves false when the folder was not deleted (cancelled or failed).
  deleteSubfolder: (path: string) => Promise<boolean>
}

// What the viewer of one tab can ask for, bound to that tab like GridActions.
export interface ViewerActions {
  close: () => void
  navigate: (direction: -1 | 1) => void
  moveToTrash: (path: string) => void
}

export interface TabActions {
  grid: GridActions
  viewer: ViewerActions
}

// The parts of useFolderNavigation the actions are made from.
export type TabNavigation = Pick<
  FolderNavigation,
  | 'handleSelectImage'
  | 'handleSelectSubfolder'
  | 'handleOpenSubfolderInNewTab'
  | 'handleSelectZip'
  | 'handleOpenZipInNewTab'
  | 'handleGoUp'
  | 'handleGoBack'
  | 'handleRefreshFolder'
  | 'handleRenameItem'
  | 'handleMoveToTrash'
  | 'handleDeleteSubfolder'
  | 'handleCloseViewer'
  | 'handleNavigate'
>

interface TabActionsDeps {
  tabId: string
  rootFolderPath: string | null
  navigation: TabNavigation
  updateTab: UpdateTab
  // Gives the keyboard focus back to the tab's content.
  focusMain: () => void
  // Renaming a folder can change the path of a favorite.
  refreshFavorites: () => Promise<void>
  showError: (message: string) => void
}

export const bindTabActions = ({
  tabId,
  rootFolderPath,
  navigation,
  updateTab,
  focusMain,
  refreshFavorites,
  showError
}: TabActionsDeps): TabActions => {
  const moveToTrash = async (path: string): Promise<void> => {
    try {
      await navigation.handleMoveToTrash(tabId, path)
    } catch (error) {
      showError(toUserMessage(error, '画像をごみ箱へ移動できませんでした'))
    }
  }

  const grid: GridActions = {
    selectImage: (index) => {
      navigation.handleSelectImage(tabId, index)
      focusMain()
    },
    selectSubfolder: (path, searchOrigin) =>
      void navigation.handleSelectSubfolder(tabId, path, searchOrigin),
    openSubfolderInNewTab: (path) =>
      void navigation.handleOpenSubfolderInNewTab(path, rootFolderPath),
    selectZip: (zipFile) => void navigation.handleSelectZip(tabId, zipFile),
    openZipInNewTab: (zipFile) => void navigation.handleOpenZipInNewTab(zipFile, rootFolderPath),
    highlight: (path) => updateTab(tabId, (tab) => ({ ...tab, highlightPath: path })),
    consumePendingSearchQuery: () =>
      updateTab(tabId, (tab) => ({ ...tab, pendingSearchQuery: null })),
    goUp: () => void navigation.handleGoUp(tabId),
    goBack: () => void navigation.handleGoBack(tabId),
    refresh: () => void navigation.handleRefreshFolder(tabId),
    renameItem: async (path, newName) => {
      await navigation.handleRenameItem(tabId, path, newName)
      await refreshFavorites()
    },
    moveToTrash: (path) => void moveToTrash(path),
    deleteSubfolder: async (path) => {
      try {
        return await navigation.handleDeleteSubfolder(tabId, path)
      } catch (error) {
        showError(toUserMessage(error, 'フォルダの削除に失敗しました'))
        return false
      }
    }
  }

  const viewer: ViewerActions = {
    close: () => void navigation.handleCloseViewer(tabId),
    navigate: (direction) => navigation.handleNavigate(tabId, direction),
    moveToTrash: (path) => void moveToTrash(path)
  }

  return { grid, viewer }
}
