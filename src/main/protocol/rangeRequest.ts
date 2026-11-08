// A span of bytes, both ends included (as in a Content-Range header).
export interface ByteRange {
  start: number
  end: number
}

// The bytes of a fileSize-byte file that a Range request header asks for, or
// null when none of them exist (answered with 416). Only the first range of
// the header is served.
export function resolveByteRange(rangeHeader: string, fileSize: number): ByteRange | null {
  const match = /bytes=(\d*)-(\d*)/.exec(rangeHeader)
  const first = match?.[1] ?? ''
  const last = match?.[2] ?? ''

  // "bytes=-N" asks for the last N bytes.
  if (first === '' && last !== '') {
    const length = Number(last)
    if (length === 0 || fileSize === 0) return null
    return { start: Math.max(0, fileSize - length), end: fileSize - 1 }
  }

  const start = first ? Number(first) : 0
  // A range may run past the end of the file; it then stops at the last byte.
  const end = last ? Math.min(Number(last), fileSize - 1) : fileSize - 1
  if (start >= fileSize || end < start) return null
  return { start, end }
}
