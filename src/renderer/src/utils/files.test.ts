import { describe, expect, it } from 'vitest'
import {
  formatFileSize,
  isSameOrChildPath,
  isSamePath,
  replacePathPrefix,
  toLocalFileUrl
} from './files'

describe('toLocalFileUrl', () => {
  it('keeps the drive letter and percent-encodes each path segment', () => {
    expect(toLocalFileUrl('C:\\Photos\\a b.jpg')).toBe('local-file:///C:/Photos/a%20b.jpg')
  })

  it('encodes URL-special characters and non-ASCII names', () => {
    expect(toLocalFileUrl('D:\\写真\\#1 100%.png')).toBe(
      'local-file:///D:/%E5%86%99%E7%9C%9F/%231%20100%25.png'
    )
  })

  it('accepts forward slashes and collapses repeated separators', () => {
    expect(toLocalFileUrl('C:/Photos//2024/a.jpg')).toBe('local-file:///C:/Photos/2024/a.jpg')
  })

  it('maps a drive root to a URL ending in a slash', () => {
    expect(toLocalFileUrl('D:\\')).toBe('local-file:///D:/')
  })

  it('encodes paths without a drive letter as rooted URL paths', () => {
    expect(toLocalFileUrl('/home/user/a.jpg')).toBe('local-file:///home/user/a.jpg')
  })

  it('encodes UNC paths with the server name as the first segment', () => {
    expect(toLocalFileUrl('\\\\server\\share\\a.jpg')).toBe('local-file:///server/share/a.jpg')
  })
})

describe('formatFileSize', () => {
  it('uses bytes below 1 KB and one decimal place for KB and MB', () => {
    expect(formatFileSize(0)).toBe('0 B')
    expect(formatFileSize(1023)).toBe('1023 B')
    expect(formatFileSize(1024)).toBe('1.0 KB')
    expect(formatFileSize(1536)).toBe('1.5 KB')
    expect(formatFileSize(1024 * 1024)).toBe('1.0 MB')
    expect(formatFileSize(2.5 * 1024 * 1024)).toBe('2.5 MB')
  })
})

describe('isSameOrChildPath', () => {
  it('matches the same path regardless of case and separator style', () => {
    expect(isSameOrChildPath('C:\\Photos', 'c:/photos')).toBe(true)
  })

  it('matches descendants', () => {
    expect(isSameOrChildPath('C:\\Photos\\2024\\a.jpg', 'C:\\Photos')).toBe(true)
  })

  it('does not match siblings sharing a name prefix, or ancestors', () => {
    expect(isSameOrChildPath('C:\\Photos2\\a.jpg', 'C:\\Photos')).toBe(false)
    expect(isSameOrChildPath('C:\\Photos', 'C:\\Photos\\2024')).toBe(false)
  })
})

describe('replacePathPrefix', () => {
  it('replaces the path itself or the leading part of a descendant', () => {
    expect(replacePathPrefix('C:\\old', 'C:\\old', 'C:\\new')).toBe('C:\\new')
    expect(replacePathPrefix('C:\\old\\sub\\a.jpg', 'C:\\old', 'C:\\new')).toBe(
      'C:\\new\\sub\\a.jpg'
    )
  })
})

describe('isSamePath', () => {
  it('ignores case and separator style', () => {
    expect(isSamePath('C:\\Photos\\A.jpg', 'c:/photos/a.JPG')).toBe(true)
    expect(isSamePath('C:\\Photos', 'C:\\Photos2')).toBe(false)
  })
})
