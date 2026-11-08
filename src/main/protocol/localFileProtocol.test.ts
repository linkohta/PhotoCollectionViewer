import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { respondWithLocalFile } from './localFileProtocol'

vi.mock('electron', () => ({
  protocol: { handle: vi.fn(), registerSchemesAsPrivileged: vi.fn() }
}))

const CONTENT = Buffer.from('0123456789')

let workDir: string

beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), 'pcv-local-file-'))
})

afterEach(() => {
  rmSync(workDir, { recursive: true, force: true })
})

// The request.url Chromium hands over for toLocalFileUrl(filePath) on
// Windows: the drive letter, or the server of a network share, arrives as a
// lowercase host (see shared/localFileUrl.test.ts).
const requestUrlFor = (filePath: string): string => {
  const [first, ...segments] = filePath.split(/[\\/]/).filter(Boolean)
  const host = first!.replace(/:$/, '').toLowerCase()
  return `local-file://${host}/${segments.map(encodeURIComponent).join('/')}`
}

// The same file reached as if over the network, through the drive's
// administrative share: C:\Temp\a.png becomes \\localhost\C$\Temp\a.png.
const onAdminShare = (filePath: string): string =>
  `\\\\localhost\\${filePath[0]}$${filePath.slice(2)}`

// Administrative shares can be turned off, so the test needs one to exist.
const hasAdminShare = existsSync(onAdminShare(tmpdir()))

const requestFile = (filePath: string, headers: Record<string, string> = {}): Promise<Response> =>
  respondWithLocalFile(new Request(requestUrlFor(filePath), { headers }))

const writeFile = (...segments: string[]): string => {
  const filePath = join(workDir, ...segments)
  mkdirSync(join(filePath, '..'), { recursive: true })
  writeFileSync(filePath, CONTENT)
  return filePath
}

const bodyOf = async (response: Response): Promise<string> =>
  Buffer.from(await response.arrayBuffer()).toString()

describe('respondWithLocalFile', () => {
  it('serves the whole file with the MIME type of its extension', async () => {
    const response = await requestFile(writeFile('photo.png'))

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('image/png')
    expect(response.headers.get('accept-ranges')).toBe('bytes')
    expect(await bodyOf(response)).toBe(CONTENT.toString())
  })

  it('finds files whose path has to be escaped in the URL', async () => {
    const response = await requestFile(writeFile('a b #1 100%', '写真 ①.jpg'))

    expect(response.status).toBe(200)
    expect(await bodyOf(response)).toBe(CONTENT.toString())
  })

  it.skipIf(!hasAdminShare)('finds files on a network share', async () => {
    const response = await requestFile(onAdminShare(writeFile('a b', '写真.jpg')))

    expect(response.status).toBe(200)
    expect(await bodyOf(response)).toBe(CONTENT.toString())
  })

  it('serves files of other types as application/octet-stream', async () => {
    const response = await requestFile(writeFile('notes.txt'))

    expect(response.headers.get('content-type')).toBe('application/octet-stream')
  })

  it('serves the requested bytes of a Range request', async () => {
    const response = await requestFile(writeFile('clip.mp4'), { Range: 'bytes=2-5' })

    expect(response.status).toBe(206)
    expect(response.headers.get('content-type')).toBe('video/mp4')
    expect(response.headers.get('content-range')).toBe('bytes 2-5/10')
    expect(response.headers.get('content-length')).toBe('4')
    expect(await bodyOf(response)).toBe('2345')
  })

  it('answers 404 for a missing file', async () => {
    const response = await requestFile(join(workDir, 'missing.png'))

    expect(response.status).toBe(404)
  })

  it('answers 404 for a Range request on a missing file', async () => {
    const response = await requestFile(join(workDir, 'missing.mp4'), { Range: 'bytes=0-' })

    expect(response.status).toBe(404)
  })
})
