import { basename } from 'path'
import { confirmUnlessDisabled } from './confirmDialog'
import { moveToTrash } from './trash'

// Asks for confirmation, then moves the folder to the Recycle Bin. Returns
// false when the user cancels.
export async function confirmAndDeleteFolder(folderPath: string): Promise<boolean> {
  const confirmed = await confirmUnlessDisabled('deleteFolder', {
    type: 'warning',
    title: 'フォルダの削除',
    message: `「${basename(folderPath)}」を削除しますか？`,
    detail: `フォルダとその中身をすべてごみ箱へ移動します。\n${folderPath}`,
    confirmLabel: '削除',
    defaultToCancel: true
  })
  if (!confirmed) return false

  await moveToTrash(folderPath, 'フォルダの削除に失敗しました')
  return true
}
