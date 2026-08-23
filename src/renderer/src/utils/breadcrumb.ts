import type { FolderCollection } from '../../../preload/index'

const joinPath = (base: string, segment: string): string => {
  const sep = base.includes('\\') ? '\\' : '/'
  const trimmed = base.replace(/[/\\]+$/, '')
  return `${trimmed}${sep}${segment}`
}

export function buildBreadcrumb(
  collection: FolderCollection,
  rootFolderPath: string | null
): { label: string; path: string }[] {
  if (!rootFolderPath) return [{ label: collection.name, path: collection.path }]

  const rootNorm = rootFolderPath.replace(/\\/g, '/').toLowerCase()
  const currentNorm = collection.path.replace(/\\/g, '/')
  const relative = currentNorm.toLowerCase().startsWith(rootNorm)
    ? currentNorm.slice(rootFolderPath.length).replace(/^[/\\]/, '')
    : ''

  const crumbs: { label: string; path: string }[] = [
    {
      label: rootFolderPath.split(/[/\\]/).pop() ?? rootFolderPath,
      path: rootFolderPath
    }
  ]

  if (!relative) return crumbs

  const parts = relative.split(/[/\\]/).filter(Boolean)
  let accumulated = rootFolderPath

  for (const part of parts) {
    accumulated = joinPath(accumulated, part)
    crumbs.push({ label: part, path: accumulated })
  }

  return crumbs
}

export function buildCountLabel(collection: FolderCollection): string {
  const parts: string[] = []

  if (collection.subfolders.length > 0) {
    parts.push(`${collection.subfolders.length} フォルダ`)
  }
  if (collection.zipFiles.length > 0) {
    parts.push(`${collection.zipFiles.length} ZIP`)
  }
  parts.push(`${collection.images.length} 枚`)

  return parts.join(' · ')
}
