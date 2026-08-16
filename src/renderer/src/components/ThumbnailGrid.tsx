import { useState } from 'react'
import type { FolderCollection, ImageFile, ZipArchive } from '../../../preload/index'
import { ContextMenu } from './ContextMenu'
import { RenameInput } from './RenameInput'
import { ThumbnailCard } from './ThumbnailCard'
import { formatFileSize } from '../utils/files'

interface ThumbnailGridProps {
  collection: FolderCollection
  rootFolderPath: string | null
  onSelect: (index: number) => void
  onSelectSubfolder: (path: string) => void
  onOpenSubfolderInNewTab: (path: string) => void
  onSelectZip: (zipFile: ZipArchive) => void
  onOpenZipInNewTab: (zipFile: ZipArchive) => void
  onGoUp: () => void
  onRenameItem: (path: string, newName: string) => Promise<void>
}

interface ItemMenuState {
  x: number
  y: number
  path: string
  name: string
  kind: 'subfolder' | 'zip' | 'image'
  zipFile?: ZipArchive
}

interface RenamingState {
  kind: 'subfolder' | 'zip' | 'image'
  path: string
}

function joinPath(base: string, segment: string): string {
  const sep = base.includes('\\') ? '\\' : '/'
  const trimmed = base.replace(/[/\\]+$/, '')
  return `${trimmed}${sep}${segment}`
}

