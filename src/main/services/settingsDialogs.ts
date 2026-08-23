import { dialog, BrowserWindow } from 'electron'
import { exportAppState, importAppState } from '../store/appState'

export async function exportSettingsViaDialog(): Promise<boolean> {
  const result = await dialog.showSaveDialog({
    title: '設定をエクスポート',
    defaultPath: 'photocollection-settings.json',
    filters: [{ name: 'JSON', extensions: ['json'] }]
  })
  if (result.canceled || !result.filePath) return false

  try {
    exportAppState(result.filePath)
    return true
  } catch {
    throw new Error('設定のエクスポートに失敗しました')
  }
}

export async function importSettingsViaDialog(): Promise<boolean> {
  const result = await dialog.showOpenDialog({
    title: '設定をインポート',
    properties: ['openFile'],
    filters: [{ name: 'JSON', extensions: ['json'] }]
  })
  if (result.canceled || result.filePaths.length === 0) return false

  const confirm = await dialog.showMessageBox({
    type: 'question',
    buttons: ['インポート', 'キャンセル'],
    defaultId: 0,
    cancelId: 1,
    noLink: true,
    title: '設定をインポート',
    message: '現在の設定を上書きしてインポートしますか？',
    detail: '反映のためアプリの表示を再読み込みします。'
  })
  if (confirm.response !== 0) return false

  try {
    importAppState(result.filePaths[0])
  } catch {
    throw new Error('設定ファイルの読み込みに失敗しました。ファイルの内容を確認してください。')
  }

  // app.relaunch() は開発時(electron-vite)のプロセス管理と噛み合わず再起動に失敗するため、
  // プロセスは維持したまま各ウィンドウを再読み込みして新しい状態を反映する。
  for (const win of BrowserWindow.getAllWindows()) {
    win.reload()
  }
  return true
}
