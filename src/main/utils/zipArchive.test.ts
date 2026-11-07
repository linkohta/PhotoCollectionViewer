import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import AdmZip from 'adm-zip'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { extractZipArchive, getZipExtractPath } from './zipArchive'

let workDir: string

beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), 'pcv-zip-'))
})

afterEach(() => {
  rmSync(workDir, { recursive: true, force: true })
})

const writeZip = (name: string, entries: Record<string, string>): string => {
  const zip = new AdmZip()
  for (const [entryName, content] of Object.entries(entries)) {
    zip.addFile(entryName, Buffer.from(content))
  }
  const zipPath = join(workDir, name)
  zip.writeZip(zipPath)
  return zipPath
}

// adm-zip strips "../" from names passed to addFile, so a zip holding a
// parent-directory entry is made by renaming a same-length entry in the raw
// bytes (the name appears in both the local header and the central directory).
const writeZipWithRawEntryName = (name: string, placeholder: string, rawName: string): string => {
  const zip = new AdmZip()
  zip.addFile(placeholder, Buffer.from('payload'))
  const bytes = zip.toBuffer()
  const from = Buffer.from(placeholder)
  const to = Buffer.from(rawName)
  for (let index = bytes.indexOf(from); index !== -1; index = bytes.indexOf(from, index)) {
    to.copy(bytes, index)
    index += to.length
  }
  const zipPath = join(workDir, name)
  writeFileSync(zipPath, bytes)
  return zipPath
}

const extractIgnoringErrors = (zipPath: string): void => {
  try {
    extractZipArchive(zipPath)
  } catch {
    // The error itself is covered by its own test.
  }
}

describe('getZipExtractPath', () => {
  it('is a folder next to the zip, named after it', () => {
    expect(getZipExtractPath(join(workDir, 'album.zip'))).toBe(join(workDir, 'album'))
    expect(getZipExtractPath(join(workDir, 'Album.ZIP'))).toBe(join(workDir, 'Album'))
  })
})

describe('extractZipArchive', () => {
  it('extracts into the folder next to the zip and returns its path', () => {
    const zipPath = writeZip('album.zip', { '1.jpg': 'one', 'sub/2.jpg': 'two' })

    const extractPath = extractZipArchive(zipPath)

    expect(extractPath).toBe(join(workDir, 'album'))
    expect(readFileSync(join(extractPath, '1.jpg'), 'utf-8')).toBe('one')
    expect(readFileSync(join(extractPath, 'sub', '2.jpg'), 'utf-8')).toBe('two')
  })

  it("drops a single top-level folder that has the zip's own name", () => {
    const extractPath = extractZipArchive(
      writeZip('album.zip', { 'album/1.jpg': 'one', 'album/sub/2.jpg': 'two' })
    )

    expect(existsSync(join(extractPath, '1.jpg'))).toBe(true)
    expect(existsSync(join(extractPath, 'sub', '2.jpg'))).toBe(true)
    expect(existsSync(join(extractPath, 'album'))).toBe(false)
  })

  it('matches that top-level folder name case-insensitively', () => {
    const extractPath = extractZipArchive(writeZip('album.zip', { 'Album/1.jpg': 'one' }))

    expect(existsSync(join(extractPath, '1.jpg'))).toBe(true)
  })

  it('keeps the layout when the entries do not all share that folder', () => {
    const extractPath = extractZipArchive(
      writeZip('album.zip', { 'album/1.jpg': 'one', 'other/2.jpg': 'two' })
    )

    expect(existsSync(join(extractPath, 'album', '1.jpg'))).toBe(true)
    expect(existsSync(join(extractPath, 'other', '2.jpg'))).toBe(true)
  })

  it('returns an existing folder without extracting again', () => {
    const zipPath = writeZip('album.zip', { '1.jpg': 'one' })
    mkdirSync(join(workDir, 'album'))

    expect(extractZipArchive(zipPath)).toBe(join(workDir, 'album'))
    expect(existsSync(join(workDir, 'album', '1.jpg'))).toBe(false)
  })

  it('refuses entries that would be written outside the folder', () => {
    const zipPath = writeZipWithRawEntryName('evil.zip', 'aa/evil.txt', '../evil.txt')

    expect(() => extractZipArchive(zipPath)).toThrow('Unsafe ZIP entry path')
    expect(existsSync(join(workDir, 'evil.txt'))).toBe(false)
  })

  it('throws for a file that is not a zip', () => {
    const zipPath = join(workDir, 'broken.zip')
    writeFileSync(zipPath, 'not a zip')

    expect(() => extractZipArchive(zipPath)).toThrow()
  })

  // F6: the folder is created before the zip is read, so a failed extraction
  // leaves it behind and the zip is then treated as already extracted.
  it.fails('leaves no folder behind when the zip cannot be read', () => {
    const zipPath = join(workDir, 'broken.zip')
    writeFileSync(zipPath, 'not a zip')

    extractIgnoringErrors(zipPath)

    expect(existsSync(getZipExtractPath(zipPath))).toBe(false)
  })

  it.fails('leaves no folder behind when an unsafe entry stops the extraction', () => {
    const zipPath = writeZipWithRawEntryName('evil.zip', 'aa/evil.txt', '../evil.txt')

    extractIgnoringErrors(zipPath)

    expect(existsSync(getZipExtractPath(zipPath))).toBe(false)
  })
})
