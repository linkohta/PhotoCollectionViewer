import { useState } from 'react'
import type { FolderCollection } from '../../../preload/index'
import { ContextMenu } from './ContextMenu'
import { ThumbnailCard } from './ThumbnailCard'

interface ThumbnailGridProps {
  collection: FolderCollection
  rootFolderPath: string | null
  onSelect: (index: number) => void
  onSelectSubfolder: (path: string) => void
  onOpenSubfolderInNewTab: (path: string) => void
  onGoUp: () => void
}

interface SubfolderMenuState {
  x: number
  y: number
  path: string
  name: string
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

export function ThumbnailGrid({
  collection,
  rootFolderPath,
  onSelect,
  onSelectSubfolder,
  onOpenSubfolderInNewTab,
  onGoUp
}: ThumbnailGridProps): JSX.Element {
  const [subfolderMenu, setSubfolderMenu] = useState<SubfolderMenuState | null>(null)
  const [scrollRoot, setScrollRoot] = useState<HTMLDivElement | null>(null)

  const breadcrumbs = buildBreadcrumb(collection, rootFolderPath)
  const isEmpty = collection.subfolders.length === 0 && collection.images.length === 0

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
          <span className="image-count">
            {collection.subfolders.length > 0 && `${collection.subfolders.length} フォルダ · `}
            {collection.images.length} 枚
          </span>
        </div>
      </header>

      <div
        ref={setScrollRoot}
        className="grid-scroll"
      >
        {collection.subfolders.length > 0 && (
          <section className="subfolder-section">
            <h3 className="section-label">サブフォルダ</h3>
            <div className="subfolder-grid">
              {collection.subfolders.map((subfolder) => (
                <button
                  key={subfolder.path}
                  type="button"
                  className="subfolder-card"
                  onClick={() => onSelectSubfolder(subfolder.path)}
                  onContextMenu={(event) => {
                    event.preventDefault()
                    setSubfolderMenu({
                      x: event.clientX,
                      y: event.clientY,
                      path: subfolder.path,
                      name: subfolder.name
                    })
                  }}
                  title={subfolder.path}
                >
                  <span className="subfolder-icon">📁</span>
                  <span className="subfolder-name">{subfolder.name}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {collection.images.length > 0 && (
          <section className="thumbnail-section">
            {collection.subfolders.length > 0 && (
              <h3 className="section-label">画像</h3>
            )}
            <div className="thumbnail-grid">
              {collection.images.map((image, index) => (
                <ThumbnailCard
                  key={image.path}
                  image={image}
                  index={index}
                  scrollRoot={scrollRoot}
                  onSelect={onSelect}
                />
              ))}
            </div>
          </section>
        )}

        {isEmpty && (
          <div className="grid-empty">
            <p>このフォルダにサブフォルダも画像もありません</p>
          </div>
        )}
      </div>

      {subfolderMenu && (
        <ContextMenu
          x={subfolderMenu.x}
          y={subfolderMenu.y}
          label={subfolderMenu.name}
          onOpenInNewTab={() => onOpenSubfolderInNewTab(subfolderMenu.path)}
          onClose={() => setSubfolderMenu(null)}
        />
      )}
    </div>
  )
}
