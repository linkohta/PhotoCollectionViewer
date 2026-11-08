// The size of the preview thumbnail the viewer shows before the full image.
export const PREVIEW_THUMB_SIZE = 960

// Full-resolution images are decoded in full, so keep this window small to
// keep memory/CPU use reasonable - but wide enough to absorb a few quick
// consecutive "next" clicks without falling back to on-demand decoding.
const FULL_PRELOAD_RANGE = 3
// Preview thumbnails are cheap (generated/cached by the main process), so we
// can afford to warm a much wider window - this is what keeps navigation
// snappy after the app has been idle in the background for a while and the
// OS file cache for the photos has been evicted.
const THUMBNAIL_PRELOAD_RANGE = 20
// Within this distance, previews are fetched as data URLs (getThumbnailDataUrl)
// instead of file paths. The main process keeps their raw bytes in memory
// (see bufferCache in main/services/thumbnails.ts), so redisplaying one needs
// no disk access at all even if the OS has evicted the file from its cache in
// the meantime - unlike a `local-file://` path, which always re-reads from disk.
const HOT_PREVIEW_RANGE = 5

// Which images around the current one the viewer prepares, as offsets from it
// (wrapping around the ends of the folder).
export interface NeighborWindow {
  // Full-resolution images to preload.
  fullOffsets: number[]
  // Preview thumbnails to fetch beyond those, nearest first. Hot ones are
  // fetched as data URLs, the others as file paths.
  previews: { offset: number; hot: boolean }[]
  // What the main process re-warms when the window regains focus, the current
  // image first and then by distance.
  warmupOffsets: number[]
}

// For a folder of total images (at least one).
export function getNeighborWindow(total: number): NeighborWindow {
  // How far the window reaches on each side before the two sides meet.
  const maxRange = Math.floor((total - 1) / 2)

  const fullOffsets =
    total > 1
      ? [1, 2, 3, -1, -2, -3].filter((offset) => Math.abs(offset) <= FULL_PRELOAD_RANGE)
      : []

  const range = Math.min(THUMBNAIL_PRELOAD_RANGE, maxRange)
  const hotRange = Math.min(HOT_PREVIEW_RANGE, range)
  const previews: NeighborWindow['previews'] = []
  for (let distance = FULL_PRELOAD_RANGE + 1; distance <= range; distance++) {
    const hot = distance <= hotRange
    previews.push({ offset: distance, hot }, { offset: -distance, hot })
  }

  const warmupRange = Math.min(THUMBNAIL_PRELOAD_RANGE, maxRange)
  const warmupOffsets = [0]
  for (let distance = 1; distance <= warmupRange; distance++) {
    warmupOffsets.push(distance, -distance)
  }

  return { fullOffsets, previews, warmupOffsets }
}
