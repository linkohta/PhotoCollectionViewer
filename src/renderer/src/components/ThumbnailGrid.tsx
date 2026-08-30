import { useState } from 'react'
import type { FolderCollection, ImageFile, ZipArchive } from '../../../preload/index'
import { buildBreadcrumb, buildCountLabel } from '../utils/breadcrumb'
import { useGridScrollRestore } from '../hooks/useGridScrollRestore'
import { useSubfolderSearch } from '../hooks/useSubfolderSearch'
import { useGridKeyboardNav } from '../hooks/useGridKeyboardNav'
import { ContextMenu } from './ContextMenu'
import { SubfolderCard } from './SubfolderCard'
import { ThumbnailCard } from './ThumbnailCard'
import { ZipCard } from './ZipCard'

interface SubfolderSearchOrigin {
  originFolderPath: string
  query: string
}

interface ThumbnailGridProps {
  collection: FolderCollection
  rootFolderPath: string | null
  highlightPath: string | null
  pendingSearchQuery: string | null
  onConsumePendingSearchQuery: () => void
  onHighlightChange: (path: string) => void
  onSelect: (index: number) => void
  onSelectSubfolder: (path: string, searchOrigin?: SubfolderSearchOrigin) => void
  onOpenSubfolderInNewTab: (path: string) => void
  onSelectZip: (zipFile: ZipArchive) => void
  onOpenZipInNewTab: (zipFile: ZipArchive) => void
  onGoUp: () => void
  onRenameItem: (path: string, newName: string) => Promise<void>
  onMoveToUnnecessary: (path: string) => void
  onRefreshFolder: () => void
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

export function ThumbnailGrid({
  collection,
  rootFolderPath,
  highlightPath,
  pendingSearchQuery,
  onConsumePendingSearchQuery,
  onHighlightChange,
  onSelect,
  onSelectSubfolder,
  onOpenSubfolderInNewTab,
  onSelectZip,
  onOpenZipInNewTab,
  onGoUp,
  onRenameItem,
  onMoveToUnnecessary,
  onRefreshFolder
}: ThumbnailGridProps): JSX.Element {
  const [itemMenu, setItemMenu] = useState<ItemMenuState | null>(null)
  const [renaming, setRenaming] = useState<RenamingState | null>(null)

  const { scrollRoot, setScrollRoot, handleGridScroll } = useGridScrollRestore(
    collection.path,
    highlightPath
  )

  const { subfolderQuery, setSubfolderQuery, isSearching, searchResults, filteredSubfolders } =
    useSubfolderSearch({ collection, pendingSearchQuery, onConsumePendingSearchQuery })

  useGridKeyboardNav({
    collection,
    filteredSubfolders,
    highlightPath,
    scrollRoot,
    isSearching,
    subfolderQuery,
    onHighlightChange,
    onSelectSubfolder,
    onSelectZip,
    onSelect,
    onGoUp
  })

  const handleRenameSubmit = async (newName: string): Promise<void> => {
    if (!renaming) return
    await onRenameItem(renaming.path, newName)
    setRenaming(null)
  }

  const openItemMenu = (
    event: { clientX: number; clientY: number; preventDefault: () => void },
    path: string,
    name: string,
    kind: ItemMenuState['kind'],
    zipFile?: ZipArchive
  ): void => {
    event.preventDefault()
    setItemMenu({ x: event.clientX, y: event.clientY, path, name, kind, zipFile })
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
              <button
                type="button"
                className="btn breadcrumb-up"
                onClick={onGoUp}
                title="上のフォルダへ (Esc)"
              >
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
                  title={crumb.label}
                >
                  {crumb.label}
                </button>
              </span>
            ))}
          </nav>
          <div className="grid-header-actions">
            <span className="image-count">{buildCountLabel(collection)}</span>
            <button
              type="button"
              className="btn grid-refresh"
              onClick={onRefreshFolder}
              title="一覧を更新"
            >
              ⟳ 更新
            </button>
          </div>
        </div>
      </header>

      <div ref={setScrollRoot} className="grid-scroll" onScroll={handleGridScroll}>
        {collection.subfolders.length > 0 && (
          <section className="subfolder-section">
            <div className="section-label-row">
              <h3 className="section-label">サブフォルダ</h3>
              <input
                type="text"
                className="subfolder-search"
                placeholder="サブフォルダを検索"
                value={subfolderQuery}
                onChange={(event) => setSubfolderQuery(event.target.value)}
              />
            </div>
            {filteredSubfolders.length > 0 ? (
              <div className="subfolder-grid">
                {filteredSubfolders.map((subfolder) => (
                  <SubfolderCard
                    key={subfolder.path}
                    path={subfolder.path}
                    name={subfolder.name}
                    subtitle={subfolder.subtitle}
                    isHighlighted={subfolder.path === highlightPath}
                    isRenaming={renaming?.kind === 'subfolder' && renaming.path === subfolder.path}
                    onSelect={() =>
                      onSelectSubfolder(
                        subfolder.path,
                        isSearching
                          ? { originFolderPath: collection.path, query: subfolderQuery }
                          : undefined
                      )
                    }
                    onContextMenu={(event) =>
                      openItemMenu(event, subfolder.path, subfolder.name, 'subfolder')
                    }
                    onRenameSubmit={handleRenameSubmit}
                    onRenameCancel={() => setRenaming(null)}
                  />
                ))}
              </div>
            ) : (
              <p className="subfolder-search-empty">
                {isSearching && searchResults === null
                  ? '検索中...'
                  : '一致するサブフォルダはありません'}
              </p>
            )}
          </section>
        )}

        {collection.zipFiles.length > 0 && (
          <section className="subfolder-section">
            <h3 className="section-label">ZIPファイル</h3>
            <div className="subfolder-grid">
              {collection.zipFiles.map((zipFile) => (
                <ZipCard
                  key={zipFile.path}
                  zipFile={zipFile}
                  isHighlighted={zipFile.path === highlightPath}
                  isRenaming={renaming?.kind === 'zip' && renaming.path === zipFile.path}
                  onSelect={() => onSelectZip(zipFile)}
                  onContextMenu={(event) =>
                    openItemMenu(event, zipFile.path, zipFile.name, 'zip', zipFile)
                  }
                  onRenameSubmit={handleRenameSubmit}
                  onRenameCancel={() => setRenaming(null)}
                />
              ))}
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
                  isHighlighted={image.path === highlightPath}
                  onSelect={onSelect}
                  onContextMenu={(event, targetImage) =>
                    openItemMenu(event, targetImage.path, targetImage.name, 'image')
                  }
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
          onMoveToUnnecessary={
            itemMenu.kind === 'image' ? () => onMoveToUnnecessary(itemMenu.path) : undefined
          }
          onClose={() => setItemMenu(null)}
        />
      )}
    </div>
  )
}
