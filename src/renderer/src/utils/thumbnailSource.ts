import type { ImageFile } from '../../../shared/types'
import { toLocalFileUrl } from '../../../shared/localFileUrl'

// The preload API calls used to find a thumbnail. Taken as an argument so the
// tests can pass a fake.
export type ThumbnailApi = Pick<
  Window['photoCollection'],
  'getThumbnailPath' | 'getImageDataUrl' | 'getThumbnailDataUrl' | 'getFolderPreviewImage'
>

// Longest side, in pixels, of the thumbnails in the grid and the folder icons.
export const GRID_THUMBNAIL_SIZE = 200

// The URL to show in an image's grid card: the thumbnail the main process
// generated and saved, or else the whole image as a data URL. Null when
// neither could be made.
export async function loadGridThumbnail(
  api: ThumbnailApi,
  image: ImageFile
): Promise<string | null> {
  const thumbnailPath = await api.getThumbnailPath(
    image.path,
    GRID_THUMBNAIL_SIZE,
    image.modified,
    image.size
  )
  if (thumbnailPath) return toLocalFileUrl(thumbnailPath)

  return (await api.getImageDataUrl(image.path)) || null
}

// The URL to show inside a subfolder's folder icon: the thumbnail of the
// folder's first image (like Explorer's folder previews), saved or else as a
// data URL. Null when the folder holds no image.
export async function loadFolderPreview(
  api: ThumbnailApi,
  folderPath: string
): Promise<string | null> {
  const image = await api.getFolderPreviewImage(folderPath)
  if (!image) return null

  const thumbnailPath = await api.getThumbnailPath(
    image.path,
    GRID_THUMBNAIL_SIZE,
    image.modified,
    image.size
  )
  if (thumbnailPath) return toLocalFileUrl(thumbnailPath)

  return api.getThumbnailDataUrl(image.path, GRID_THUMBNAIL_SIZE, image.modified, image.size)
}
