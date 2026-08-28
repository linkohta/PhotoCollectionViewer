import { rename, mkdir, copyFile, unlink } from 'fs/promises'
import { existsSync } from 'fs'
import { app } from 'electron'
import { join, basename, extname } from 'path'
import { readAppStateSlice, writeAppStateSlice } from '../store/appState'
import { renameFavoritePaths } from '../store/favorites'

export function getDefaultUnnecessaryImagesFolder(): string {
  return join(app.getPath('pictures'), 'unnecessary-images')
}

export function getUnnecessaryImagesFolder(): string {
  const configured = readAppStateSlice('unnecessaryImagesFolder')
  return configured || getDefaultUnnecessaryImagesFolder()
}

export function setUnnecessaryImagesFolder(folderPath: string | null): string {
  writeAppStateSlice('unnecessaryImagesFolder', folderPath)
  return getUnnecessaryImagesFolder()
}

function buildUniqueDestPath(destDir: string, fileName: string): string {
  const ext = extname(fileName)
  const base = basename(fileName, ext)
  let candidate = join(destDir, fileName)
  let counter = 1
  while (existsSync(candidate)) {
    candidate = join(destDir, `${base} (${counter})${ext}`)
    counter += 1
  }
  return candidate
}

export async function moveToUnnecessary(targetPath: string): Promise<string> {
  const destDir = getUnnecessaryImagesFolder()
  await mkdir(destDir, { recursive: true })

  const destPath = buildUniqueDestPath(destDir, basename(targetPath))

  try {
    await rename(targetPath, destPath)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EXDEV') {
      await copyFile(targetPath, destPath)
      await unlink(targetPath)
    } else {
      throw new Error('画像の移動に失敗しました')
    }
  }

  renameFavoritePaths(targetPath, destPath)

  return destPath
}
