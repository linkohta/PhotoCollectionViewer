import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import AdmZip from 'adm-zip'
import sharp from 'sharp'
import type { ConfirmationSettings, FavoriteFolder, SessionData } from '../../src/shared/types'

export interface TestEnvironment {
  baseDir: string
  // The photo folder the app is pointed at (see createTestEnvironment).
  libraryDir: string
  // Passed to the app as PCV_USER_DATA_DIR: app-state.json, thumbnails and
  // Chromium's own profile all end up here.
  userDataDir: string
}

// What the grid shows for the library root, in its natural name order.
export const ROOT_SUBFOLDERS = ['2024', 'Albums']
export const ROOT_ZIP_FILES = ['photos.zip']
export const ROOT_MEDIA = ['01.png', '02.png', '03.png', 'clip.mp4']
export const ROOT_COUNT_LABEL = '2 フォルダ · 1 ZIP · 4 枚'

// Taller than the viewer, so "fit to window" has to shrink it and fit, actual
// size and zoom all give different widths - but no larger than the 960px
// preview the viewer shows first, so its size is the same before and after
// the full image has loaded.
export const LARGE_IMAGE = { name: '03.png', width: 960, height: 900 }

const png = (width: number, height: number, background: string): Promise<Buffer> =>
  sharp({ create: { width, height, channels: 3, background } })
    .png()
    .toBuffer()

const writePng = async (
  path: string,
  width: number,
  height: number,
  background: string
): Promise<void> => {
  writeFileSync(path, await png(width, height, background))
}

// library/
//   2024/          a.png, b.png        (images only: opening it shows the first image)
//   Albums/trip/   1.png               (a folder that only holds a folder)
//   photos.zip     photos/1.png, 2.png (extracts to library/photos, flattened)
//   01.png 02.png 03.png clip.mp4
export async function createTestEnvironment(): Promise<TestEnvironment> {
  const baseDir = mkdtempSync(join(tmpdir(), 'pcv-e2e-'))
  const libraryDir = join(baseDir, 'library')
  const userDataDir = join(baseDir, 'userData')
  mkdirSync(join(libraryDir, '2024'), { recursive: true })
  mkdirSync(join(libraryDir, 'Albums', 'trip'), { recursive: true })
  mkdirSync(userDataDir)

  await writePng(join(libraryDir, '01.png'), 400, 300, '#c0392b')
  await writePng(join(libraryDir, '02.png'), 300, 400, '#27ae60')
  await writePng(
    join(libraryDir, LARGE_IMAGE.name),
    LARGE_IMAGE.width,
    LARGE_IMAGE.height,
    '#2980b9'
  )
  // Not a playable video: the viewer only needs the extension to switch to
  // its <video> branch.
  writeFileSync(join(libraryDir, 'clip.mp4'), 'not a real video')
  await writePng(join(libraryDir, '2024', 'a.png'), 320, 240, '#8e44ad')
  await writePng(join(libraryDir, '2024', 'b.png'), 320, 240, '#16a085')
  await writePng(join(libraryDir, 'Albums', 'trip', '1.png'), 320, 240, '#d35400')

  const zip = new AdmZip()
  zip.addFile('photos/1.png', await png(320, 240, '#f39c12'))
  zip.addFile('photos/2.png', await png(320, 240, '#7f8c8d'))
  zip.writeZip(join(libraryDir, 'photos.zip'))

  return { baseDir, libraryDir, userDataDir }
}

// Adds a single-colour PNG to the library root (before the app is started,
// or the grid will not show it until it is refreshed).
export async function addImage(
  env: TestEnvironment,
  name: string,
  width: number,
  height: number
): Promise<void> {
  await writePng(join(env.libraryDir, name), width, height, '#2c3e50')
}

export function removeTestEnvironment(env: TestEnvironment): void {
  // The app may take a moment to release its files after it exits.
  rmSync(env.baseDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 })
}

export const settingsPath = (env: TestEnvironment): string =>
  join(env.userDataDir, 'app-state.json')

interface Settings {
  favorites: FavoriteFolder[]
  session: SessionData
  windowState: { width: number; height: number }
  confirmations: ConfirmationSettings
}

// Starts the app on a single tab showing the library root, with every
// confirmation dialog turned off so no native dialog blocks the tests.
export function writeSettings(env: TestEnvironment): void {
  const settings: Settings = {
    favorites: [],
    session: {
      tabs: [
        {
          title: 'library',
          rootFolderPath: env.libraryDir,
          currentFolderPath: env.libraryDir,
          selectedIndex: null,
          viewMode: 'grid'
        }
      ],
      activeTabIndex: 0,
      closedTabs: []
    },
    windowState: { width: 1280, height: 800 },
    confirmations: { extractZip: false, deleteFolder: false, importSettings: false }
  }
  writeFileSync(settingsPath(env), JSON.stringify(settings, null, 2))
}

// Changes the seeded settings; only takes effect for apps started afterwards.
export function updateSettings(env: TestEnvironment, change: (settings: Settings) => void): void {
  const settings = JSON.parse(readFileSync(settingsPath(env), 'utf-8')) as Settings
  change(settings)
  writeFileSync(settingsPath(env), JSON.stringify(settings, null, 2))
}

export function readSavedSession(env: TestEnvironment): SessionData {
  return (JSON.parse(readFileSync(settingsPath(env), 'utf-8')) as { session: SessionData }).session
}
