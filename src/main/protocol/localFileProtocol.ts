import { protocol } from 'electron'
import { createReadStream } from 'fs'
import { readFile, stat } from 'fs/promises'
import { extname } from 'path'
import { Readable } from 'stream'
import { LOCAL_FILE_SCHEME, localFileUrlToPath } from '../../shared/localFileUrl'
import { MEDIA_FORMATS } from '../../shared/media'
import { resolveByteRange } from './rangeRequest'

// Electron only accepts scheme privileges before the app is ready, so this
// runs from bootstrap.ts.
export function registerLocalFileScheme(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: LOCAL_FILE_SCHEME,
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        bypassCSP: true,
        stream: true
      }
    }
  ])
}

const mimeTypeOf = (filePath: string): string =>
  MEDIA_FORMATS.get(extname(filePath).toLowerCase())?.mimeType ?? 'application/octet-stream'

// <video> needs Range support to seek without re-downloading the whole
// file - Chromium requests a byte range once the user drags the scrubber,
// and won't seek at all if the response doesn't honor it.
const respondWithRange = async (
  filePath: string,
  mimeType: string,
  rangeHeader: string
): Promise<Response> => {
  const fileStat = await stat(filePath)
  const range = resolveByteRange(rangeHeader, fileStat.size)
  if (!range) {
    return new Response(null, {
      status: 416,
      headers: { 'Content-Range': `bytes */${fileStat.size}` }
    })
  }

  const { start, end } = range
  return new Response(
    Readable.toWeb(createReadStream(filePath, { start, end })) as ReadableStream,
    {
      status: 206,
      headers: {
        'Content-Type': mimeType,
        'Content-Range': `bytes ${start}-${end}/${fileStat.size}`,
        'Content-Length': String(end - start + 1),
        'Accept-Ranges': 'bytes'
      }
    }
  )
}

export async function respondWithLocalFile(request: Request): Promise<Response> {
  try {
    const filePath = localFileUrlToPath(request.url)
    const mimeType = mimeTypeOf(filePath)

    const rangeHeader = request.headers.get('range')
    if (rangeHeader) {
      return await respondWithRange(filePath, mimeType, rangeHeader)
    }

    const data = await readFile(filePath)
    return new Response(data, { headers: { 'Content-Type': mimeType, 'Accept-Ranges': 'bytes' } })
  } catch {
    return new Response(null, { status: 404 })
  }
}

// Reads the file directly with Node's fs rather than delegating to
// net.fetch('file://...'), which intermittently fails with
// net::ERR_UNEXPECTED for larger files (observed with animated GIFs).
export function serveLocalFiles(): void {
  protocol.handle(LOCAL_FILE_SCHEME, respondWithLocalFile)
}
