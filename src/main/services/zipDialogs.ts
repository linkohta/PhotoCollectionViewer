import { dialog } from 'electron'

export async function confirmExtractZip(
  zipName: string,
  extractPath: string,
  isExtracted: boolean
): Promise<boolean> {
  const result = await dialog.showMessageBox({
    type: 'question',
    buttons: isExtracted ? ['開く', 'キャンセル'] : ['解凍', 'キャンセル'],
    defaultId: 0,
    cancelId: 1,
    noLink: true,
    title: 'ZIPファイル',
    message: isExtracted ? `「${zipName}」は既に解凍済みです。` : `「${zipName}」を解凍しますか？`,
    detail: isExtracted
      ? `解凍先フォルダを開きます。\n${extractPath}`
      : `ZIP内に同名フォルダがある場合は、その中身を次の場所へ展開します。\n${extractPath}`
  })

  return result.response === 0
}
