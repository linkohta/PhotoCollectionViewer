import { confirmUnlessDisabled } from './confirmDialog'

export async function confirmExtractZip(
  zipName: string,
  extractPath: string,
  isExtracted: boolean
): Promise<boolean> {
  return confirmUnlessDisabled('extractZip', {
    type: 'question',
    title: 'ZIPファイル',
    confirmLabel: isExtracted ? '開く' : '解凍',
    message: isExtracted ? `「${zipName}」は既に解凍済みです。` : `「${zipName}」を解凍しますか？`,
    detail: isExtracted
      ? `解凍先フォルダを開きます。\n${extractPath}`
      : `ZIP内に同名フォルダがある場合は、その中身を次の場所へ展開します。\n${extractPath}`
  })
}
