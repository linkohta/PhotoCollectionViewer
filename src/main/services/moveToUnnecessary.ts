import { moveToTrash } from './trash'

// Unneeded images always go to the Recycle Bin, so they can still be restored
// from Explorer if moved by mistake.
export function moveToUnnecessary(targetPath: string): Promise<void> {
  return moveToTrash(targetPath, '画像をごみ箱へ移動できませんでした')
}
