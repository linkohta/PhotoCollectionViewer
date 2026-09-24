import { dialog, shell } from 'electron'
import { basename } from 'path'

// Asks for confirmation, then moves the folder to the Recycle Bin rather than
// deleting it outright, so a mistaken delete can still be restored from
// Explorer. Returns false when the user cancels.
export async function confirmAndDeleteFolder(folderPath: string): Promise<boolean> {
  const result = await dialog.showMessageBox({
    type: 'warning',
    buttons: ['削除', 'キャンセル'],
    defaultId: 1,
    cancelId: 1,
    noLink: true,
    title: 'フォルダの削除',
    message: `「${basename(folderPath)}」を削除しますか？`,
    detail: `フォルダとその中身をすべてごみ箱へ移動します。\n${folderPath}`
  })
  if (result.response !== 0) return false

  try {
    await shell.trashItem(folderPath)
  } catch {
    throw new Error('フォルダの削除に失敗しました')
  }
  return true
}
