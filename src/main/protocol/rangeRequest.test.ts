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

  it('reads a suffix range as the end of the file', () => {
    expect(resolveByteRange('bytes=-200', FILE_SIZE)).toEqual({ start: 800, end: 999 })
  })

  it('serves the whole file for a suffix longer than the file', () => {
    expect(resolveByteRange('bytes=-5000', FILE_SIZE)).toEqual({ start: 0, end: 999 })
  })

  it('stops a range at the end of the file', () => {
    expect(resolveByteRange('bytes=900-5000', FILE_SIZE)).toEqual({ start: 900, end: 999 })
  })

  it.each([
    [`bytes=${FILE_SIZE}-`, FILE_SIZE],
    ['bytes=5000-6000', FILE_SIZE],
    ['bytes=-0', FILE_SIZE],
    ['bytes=500-100', FILE_SIZE],
    ['bytes=0-', 0],
    ['bytes=-10', 0]
  ])('rejects %s of a %i-byte file, as it holds none of those bytes', (rangeHeader, fileSize) => {
    expect(resolveByteRange(rangeHeader, fileSize)).toBeNull()
  })
})
