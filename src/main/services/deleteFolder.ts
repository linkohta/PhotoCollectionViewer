import { basename } from 'path'
import { confirmUnlessDisabled } from './confirmDialog'
import { moveToTrash } from './trash'

// Asks for confirmation, then moves the folder to the Recycle Bin. Returns
// false when the user cancels.
export async function confirmAndDeleteFolder(folderPath: string): Promise<boolean> {
  const confirmed = await confirmUnlessDisabled('deleteFolder', {
    type: 'warning',
    buttons: ['削除', 'キャンセル'],
    defaultId: 1,
    cancelId: 1,
    noLink: true,
    title: 'フォルダの削除',
    message: `「${basename(folderPath)}」を削除しますか？`,
    detail: `フォルダとその中身をすべてごみ箱へ移動します。\n${folderPath}`
  })
  if (!confirmed) return false

  await moveToTrash(folderPath, 'フォルダの削除に失敗しました')
  return true
}