function buildBreadcrumb(
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

function buildCountLabel(collection: FolderCollection): string {
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

export function ThumbnailGrid({
  collection,
  rootFolderPath,
  onSelect,
  onSelectSubfolder,
  onOpenSubfolderInNewTab,
  onSelectZip,
  onOpenZipInNewTab,
  onGoUp,
  onRenameItem
}: ThumbnailGridProps): JSX.Element {
  const [itemMenu, setItemMenu] = useState<ItemMenuState | null>(null)
  const [renaming, setRenaming] = useState<RenamingState | null>(null)
  const [scrollRoot, setScrollRoot] = useState<HTMLDivElement | null>(null)

  const handleRenameSubmit = async (newName: string): Promise<void> => {
    if (!renaming) return
    await onRenameItem(renaming.path, newName)
    setRenaming(null)
  }

  const breadcrumbs = buildBreadcrumb(collection, rootFolderPath)
  const isEmpty =
    collection.subfolders.length === 0 &&
    collection.zipFiles.length === 0 &&
    collection.images.length === 0
  const hasSectionsAboveImages = collection.subfolders.length > 0 || collection.zipFiles.length > 0

  return (
    <div className="grid-container">
      <header className="grid-header">
        <div className="grid-header-main">
          <nav className="breadcrumb" aria-label="フォルダパス">
            {collection.parentPath && (
              <button type="button" className="btn breadcrumb-up" onClick={onGoUp} title="上のフォルダへ">
                ↑
              </button>
            )}
            {breadcrumbs.map((crumb, index) => (
              <span key={crumb.path} className="breadcrumb-item">
                {index > 0 && <span className="breadcrumb-sep">›</span>}
                <button
                  type="button"
                  className={`breadcrumb-link ${index === breadcrumbs.length - 1 ? 'current' : ''}`}
                  onClick={() => onSelectSubfolder(crumb.path)}
                  disabled={index === breadcrumbs.length - 1}
                >
                  {crumb.label}
                </button>
              </span>
            ))}
          </nav>
          <span className="image-count">{buildCountLabel(collection)}</span>
        </div>
      </header>

      <div ref={setScrollRoot} className="grid-scroll">
        {collection.subfolders.length > 0 && (
          <section className="subfolder-section">
            <h3 className="section-label">サブフォルダ</h3>
            <div className="subfolder-grid">
              {collection.subfolders.map((subfolder) =>
                renaming?.kind === 'subfolder' && renaming.path === subfolder.path ? (
                  <div key={subfolder.path} className="subfolder-card renaming">
                    <span className="subfolder-icon">📁</span>
                    <RenameInput
                      initialName={subfolder.name}
                      onSubmit={handleRenameSubmit}
                      onCancel={() => setRenaming(null)}
                    />
                  </div>
                ) : (
                  <button
                    key={subfolder.path}
                    type="button"
                    className="subfolder-card"
                    onClick={() => onSelectSubfolder(subfolder.path)}
                    onContextMenu={(event) => {
                      event.preventDefault()
                      setItemMenu({
                        x: event.clientX,
                        y: event.clientY,
                        path: subfolder.path,
                        name: subfolder.name,
                        kind: 'subfolder'
                      })
                    }}
                    title={subfolder.path}
                  >
                    <span className="subfolder-icon">📁</span>
                    <span className="subfolder-name">{subfolder.name}</span>
                  </button>
                )
              )}
            </div>
          </section>
        )}

        {collection.zipFiles.length > 0 && (
          <section className="subfolder-section">
            <h3 className="section-label">ZIPファイル</h3>
            <div className="subfolder-grid">
              {collection.zipFiles.map((zipFile) =>
                renaming?.kind === 'zip' && renaming.path === zipFile.path ? (
                  <div key={zipFile.path} className="subfolder-card zip-card renaming">
                    <span className="subfolder-icon">🗜</span>
                    <span className="zip-info">
                      <RenameInput
                        initialName={zipFile.name}
                        onSubmit={handleRenameSubmit}
                        onCancel={() => setRenaming(null)}
                      />
                      <span className="zip-size">{formatFileSize(zipFile.size)}</span>
                    </span>
                  </div>
                ) : (
                  <button
                    key={zipFile.path}
                    type="button"
                    className="subfolder-card zip-card"
                    onClick={() => onSelectZip(zipFile)}
                    onContextMenu={(event) => {
                      event.preventDefault()
                      setItemMenu({
                        x: event.clientX,
                        y: event.clientY,
                        path: zipFile.path,
                        name: zipFile.name,
                        kind: 'zip',
                        zipFile
                      })
                    }}
                    title={`${zipFile.path}\n解凍先: ${zipFile.extractPath}`}
                  >
                    <span className="subfolder-icon">🗜</span>
                    <span className="zip-info">
                      <span className="subfolder-name">{zipFile.name}</span>
                      <span className="zip-size">{formatFileSize(zipFile.size)}</span>
                    </span>
                  </button>
                )
              )}
            </div>
          </section>
        )}

        {collection.images.length > 0 && (
          <section className="thumbnail-section">
            {hasSectionsAboveImages && <h3 className="section-label">画像</h3>}
            <div className="thumbnail-grid">
              {collection.images.map((image: ImageFile, index) => (
                <ThumbnailCard
                  key={image.path}
                  image={image}
                  index={index}
                  scrollRoot={scrollRoot}
                  onSelect={onSelect}
                  onContextMenu={(event, targetImage) => {
                    event.preventDefault()
                    setItemMenu({
                      x: event.clientX,
                      y: event.clientY,
                      path: targetImage.path,
                      name: targetImage.name,
                      kind: 'image'
                    })
                  }}
                  isRenaming={renaming?.kind === 'image' && renaming.path === image.path}
                  onRenameSubmit={handleRenameSubmit}
                  onRenameCancel={() => setRenaming(null)}
                />
              ))}
            </div>
          </section>
        )}

        {isEmpty && (
          <div className="grid-empty">
            <p>このフォルダにサブフォルダ・ZIP・画像はありません</p>
          </div>
        )}
      </div>

      {itemMenu && (
        <ContextMenu
          x={itemMenu.x}
          y={itemMenu.y}
          label={itemMenu.name}
          onOpenInNewTab={
            itemMenu.kind === 'image'
              ? undefined
              : () =>
                  itemMenu.kind === 'zip' && itemMenu.zipFile
                    ? onOpenZipInNewTab(itemMenu.zipFile)
                    : onOpenSubfolderInNewTab(itemMenu.path)
          }
          onRename={() => setRenaming({ kind: itemMenu.kind, path: itemMenu.path })}
          onClose={() => setItemMenu(null)}
        />
      )}
    </div>
  )
}
