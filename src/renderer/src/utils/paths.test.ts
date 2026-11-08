import { describe, expect, it } from 'vitest'
import { isSameOrChildPath, isSamePath, pathBaseName, replacePathPrefix } from './paths'

describe('pathBaseName', () => {
  it.each([
    ['C:\\Photos\\2024', '2024'],
    ['C:\\Photos\\a b.jpg', 'a b.jpg'],
    ['C:/Photos/2024/', '2024'],
    ['C:\\Photos\\', 'Photos'],
    ['D:\\', 'D:'],
    ['D:', 'D:'],
    ['\\\\server\\share', 'share'],
    ['', '']
  ])('gives %j for %j', (path, expected) => {
    expect(pathBaseName(path)).toBe(expected)
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

  it('ignores a trailing separator, so a drive root contains its folders', () => {
    expect(isSameOrChildPath('D:\\Photos', 'D:\\')).toBe(true)
    expect(isSameOrChildPath('C:\\Photos\\2024', 'C:\\Photos\\')).toBe(true)
    expect(isSameOrChildPath('D:\\', 'd:')).toBe(true)
    expect(isSameOrChildPath('E:\\Photos', 'D:\\')).toBe(false)
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

  it('ignores a trailing separator', () => {
    expect(isSamePath('C:\\Photos\\', 'C:\\Photos')).toBe(true)
  })
})
