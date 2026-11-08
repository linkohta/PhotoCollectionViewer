import { describe, expect, it } from 'vitest'
import { isAnimatedImagePath, MEDIA_FORMATS } from './media'

const extensionsWhere = (matches: (kind: string, mimeType?: string) => boolean): string[] =>
  [...MEDIA_FORMATS]
    .filter(([, format]) => matches(format.kind, format.mimeType))
    .map(([extension]) => extension)
    .sort()

// These pin the lists each part of the app used to keep on its own, so moving
// them into one table changed nothing.
describe('MEDIA_FORMATS', () => {
  it('lists the image extensions folder scanning used to accept', () => {
    expect(extensionsWhere((kind) => kind === 'image')).toEqual(
      [
        '.jpg',
        '.jpeg',
        '.png',
        '.gif',
        '.webp',
        '.bmp',
        '.tif',
        '.tiff',
        '.svg',
        '.ico',
        '.avif'
      ].sort()
    )
  })

  it('lists the video extensions folder scanning used to accept', () => {
    expect(extensionsWhere((kind) => kind === 'video')).toEqual(['.flv', '.mp4'])
  })

  it('has the Content-Types the local-file protocol used to serve', () => {
    const mimeTypes = Object.fromEntries(
      [...MEDIA_FORMATS].filter(([, f]) => f.mimeType).map(([ext, f]) => [ext, f.mimeType])
    )
    expect(mimeTypes).toEqual({
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.bmp': 'image/bmp',
      '.avif': 'image/avif',
      '.svg': 'image/svg+xml',
      '.mp4': 'video/mp4',
      '.flv': 'video/x-flv'
    })
  })

  it('leaves to nativeImage the formats sharp could not decode', () => {
    const native = [...MEDIA_FORMATS].filter(([, f]) => f.decodedByNativeImage).map(([e]) => e)
    expect(native.sort()).toEqual(['.bmp', '.ico'])
  })
})

describe('isAnimatedImagePath', () => {
  it('recognises GIF files in any letter case', () => {
    expect(isAnimatedImagePath('C:\\Photos\\a.gif')).toBe(true)
    expect(isAnimatedImagePath('C:\\Photos\\A.GIF')).toBe(true)
  })

  it('does not match other files', () => {
    expect(isAnimatedImagePath('C:\\Photos\\a.png')).toBe(false)
    expect(isAnimatedImagePath('C:\\Photos\\a.gifv')).toBe(false)
    expect(isAnimatedImagePath('C:\\gif\\a.jpg')).toBe(false)
  })
})
