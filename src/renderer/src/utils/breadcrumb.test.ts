import { describe, expect, it } from 'vitest'
import type { FolderCollection } from '../../../preload/index'
import { buildBreadcrumb, buildCountLabel } from './breadcrumb'

const collectionAt = (path: string, name: string): FolderCollection => ({
  path,
  name,
  parentPath: null,
  subfolders: [],
  zipFiles: [],
  images: []
})

describe('buildBreadcrumb', () => {
  it('shows only the current folder when there is no root folder', () => {
    expect(buildBreadcrumb(collectionAt('C:\\Photos\\2024', '2024'), null)).toEqual([
      { label: '2024', path: 'C:\\Photos\\2024' }
    ])
  })

  it('shows only the root when the root itself is open', () => {
    expect(buildBreadcrumb(collectionAt('C:\\Photos', 'Photos'), 'C:\\Photos')).toEqual([
      { label: 'Photos', path: 'C:\\Photos' }
    ])
  })

  it('lists each folder from the root down to the current one', () => {
    expect(buildBreadcrumb(collectionAt('C:\\Photos\\2024\\旅行', '旅行'), 'C:\\Photos')).toEqual([
      { label: 'Photos', path: 'C:\\Photos' },
      { label: '2024', path: 'C:\\Photos\\2024' },
      { label: '旅行', path: 'C:\\Photos\\2024\\旅行' }
    ])
  })

  it('matches the root case-insensitively and builds paths from the root as given', () => {
    expect(buildBreadcrumb(collectionAt('C:\\Photos\\2024', '2024'), 'c:\\photos')).toEqual([
      { label: 'photos', path: 'c:\\photos' },
      { label: '2024', path: 'c:\\photos\\2024' }
    ])
  })

  it('keeps forward slashes when the root uses them', () => {
    expect(buildBreadcrumb(collectionAt('C:/Photos/a', 'a'), 'C:/Photos')).toEqual([
      { label: 'Photos', path: 'C:/Photos' },
      { label: 'a', path: 'C:/Photos/a' }
    ])
  })

  it('shows only the root when the current folder is outside it', () => {
    expect(buildBreadcrumb(collectionAt('D:\\Other', 'Other'), 'C:\\Photos')).toEqual([
      { label: 'Photos', path: 'C:\\Photos' }
    ])
  })

  it('builds child paths under a drive root', () => {
    expect(buildBreadcrumb(collectionAt('D:\\Photos', 'Photos'), 'D:\\')[1]).toEqual({
      label: 'Photos',
      path: 'D:\\Photos'
    })
  })

  // F10: the root crumb of a drive root is currently labelled ''.
  it.fails('labels a drive root with its drive name', () => {
    expect(buildBreadcrumb(collectionAt('D:\\Photos', 'Photos'), 'D:\\')[0]?.label).toBe('D:')
  })
})

describe('buildCountLabel', () => {
  it('joins the folder, ZIP and image counts, leaving out zero folders and ZIPs', () => {
    const collection: FolderCollection = {
      ...collectionAt('C:\\Photos', 'Photos'),
      subfolders: [
        { path: 'C:\\Photos\\a', name: 'a' },
        { path: 'C:\\Photos\\b', name: 'b' }
      ],
      zipFiles: [
        {
          path: 'C:\\Photos\\c.zip',
          name: 'c.zip',
          size: 1,
          modified: 0,
          extractPath: 'C:\\Photos\\c',
          isExtracted: false
        }
      ],
      images: [
        { path: 'C:\\Photos\\1.jpg', name: '1.jpg', size: 1, modified: 0, mediaType: 'image' },
        { path: 'C:\\Photos\\2.mp4', name: '2.mp4', size: 1, modified: 0, mediaType: 'video' }
      ]
    }

    expect(buildCountLabel(collection)).toBe('2 フォルダ · 1 ZIP · 2 枚')
    expect(buildCountLabel(collectionAt('C:\\Empty', 'Empty'))).toBe('0 枚')
  })
})
