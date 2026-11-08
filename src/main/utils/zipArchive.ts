import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs'
import { basename, dirname, extname, join, resolve, sep } from 'path'
import AdmZip from 'adm-zip'

function getZipExtractPath(zipPath: string): string {
  return join(dirname(zipPath), basename(zipPath, extname(zipPath)))
}

function isPathInsideDirectory(targetPath: string, directoryPath: string): boolean {
  const resolvedDirectory = resolve(directoryPath)
  const resolvedTarget = resolve(targetPath)
  const directoryPrefix = resolvedDirectory.endsWith(sep)
    ? resolvedDirectory
    : `${resolvedDirectory}${sep}`

  return resolvedTarget === resolvedDirectory || resolvedTarget.startsWith(directoryPrefix)
}

function normalizeEntryPath(entryName: string): string {
  return entryName.replace(/\\/g, '/').replace(/^\/+/, '')
}

function detectMatchingRootPrefix(entries: AdmZip.IZipEntry[], zipBaseName: string): string | null {
  const fileEntries = entries.filter((entry) => !entry.isDirectory)
  if (fileEntries.length === 0) return null

  let matchedPrefix: string | null = null

  for (const entry of fileEntries) {
    const normalized = normalizeEntryPath(entry.entryName)
    const [root] = normalized.split('/').filter(Boolean)
    if (root === undefined) return null

    if (root.toLowerCase() !== zipBaseName.toLowerCase()) {
      return null
    }

    matchedPrefix ??= `${root}/`
  }

  return matchedPrefix
}

function getRelativeExtractPath(entryName: string, stripPrefix: string | null): string | null {
  let relativePath = normalizeEntryPath(entryName)
  if (!relativePath) return null

  if (stripPrefix && relativePath.toLowerCase().startsWith(stripPrefix.toLowerCase())) {
    relativePath = relativePath.slice(stripPrefix.length)
  }

  return relativePath || null
}

export function extractZipArchive(zipPath: string): string {
  const extractPath = getZipExtractPath(zipPath)

  if (existsSync(extractPath)) {
    return extractPath
  }

  // An existing folder is taken to mean "already extracted" (above, and in
  // folderScan), so a failed attempt must not leave one behind: the archive is
  // read and every entry checked before the folder is created, and the folder
  // is removed again if writing fails part-way.
  const zip = new AdmZip(zipPath)
  const entries = zip.getEntries()
  const stripPrefix = detectMatchingRootPrefix(entries, basename(zipPath, extname(zipPath)))

  const files: { entry: AdmZip.IZipEntry; destination: string }[] = []
  for (const entry of entries) {
    if (entry.isDirectory) continue

    const relativePath = getRelativeExtractPath(entry.entryName, stripPrefix)
    if (!relativePath) continue

    const destination = resolve(extractPath, relativePath)
    if (!isPathInsideDirectory(destination, extractPath)) {
      throw new Error('Unsafe ZIP entry path')
    }
    files.push({ entry, destination })
  }

  mkdirSync(extractPath, { recursive: true })
  try {
    for (const { entry, destination } of files) {
      mkdirSync(dirname(destination), { recursive: true })
      writeFileSync(destination, entry.getData())
    }
  } catch (error) {
    rmSync(extractPath, { recursive: true, force: true })
    throw error
  }

  return extractPath
}

export { getZipExtractPath }
