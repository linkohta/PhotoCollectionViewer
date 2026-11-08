import { existsSync, mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { app } from 'electron'

export function getAppRootDir(): string {
  // In development app-state.json sits in the project root, except during E2E
  // runs, which point userData at a throwaway profile (PCV_USER_DATA_DIR, see
  // main/bootstrap.ts) and keep the settings there too.
  if (app.isPackaged || process.env['PCV_USER_DATA_DIR']) {
    return app.getPath('userData')
  }

  return app.getAppPath()
}

/**
 * 旧バージョンではインストールディレクトリ(exeと同じ場所)を設定保存先にしていたため、
 * アップデートインストール時に設定ファイルが消えていた。移行のため旧パスも参照できるようにする。
 */
export function getLegacyAppRootDir(): string {
  return dirname(app.getPath('exe'))
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
