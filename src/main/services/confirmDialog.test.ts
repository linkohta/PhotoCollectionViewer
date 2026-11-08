import { dialog } from 'electron'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { isConfirmationEnabled, setConfirmationEnabled } from '../store/confirmations'
import { confirmUnlessDisabled } from './confirmDialog'
import { confirmAndDeleteFolder } from './deleteFolder'
import { importSettingsViaDialog } from './settingsDialogs'
import { confirmExtractZip } from './zipDialogs'

vi.mock('electron', () => ({
  dialog: { showMessageBox: vi.fn(), showOpenDialog: vi.fn(), showSaveDialog: vi.fn() },
  BrowserWindow: { getAllWindows: () => [] }
}))
vi.mock('../store/confirmations', () => ({
  isConfirmationEnabled: vi.fn(),
  setConfirmationEnabled: vi.fn()
}))
vi.mock('../store/appState', () => ({ exportAppState: vi.fn(), importAppState: vi.fn() }))
vi.mock('./trash', () => ({ moveToTrash: vi.fn() }))

const answer = (response: number, checkboxChecked = false): void => {
  vi.mocked(dialog.showMessageBox).mockResolvedValue({ response, checkboxChecked })
}

const shownOptions = (): unknown => vi.mocked(dialog.showMessageBox).mock.calls[0]?.[0]

beforeEach(() => {
  vi.mocked(isConfirmationEnabled).mockReturnValue(true)
  answer(0)
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('confirmUnlessDisabled', () => {
  const prompt: Parameters<typeof confirmUnlessDisabled>[1] = {
    type: 'question',
    buttons: ['OK', 'キャンセル'],
    message: 'm'
  }

  it('confirms without asking when the confirmation is turned off', async () => {
    vi.mocked(isConfirmationEnabled).mockReturnValue(false)

    await expect(confirmUnlessDisabled('extractZip', prompt)).resolves.toBe(true)
    expect(dialog.showMessageBox).not.toHaveBeenCalled()
  })

  it('confirms with the first button and cancels with any other', async () => {
    await expect(confirmUnlessDisabled('extractZip', prompt)).resolves.toBe(true)
    answer(1)
    await expect(confirmUnlessDisabled('extractZip', prompt)).resolves.toBe(false)
  })

  it('turns the confirmation off when confirmed with "don\'t show again" checked', async () => {
    answer(0, true)

    await confirmUnlessDisabled('deleteFolder', prompt)

    expect(setConfirmationEnabled).toHaveBeenCalledWith('deleteFolder', false)
  })

  it('keeps the confirmation when cancelled with "don\'t show again" checked', async () => {
    answer(1, true)

    await confirmUnlessDisabled('deleteFolder', prompt)

    expect(setConfirmationEnabled).not.toHaveBeenCalled()
  })
})

// The exact dialogs the app shows, so building them differently can't change
// what the user sees.
describe('the confirmation dialogs', () => {
  const dontShowAgain = { checkboxLabel: '今後この確認を表示しない', checkboxChecked: false }

  it('asks before extracting a zip file', async () => {
    await confirmExtractZip('photos.zip', 'C:\\library\\photos', false)

    expect(shownOptions()).toEqual({
      type: 'question',
      buttons: ['解凍', 'キャンセル'],
      defaultId: 0,
      cancelId: 1,
      noLink: true,
      title: 'ZIPファイル',
      message: '「photos.zip」を解凍しますか？',
      detail:
        'ZIP内に同名フォルダがある場合は、その中身を次の場所へ展開します。\nC:\\library\\photos',
      ...dontShowAgain
    })
  })

  it('asks before opening a zip file that is already extracted', async () => {
    await confirmExtractZip('photos.zip', 'C:\\library\\photos', true)

    expect(shownOptions()).toEqual({
      type: 'question',
      buttons: ['開く', 'キャンセル'],
      defaultId: 0,
      cancelId: 1,
      noLink: true,
      title: 'ZIPファイル',
      message: '「photos.zip」は既に解凍済みです。',
      detail: '解凍先フォルダを開きます。\nC:\\library\\photos',
      ...dontShowAgain
    })
  })

  it('asks before deleting a folder, with cancel as the default', async () => {
    await confirmAndDeleteFolder('C:\\library\\old')

    expect(shownOptions()).toEqual({
      type: 'warning',
      buttons: ['削除', 'キャンセル'],
      defaultId: 1,
      cancelId: 1,
      noLink: true,
      title: 'フォルダの削除',
      message: '「old」を削除しますか？',
      detail: 'フォルダとその中身をすべてごみ箱へ移動します。\nC:\\library\\old',
      ...dontShowAgain
    })
  })

  it('asks before importing settings', async () => {
    vi.mocked(dialog.showOpenDialog).mockResolvedValue({
      canceled: false,
      filePaths: ['C:\\settings.json']
    })

    await importSettingsViaDialog()

    expect(shownOptions()).toEqual({
      type: 'question',
      buttons: ['インポート', 'キャンセル'],
      defaultId: 0,
      cancelId: 1,
      noLink: true,
      title: '設定をインポート',
      message: '現在の設定を上書きしてインポートしますか？',
      detail: '反映のためアプリの表示を再読み込みします。',
      ...dontShowAgain
    })
  })
})
