import { dialog } from 'electron'

// Returns the folder picked in the system dialog, or null when cancelled.
export async function chooseFolderViaDialog(): Promise<string | null> {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  })
  const [folderPath] = result.filePaths
  if (result.canceled || folderPath === undefined) return null
  return folderPath
}
