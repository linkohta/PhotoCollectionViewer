// A span of bytes, both ends included (as in a Content-Range header).
export interface ByteRange {
  start: number
  end: number
}

// The bytes of a fileSize-byte file that a Range request header asks for.
// Only the first range of the header is served.
export function resolveByteRange(rangeHeader: string, fileSize: number): ByteRange {
  const match = /bytes=(\d*)-(\d*)/.exec(rangeHeader)
  const start = match?.[1] ? Number(match[1]) : 0
  const end = match?.[2] ? Number(match[2]) : fileSize - 1
  return { start, end }
}
