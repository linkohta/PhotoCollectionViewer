import { moveToTrash } from './trash'

// Images are moved to the Recycle Bin rather than deleted, so they can still
// be restored from Explorer if moved by mistake.
export function moveImageToTrash(targetPath: string): Promise<void> {
  return moveToTrash(targetPath, '画像をごみ箱へ移動できませんでした')
}
