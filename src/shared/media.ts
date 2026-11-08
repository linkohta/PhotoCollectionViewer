export interface MediaFormat {
  kind: 'image' | 'video'
  // Content-Type the local-file:// protocol serves it with. Left out, the file
  // goes out as application/octet-stream and Chromium sniffs the image type.
  mimeType?: string
  // sharp cannot decode it, so data URLs come from Electron's nativeImage.
  decodedByNativeImage?: boolean
  // Shown straight from the file so the animation plays, without a preview.
  animated?: boolean
}

// Every file type the app lists as an image or a video, keyed by lower-case
// extension. Folder scanning, the local-file protocol, the image decoder and
// the viewer all read this table instead of keeping lists of their own.
export const MEDIA_FORMATS: ReadonlyMap<string, MediaFormat> = new Map([
  ['.jpg', { kind: 'image', mimeType: 'image/jpeg' }],
  ['.jpeg', { kind: 'image', mimeType: 'image/jpeg' }],
  ['.png', { kind: 'image', mimeType: 'image/png' }],
  ['.gif', { kind: 'image', mimeType: 'image/gif', animated: true }],
  ['.webp', { kind: 'image', mimeType: 'image/webp' }],
  ['.bmp', { kind: 'image', mimeType: 'image/bmp', decodedByNativeImage: true }],
  ['.tif', { kind: 'image' }],
  ['.tiff', { kind: 'image' }],
  ['.svg', { kind: 'image', mimeType: 'image/svg+xml' }],
  ['.ico', { kind: 'image', decodedByNativeImage: true }],
  ['.avif', { kind: 'image', mimeType: 'image/avif' }],
  ['.mp4', { kind: 'video', mimeType: 'video/mp4' }],
  ['.flv', { kind: 'video', mimeType: 'video/x-flv' }]
] satisfies [string, MediaFormat][])

// For callers without Node's path.extname (the renderer): whether the path
// ends in an extension of an animated format, ignoring case.
export function isAnimatedImagePath(filePath: string): boolean {
  const lowerPath = filePath.toLowerCase()
  for (const [extension, format] of MEDIA_FORMATS) {
    if (format.animated && lowerPath.endsWith(extension)) return true
  }
  return false
}
