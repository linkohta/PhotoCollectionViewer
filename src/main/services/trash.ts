import { shell } from 'electron'

// Moves the item to the Recycle Bin rather than deleting it outright, so a
// mistake can still be undone from Explorer. A failure is reported with
// failureMessage, which the renderer shows to the user.
export async function moveToTrash(targetPath: string, failureMessage: string): Promise<void> {
  try {
    await shell.trashItem(targetPath)
  } catch {
    throw new Error(failureMessage)
  }
}
