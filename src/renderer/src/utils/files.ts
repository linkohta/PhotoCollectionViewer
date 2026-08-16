export function toLocalFileUrl(filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/')

  if (/^[a-zA-Z]:\//.test(normalized)) {
    const drive = normalized.slice(0, 2)
    const encodedRest = normalized
      .slice(3)
      .split('/')
      .filter(Boolean)
      .map(encodeURIComponent)
      .join('/')
    return encodedRest ? `local-file:///${drive}/${encodedRest}` : `local-file:///${drive}/`
  }

  const encoded = normalized
    .split('/')
    .filter(Boolean)
    .map(encodeURIComponent)
    .join('/')
  return `local-file:///${encoded}`
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function isSameOrChildPath(path: string, target: string): boolean {
  const normalize = (value: string): string => value.replace(/\\/g, '/').toLowerCase()
  const normPath = normalize(path)
  const normTarget = normalize(target)
  return normPath === normTarget || normPath.startsWith(`${normTarget}/`)
}

export function replacePathPrefix(path: string, oldPrefix: string, newPrefix: string): string {
  if (path === oldPrefix) return newPrefix
  return newPrefix + path.slice(oldPrefix.length)
}
