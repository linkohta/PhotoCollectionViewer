import { existsSync, mkdirSync, writeFileSync } from 'fs'
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
    const parts = normalized.split('/').filter(Boolean)
    if (parts.length === 0) return null

    const root = parts[0]
    if (root.toLowerCase() !== zipBaseName.toLowerCase()) {
      return null
    }

    if (matchedPrefix === null) {
      matchedPrefix = `${root}/`
      continue
    }

    if (matchedPrefix.toLowerCase() !== `${root}/`.toLowerCase()) {
      return null
    }
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

  mkdirSync(extractPath, { recursive: true })

  const zip = new AdmZip(zipPath)
  const zipBaseName = basename(zipPath, extname(zipPath))
  const stripPrefix = detectMatchingRootPrefix(zip.getEntries(), zipBaseName)

  for (const entry of zip.getEntries()) {
    if (entry.isDirectory) continue

    const relativePath = getRelativeExtractPath(entry.entryName, stripPrefix)
    if (!relativePath) continue

    const destination = resolve(extractPath, relativePath)
    if (!isPathInsideDirectory(destination, extractPath)) {
      throw new Error('Unsafe ZIP entry path')
    }

    mkdirSync(dirname(destination), { recursive: true })
    writeFileSync(destination, entry.getData())
  }

  return extractPath
}

export { getZipExtractPath }
