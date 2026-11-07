import { mkdirSync, mkdtempSync, rmSync, statSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { dirname, join } from 'path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { findFolderPreviewImage, scanFolder, searchSubfolders } from './folderScan'

let root: string

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'pcv-scan-'))
})

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

const writeFile = (relativePath: string, content = 'x'): void => {
  const fullPath = join(root, relativePath)
  mkdirSync(dirname(fullPath), { recursive: true })
  writeFileSync(fullPath, content)
}

const makeDir = (relativePath: string): void => {
  mkdirSync(join(root, relativePath), { recursive: true })
}

describe('scanFolder', () => {
  it('lists images and videos in natural name order and ignores other files', async () => {
    for (const name of ['b.jpg', 'a10.png', 'a2.png', 'A1.JPG', 'movie.mp4', 'clip.flv']) {
      writeFile(name)
    }
    writeFile('notes.txt')

    const collection = await scanFolder(root, root)

    expect(collection.images.map((image) => [image.name, image.mediaType])).toEqual([
      ['A1.JPG', 'image'],
      ['a2.png', 'image'],
      ['a10.png', 'image'],
      ['b.jpg', 'image'],
      ['clip.flv', 'video'],
      ['movie.mp4', 'video']
    ])
  })

  it('describes each file by path, name, size and modification time', async () => {
    writeFile('photo.jpg', 'hello')
    const filePath = join(root, 'photo.jpg')

    const [image] = (await scanFolder(root, root)).images

    expect(image).toEqual({
      path: filePath,
      name: 'photo.jpg',
      size: 5,
      modified: statSync(filePath).mtimeMs,
      mediaType: 'image'
    })
  })

  it('lists subfolders in natural order, hiding only folders whose name starts with a dot', async () => {
    for (const name of ['sub10', 'sub2', 'Sub1', '.git']) {
      makeDir(name)
    }
    writeFile('.thumb.jpg')

    const collection = await scanFolder(root, root)

    expect(collection.subfolders).toEqual([
      { path: join(root, 'Sub1'), name: 'Sub1' },
      { path: join(root, 'sub2'), name: 'sub2' },
      { path: join(root, 'sub10'), name: 'sub10' }
    ])
    expect(collection.images.map((image) => image.name)).toEqual(['.thumb.jpg'])
  })

  it('lists zip files with their extract folder and whether it already exists', async () => {
    writeFile('b.zip')
    writeFile('a.zip')
    makeDir('a')

    const { zipFiles } = await scanFolder(root, root)

    expect(
      zipFiles.map(({ name, extractPath, isExtracted }) => ({ name, extractPath, isExtracted }))
    ).toEqual([
      { name: 'a.zip', extractPath: join(root, 'a'), isExtracted: true },
      { name: 'b.zip', extractPath: join(root, 'b'), isExtracted: false }
    ])
  })

  it('describes the folder itself and links to its parent below the root', async () => {
    makeDir('sub')

    expect(await scanFolder(join(root, 'sub'), root)).toMatchObject({
      path: join(root, 'sub'),
      name: 'sub',
      parentPath: root
    })
  })

  it('has no parent at the root (compared case-insensitively) or without a root', async () => {
    makeDir('sub')

    expect((await scanFolder(root, root)).parentPath).toBeNull()
    expect((await scanFolder(root, root.toUpperCase())).parentPath).toBeNull()
    expect((await scanFolder(join(root, 'sub'))).parentPath).toBeNull()
  })

  it('rejects when the folder cannot be read', async () => {
    await expect(scanFolder(join(root, 'missing'), root)).rejects.toThrow()
  })
})

describe('searchSubfolders', () => {
  it('finds nested folders whose name contains the query, ignoring case and dot folders', async () => {
    for (const path of [
      'Trip 2024/day1',
      'trip 2023',
      'photos/old trips/x',
      '.cache/trip-hidden',
      'Trip 2024/.private/trip'
    ]) {
      makeDir(path)
    }

    expect(await searchSubfolders(root, ' TRIP ')).toEqual([
      {
        path: join(root, 'photos', 'old trips'),
        name: 'old trips',
        relativePath: 'photos/old trips'
      },
      { path: join(root, 'trip 2023'), name: 'trip 2023', relativePath: 'trip 2023' },
      { path: join(root, 'Trip 2024'), name: 'Trip 2024', relativePath: 'Trip 2024' }
    ])
  })

  it('returns nothing for a blank query', async () => {
    makeDir('trip')

    expect(await searchSubfolders(root, '   ')).toEqual([])
  })
})

describe('findFolderPreviewImage', () => {
  it('returns the first image in natural order, skipping videos', async () => {
    for (const name of ['b10.jpg', 'b2.jpg', 'a.mp4']) {
      writeFile(name)
    }

    expect(await findFolderPreviewImage(root)).toMatchObject({
      path: join(root, 'b2.jpg'),
      name: 'b2.jpg',
      mediaType: 'image'
    })
  })

  it('looks into subfolders, in natural order, up to two levels below', async () => {
    writeFile('b/1.jpg')
    writeFile('a/x/deep.jpg')

    expect((await findFolderPreviewImage(root))?.path).toBe(join(root, 'a', 'x', 'deep.jpg'))
  })

  it('gives up below two levels', async () => {
    writeFile('a/b/c/deeper.jpg')

    expect(await findFolderPreviewImage(root)).toBeNull()
  })

  it('returns null for a folder that cannot be read', async () => {
    expect(await findFolderPreviewImage(join(root, 'missing'))).toBeNull()
  })
})
