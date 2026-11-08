// Path helpers for the Windows paths the main process hands over. Both
// separators are accepted, and letter case is ignored when comparing, as on
// NTFS.

// The last part of the path: the file or folder name, or "D:" for the root of
// a drive. Empty when the path has no parts at all.
export function pathBaseName(path: string): string {
  const parts = path.split(/[/\\]/).filter(Boolean)
  return parts[parts.length - 1] ?? ''
}

// A form of the path for comparisons: forward slashes, lower case, and no
// trailing separator, so "D:\" and "D:" or "C:\Photos\" and "c:/photos" match.
export function comparablePath(path: string): string {
  const normalized = path.replace(/\\/g, '/').toLowerCase()
  const trimmed = normalized.replace(/\/+$/, '')
  return trimmed || normalized
}

export function isSamePath(a: string, b: string): boolean {
  return comparablePath(a) === comparablePath(b)
}

// Whether path is target itself or lies somewhere below it. Only whole names
// count: C:\Photos2 is not below C:\Photos.
export function isSameOrChildPath(path: string, target: string): boolean {
  const normPath = comparablePath(path)
  const normTarget = comparablePath(target)
  return normPath === normTarget || normPath.startsWith(`${normTarget}/`)
}

export function replacePathPrefix(path: string, oldPrefix: string, newPrefix: string): string {
  if (path === oldPrefix) return newPrefix
  return newPrefix + path.slice(oldPrefix.length)
}
