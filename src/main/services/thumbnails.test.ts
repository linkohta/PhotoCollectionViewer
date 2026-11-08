import { mkdirSync, mkdtempSync, rmSync, statSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import sharp from 'sharp'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getOrCreateThumbnailPath, getThumbnailDataUrl } from './thumbnails'

const env = vi.hoisted(() => ({ userDataDir: '' }))

vi.mock('electron', () => ({ app: { getPath: () => env.userDataDir } }))

let workDir: string

beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), 'pcv-thumbs-'))
  env.userDataDir = join(workDir, 'userData')
  mkdirSync(env.userDataDir)
})

afterEach(() => {
  rmSync(workDir, { recursive: true, force: true })
})

const writePng = async (name: string, width: number, height: number): Promise<string> => {
  const filePath = join(workDir, name)
  await sharp({ create: { width, height, channels: 3, background: '#336699' } })
    .png()
    .toFile(filePath)
  return filePath
}

const thumbnailOf = (filePath: string, maxSize: number): Promise<string | null> => {
  const { mtimeMs, size } = statSync(filePath)
  return getOrCreateThumbnailPath(filePath, maxSize, mtimeMs, size)
}

describe('getOrCreateThumbnailPath', () => {
  // Thumbnails already on users' disks are only found again while their file
  // names are worked out exactly like this.
  it.each([
    [
      'C:\\Photos\\a.jpg',
      960,
      1700000000000,
      12345,
      '37e06a42b74171cbc2ea607cb317145650a3fc666fea6a1cbda11c9cdbf908d2'
    ],
    [
      'C:\\写真\\猫 ①.png',
      240,
      1700000000000.5,
      1,
      '64ccf13f503d65dd6314b4fde50487cabdb8f0218b055ca9dca43061d5b2550d'
    ]
  ])('finds the thumbnail of %s (%i px) by its file name', async (...args) => {
    const [filePath, maxSize, modified, fileSize, hash] = args
    const cached = join(env.userDataDir, 'thumbnails', `${hash}.jpg`)
    mkdirSync(join(env.userDataDir, 'thumbnails'), { recursive: true })
    writeFileSync(cached, 'jpeg')

    await expect(getOrCreateThumbnailPath(filePath, maxSize, modified, fileSize)).resolves.toBe(
      cached
    )
  })

  it('creates a JPEG that fits within the size, in userData/thumbnails', async () => {
    const thumbnail = await thumbnailOf(await writePng('wide.png', 400, 300), 100)

    expect(thumbnail?.startsWith(join(env.userDataDir, 'thumbnails'))).toBe(true)
    const metadata = await sharp(thumbnail!).metadata()
    expect([metadata.format, metadata.width, metadata.height]).toEqual(['jpeg', 100, 75])
  })

  it('does not enlarge an image smaller than the size', async () => {
    const metadata = await sharp(
      (await thumbnailOf(await writePng('small.png', 50, 40), 100))!
    ).metadata()

    expect([metadata.width, metadata.height]).toEqual([50, 40])
  })

  it('reuses a thumbnail it already created', async () => {
    const source = await writePng('photo.png', 200, 200)
    const first = await thumbnailOf(source, 100)
    const createdAt = statSync(first!).mtimeMs

    expect(await thumbnailOf(source, 100)).toBe(first)
    expect(statSync(first!).mtimeMs).toBe(createdAt)
  })

  it('returns null for a file it cannot decode', async () => {
    const source = join(workDir, 'broken.png')
    writeFileSync(source, 'not an image')

    expect(await thumbnailOf(source, 100)).toBeNull()
  })
})

describe('getThumbnailDataUrl', () => {
  it('returns the thumbnail as a JPEG data URL', async () => {
    const source = await writePng('photo.png', 200, 200)
    const { mtimeMs, size } = statSync(source)

    const dataUrl = await getThumbnailDataUrl(source, 100, mtimeMs, size)

    expect(dataUrl?.startsWith('data:image/jpeg;base64,')).toBe(true)
  })

  it('keeps serving the bytes from memory once the file is gone', async () => {
    const source = await writePng('photo.png', 200, 200)
    const { mtimeMs, size } = statSync(source)
    const first = await getThumbnailDataUrl(source, 100, mtimeMs, size)

    rmSync(join(env.userDataDir, 'thumbnails'), { recursive: true })

    expect(await getThumbnailDataUrl(source, 100, mtimeMs, size)).toBe(first)
  })

  it('returns null for a file it cannot decode', async () => {
    const source = join(workDir, 'broken.png')
    writeFileSync(source, 'not an image')

    expect(await getThumbnailDataUrl(source, 100, 0, 12)).toBeNull()
  })
})
