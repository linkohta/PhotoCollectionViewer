import { dialog } from 'electron'

// Returns the folder picked in the system dialog, or null when cancelled.
export async function chooseFolderViaDialog(): Promise<string | null> {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  })
  if (result.canceled || result.filePaths.length === 0) return null
  return result.filePaths[0]
}
