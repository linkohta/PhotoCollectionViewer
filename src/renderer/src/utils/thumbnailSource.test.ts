import { describe, expect, it, vi } from 'vitest'
import type { ImageFile } from '../../../shared/types'
import { GRID_THUMBNAIL_SIZE, loadFolderPreview, loadGridThumbnail } from './thumbnailSource'
import type { ThumbnailApi } from './thumbnailSource'

const IMAGE: ImageFile = {
  path: 'C:\\Photos\\a.png',
  name: 'a.png',
  size: 1234,
  modified: 1700000000000,
  mediaType: 'image'
}
const THUMBNAIL_PATH = 'C:\\Users\\me\\AppData\\Roaming\\PhotoCollectionViewer\\thumbnails\\x.jpg'
const THUMBNAIL_URL =
  'local-file:///C:/Users/me/AppData/Roaming/PhotoCollectionViewer/thumbnails/x.jpg'

const fakeApi = (overrides: Partial<ThumbnailApi> = {}): ThumbnailApi => ({
  getThumbnailPath: vi.fn(async () => THUMBNAIL_PATH),
  getImageDataUrl: vi.fn(async () => 'data:image/png;base64,image'),
  getThumbnailDataUrl: vi.fn(async () => 'data:image/jpeg;base64,thumbnail'),
  getFolderPreviewImage: vi.fn(async () => IMAGE),
  ...overrides
})

describe('loadGridThumbnail', () => {
  it('shows the saved thumbnail', async () => {
    const api = fakeApi()

    await expect(loadGridThumbnail(api, IMAGE)).resolves.toBe(THUMBNAIL_URL)
    expect(api.getThumbnailPath).toHaveBeenCalledWith(
      IMAGE.path,
      GRID_THUMBNAIL_SIZE,
      IMAGE.modified,
      IMAGE.size
    )
    expect(api.getImageDataUrl).not.toHaveBeenCalled()
  })

  it('falls back to the whole image when no thumbnail could be saved', async () => {
    const api = fakeApi({ getThumbnailPath: vi.fn(async () => null) })

    await expect(loadGridThumbnail(api, IMAGE)).resolves.toBe('data:image/png;base64,image')
    expect(api.getImageDataUrl).toHaveBeenCalledWith(IMAGE.path)
  })

  it('resolves null when the image could not be read either', async () => {
    const api = fakeApi({
      getThumbnailPath: vi.fn(async () => null),
      getImageDataUrl: vi.fn(async () => null)
    })

    await expect(loadGridThumbnail(api, IMAGE)).resolves.toBeNull()
  })
})

describe('loadFolderPreview', () => {
  it("shows the saved thumbnail of the folder's first image", async () => {
    const api = fakeApi()

    await expect(loadFolderPreview(api, 'C:\\Photos')).resolves.toBe(THUMBNAIL_URL)
    expect(api.getFolderPreviewImage).toHaveBeenCalledWith('C:\\Photos')
    expect(api.getThumbnailPath).toHaveBeenCalledWith(
      IMAGE.path,
      GRID_THUMBNAIL_SIZE,
      IMAGE.modified,
      IMAGE.size
    )
  })

  // Unlike the grid, the folder icon falls back to a small thumbnail sent as
  // a data URL, not to the whole image.
  it('falls back to the thumbnail as a data URL when it could not be saved', async () => {
    const api = fakeApi({ getThumbnailPath: vi.fn(async () => null) })

    await expect(loadFolderPreview(api, 'C:\\Photos')).resolves.toBe(
      'data:image/jpeg;base64,thumbnail'
    )
    expect(api.getThumbnailDataUrl).toHaveBeenCalledWith(
      IMAGE.path,
      GRID_THUMBNAIL_SIZE,
      IMAGE.modified,
      IMAGE.size
    )
    expect(api.getImageDataUrl).not.toHaveBeenCalled()
  })

  it('resolves null without asking for a thumbnail when the folder holds no image', async () => {
    const api = fakeApi({ getFolderPreviewImage: vi.fn(async () => null) })

    await expect(loadFolderPreview(api, 'C:\\Photos\\empty')).resolves.toBeNull()
    expect(api.getThumbnailPath).not.toHaveBeenCalled()
  })
})
