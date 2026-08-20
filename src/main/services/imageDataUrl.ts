import { extname } from 'path'
import { nativeImage } from 'electron'
import sharp from 'sharp'
import { ThumbnailQueue } from '../store/thumbnailCache'

// sharp is unsupported for these formats; fall back to Electron's (synchronous)
// nativeImage decoder only for them so the common case never blocks the main process.
const SHARP_UNSUPPORTED_EXTENSIONS = new Set(['.bmp', '.ico'])

function createImageDataUrlSync(filePath: string, maxSize: number): string | null {
  try {
    const image = nativeImage.createFromPath(filePath)
    if (image.isEmpty()) return null

    const { width, height } = image.getSize()
    if (width === 0 || height === 0) return null

    const scale = maxSize / Math.max(width, height)
    if (scale >= 1) return `data:image/jpeg;base64,${image.toJPEG(85).toString('base64')}`

    const resized = image.resize({
      width: Math.round(width * scale),
      height: Math.round(height * scale),
      quality: 'good'
    })
    return `data:image/jpeg;base64,${resized.toJPEG(85).toString('base64')}`
  } catch {
    return null
  }
}

// nativeImage has no async decode/resize API, so this always runs on the main
// process's JS thread and blocks it for the duration of the call. There's no
// way to make the call itself non-blocking, but serializing calls through a
// single-slot queue (with a setImmediate yield beforehand) prevents several
// of them from piling up back-to-back and keeps other pending IPC replies
// from being starved behind a burst of these.
const syncFallbackQueue = new ThumbnailQueue(1)

function runImageDataUrlSync(filePath: string, maxSize: number): Promise<string | null> {
  return syncFallbackQueue.run(
    () =>
      new Promise((resolve) => {
        setImmediate(() => resolve(createImageDataUrlSync(filePath, maxSize)))
      })
  )
}

export async function createImageDataUrl(filePath: string, maxSize = 4096): Promise<string | null> {
  if (SHARP_UNSUPPORTED_EXTENSIONS.has(extname(filePath).toLowerCase())) {
    return runImageDataUrlSync(filePath, maxSize)
  }

  try {
    const buffer = await sharp(filePath)
      .resize(maxSize, maxSize, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer()
    return `data:image/jpeg;base64,${buffer.toString('base64')}`
  } catch {
    return runImageDataUrlSync(filePath, maxSize)
  }
}
