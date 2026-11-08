import { describe, expect, it } from 'vitest'
import { resolveByteRange } from './rangeRequest'

const FILE_SIZE = 1000

describe('resolveByteRange', () => {
  it.each([
    ['bytes=0-', { start: 0, end: 999 }],
    ['bytes=500-', { start: 500, end: 999 }],
    ['bytes=100-199', { start: 100, end: 199 }],
    ['bytes=0-999', { start: 0, end: 999 }],
    // Only the first of several ranges is served.
    ['bytes=0-9,20-29', { start: 0, end: 9 }]
  ])('reads %s', (rangeHeader, expected) => {
    expect(resolveByteRange(rangeHeader, FILE_SIZE)).toEqual(expected)
  })

  // "bytes=-200" asks for the last 200 bytes, but is read as bytes 0-200.
  it.fails('reads a suffix range as the end of the file', () => {
    expect(resolveByteRange('bytes=-200', FILE_SIZE)).toEqual({ start: 800, end: 999 })
  })

  // A range running past the end of the file is passed through as it is, so
  // Content-Range and Content-Length promise more bytes than the file has.
  it.fails('stops a range at the end of the file', () => {
    expect(resolveByteRange('bytes=900-5000', FILE_SIZE)).toEqual({ start: 900, end: 999 })
  })

  // A range that starts at or past the end can't be served (416), but comes
  // back as a range that ends before it starts.
  it.fails('rejects a range that starts past the end of the file', () => {
    expect(resolveByteRange(`bytes=${FILE_SIZE}-`, FILE_SIZE)).toBeNull()
  })
})
