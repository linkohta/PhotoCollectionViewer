import { existsSync, mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { app } from 'electron'

export function getAppRootDir(): string {
  if (app.isPackaged) {
    return dirname(app.getPath('exe'))
  }

  return app.getAppPath()
}

function ensureAppRootDir(): string {
  const dir = getAppRootDir()
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  return dir
}

export function getAppRootFilePath(filename: string): string {
  return join(ensureAppRootDir(), filename)
}
