import { describe, expect, it, vi } from 'vitest'
import type { ZipArchive } from '../../../shared/types'
import { createEmptyTab, type TabUpdater } from '../types/tab'
import { bindTabActions, type TabNavigation } from './tabActions'

const TAB_ID = 'tab-1'
const ROOT = 'C:\\Photos'
const ZIP: ZipArchive = {
  path: 'C:\\Photos\\a.zip',
  name: 'a.zip',
  size: 1,
  modified: 0,
  extractPath: 'C:\\Photos\\a',
  isExtracted: false
}
const REMOTE_ERROR = new Error(
  "Error invoking remote method 'fs:moveToTrash': Error: ごみ箱へ移動できません"
)

const fakeNavigation = (): TabNavigation => ({
  handleSelectImage: vi.fn(),
  handleSelectSubfolder: vi.fn(async () => {}),
  handleOpenSubfolderInNewTab: vi.fn(async () => {}),
  handleSelectZip: vi.fn(async () => {}),
  handleOpenZipInNewTab: vi.fn(async () => {}),
  handleGoUp: vi.fn(async () => {}),
  handleGoBack: vi.fn(async () => {}),
  handleRefreshFolder: vi.fn(async () => {}),
  handleRenameItem: vi.fn(async (_tabId: string, oldPath: string) => oldPath),
  handleMoveToTrash: vi.fn(async () => {}),
  handleDeleteSubfolder: vi.fn(async () => true),
  handleCloseViewer: vi.fn(async () => {}),
  handleNavigate: vi.fn()
})

const bind = (navigation: TabNavigation = fakeNavigation()) => {
  const deps = {
    tabId: TAB_ID,
    rootFolderPath: ROOT,
    navigation,
    updateTab: vi.fn(),
    focusMain: vi.fn(),
    refreshFavorites: vi.fn(async () => {}),
    showError: vi.fn()
  }
  return { ...deps, actions: bindTabActions(deps) }
}

describe('bindTabActions', () => {
  it('calls the navigation for the bound tab', () => {
    const { navigation, actions } = bind()
    const searchOrigin = { originFolderPath: ROOT, query: 'trip' }

    actions.grid.selectImage(2)
    actions.grid.selectSubfolder('C:\\Photos\\trip', searchOrigin)
    actions.grid.selectZip(ZIP)
    actions.grid.goUp()
    actions.grid.goBack()
    actions.grid.refresh()
    actions.viewer.close()
    actions.viewer.navigate(-1)

    expect(navigation.handleSelectImage).toHaveBeenCalledWith(TAB_ID, 2)
    expect(navigation.handleSelectSubfolder).toHaveBeenCalledWith(
      TAB_ID,
      'C:\\Photos\\trip',
      searchOrigin
    )
    expect(navigation.handleSelectZip).toHaveBeenCalledWith(TAB_ID, ZIP)
    expect(navigation.handleGoUp).toHaveBeenCalledWith(TAB_ID)
    expect(navigation.handleGoBack).toHaveBeenCalledWith(TAB_ID)
    expect(navigation.handleRefreshFolder).toHaveBeenCalledWith(TAB_ID)
    expect(navigation.handleCloseViewer).toHaveBeenCalledWith(TAB_ID)
    expect(navigation.handleNavigate).toHaveBeenCalledWith(TAB_ID, -1)
  })

  it('opens new tabs under the root folder of the bound tab', () => {
    const { navigation, actions } = bind()

    actions.grid.openSubfolderInNewTab('C:\\Photos\\trip')
    actions.grid.openZipInNewTab(ZIP)

    expect(navigation.handleOpenSubfolderInNewTab).toHaveBeenCalledWith('C:\\Photos\\trip', ROOT)
    expect(navigation.handleOpenZipInNewTab).toHaveBeenCalledWith(ZIP, ROOT)
  })

  it('gives the focus back after opening an image', () => {
    const { navigation, focusMain, actions } = bind()

    actions.grid.selectImage(0)

    expect(focusMain).toHaveBeenCalledOnce()
    expect(vi.mocked(navigation.handleSelectImage).mock.invocationCallOrder[0]).toBeLessThan(
      focusMain.mock.invocationCallOrder[0]!
    )
  })

  it('updates the highlight and the pending search query of the bound tab', () => {
    const { updateTab, actions } = bind()
    const tab = { ...createEmptyTab(), pendingSearchQuery: 'trip' }

    actions.grid.highlight('C:\\Photos\\a.png')
    actions.grid.consumePendingSearchQuery()

    const [highlight, consume] = updateTab.mock.calls as [string, TabUpdater][]
    expect(highlight![0]).toBe(TAB_ID)
    expect(highlight![1](tab).highlightPath).toBe('C:\\Photos\\a.png')
    expect(consume![0]).toBe(TAB_ID)
    expect(consume![1](tab).pendingSearchQuery).toBeNull()
  })

  it('refreshes the favorites after renaming', async () => {
    const { navigation, refreshFavorites, actions } = bind()

    await actions.grid.renameItem('C:\\Photos\\old', 'new')

    expect(navigation.handleRenameItem).toHaveBeenCalledWith(TAB_ID, 'C:\\Photos\\old', 'new')
    expect(refreshFavorites).toHaveBeenCalledOnce()
  })

  it('leaves a failed rename to the caller, without refreshing the favorites', async () => {
    const navigation = fakeNavigation()
    vi.mocked(navigation.handleRenameItem).mockRejectedValue(new Error('同名が存在します'))
    const { refreshFavorites, actions } = bind(navigation)

    await expect(actions.grid.renameItem('C:\\Photos\\old', 'new')).rejects.toThrow(
      '同名が存在します'
    )
    expect(refreshFavorites).not.toHaveBeenCalled()
  })

  it.each(['grid', 'viewer'] as const)(
    'shows why moving to the Recycle Bin failed (%s)',
    async (from) => {
      const navigation = fakeNavigation()
      vi.mocked(navigation.handleMoveToTrash).mockRejectedValue(REMOTE_ERROR)
      const { showError, actions } = bind(navigation)

      actions[from].moveToTrash('C:\\Photos\\a.png')

      await vi.waitFor(() => expect(showError).toHaveBeenCalledWith('ごみ箱へ移動できません'))
      expect(navigation.handleMoveToTrash).toHaveBeenCalledWith(TAB_ID, 'C:\\Photos\\a.png')
    }
  )

  it('resolves whether the subfolder was deleted', async () => {
    const navigation = fakeNavigation()
    vi.mocked(navigation.handleDeleteSubfolder).mockResolvedValue(false)
    const { actions } = bind(navigation)

    await expect(actions.grid.deleteSubfolder('C:\\Photos\\trip')).resolves.toBe(false)
    expect(navigation.handleDeleteSubfolder).toHaveBeenCalledWith(TAB_ID, 'C:\\Photos\\trip')
  })

  it('shows why deleting a subfolder failed and resolves false', async () => {
    const navigation = fakeNavigation()
    vi.mocked(navigation.handleDeleteSubfolder).mockRejectedValue(new Error(''))
    const { showError, actions } = bind(navigation)

    await expect(actions.grid.deleteSubfolder('C:\\Photos\\trip')).resolves.toBe(false)
    expect(showError).toHaveBeenCalledWith('フォルダの削除に失敗しました')
  })
})
