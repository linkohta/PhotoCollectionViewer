import { shell } from 'electron'

// Unneeded images always go to the Recycle Bin, so they can still be restored
// from Explorer if moved by mistake.
export async function moveToUnnecessary(targetPath: string): Promise<void> {
  try {
    await shell.trashItem(targetPath)
  } catch {
    throw new Error('画像をごみ箱へ移動できませんでした')
  }
}
