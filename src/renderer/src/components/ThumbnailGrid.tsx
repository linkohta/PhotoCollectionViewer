import type { FolderCollection, ImageFile } from '../../../shared/types'
import type { GridActions } from '../utils/tabActions'
import { buildBreadcrumb, buildCountLabel } from '../utils/breadcrumb'
import { useGridScrollRestore } from '../hooks/useGridScrollRestore'
import { useSubfolderSearch } from '../hooks/useSubfolderSearch'
import { useGridKeyboardNav } from '../hooks/useGridKeyboardNav'
import { useGridItemMenu } from '../hooks/useGridItemMenu'
import { ContextMenu } from './ContextMenu'
import { SubfolderCard } from './SubfolderCard'
import { ThumbnailCard } from './ThumbnailCard'
import { ZipCard } from './ZipCard'

interface ThumbnailGridProps {
  collection: FolderCollection
  rootFolderPath: string | null
  highlightPath: string | null
  pendingSearchQuery: string | null
  canGoBack: boolean
  actions: GridActions
}

export function ThumbnailGrid({
  collection,
  rootFolderPath,
  highlightPath,
  pendingSearchQuery,
  canGoBack,
  actions
}: ThumbnailGridProps): JSX.Element {
  const { scrollRoot, setScrollRoot, handleGridScroll } = useGridScrollRestore(
    collection.path,
    highlightPath
  )

  const {
    subfolderQuery,
    setSubfolderQuery,
    isSearching,
    searchResults,
    filteredSubfolders,
    removeSearchResult
  } = useSubfolderSearch({
    collection,
    pendingSearchQuery,
    onConsumePendingSearchQuery: actions.consumePendingSearchQuery
  })

  useGridKeyboardNav({
    collection,
    filteredSubfolders,
    highlightPath,
    scrollRoot,
    isSearching,
    subfolderQuery,
    onHighlightChange: actions.highlight,
    onSelectSubfolder: actions.selectSubfolder,
    onSelectZip: actions.selectZip,
    onSelect: actions.selectImage,
    onGoUp: actions.goUp,
    canGoBack,
    onGoBack: actions.goBack
  })

  const itemMenu = useGridItemMenu({ actions, removeSearchResult })

  const breadcrumbs = buildBreadcrumb(collection, rootFolderPath)
  const isEmpty =
    collection.subfolders.length === 0 &&
    collection.zipFiles.length === 0 &&
    collection.images.length === 0
  const hasSectionsAboveImages = collection.subfolders.length > 0 || collection.zipFiles.length > 0

  return (
    <div
      className="grid-container"
      onMouseUp={(event) => {
        // Mouse "back" side button, same as the "←" button
        if (event.button !== 3 || !canGoBack) return
        event.preventDefault()
        actions.goBack()
      }}
    >
      <header className="grid-header">
        <div className="grid-header-main">
          <nav className="breadcrumb" aria-label="フォルダパス">
            <button
              type="button"
              className="btn breadcrumb-back"
              onClick={actions.goBack}
              disabled={!canGoBack}
              title="前のフォルダに戻る (Alt+← / Backspace)"
            >
              ←
            </button>
            {collection.parentPath && (
              <button
                type="button"
                className="btn breadcrumb-up"
                onClick={actions.goUp}
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
                  onClick={() => actions.selectSubfolder(crumb.path)}
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
              onClick={actions.refresh}
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
              <div className="subfolder-grid folder-grid">
                {filteredSubfolders.map((subfolder) => (
                  <SubfolderCard
                    key={subfolder.path}
                    path={subfolder.path}
                    name={subfolder.name}
                    subtitle={subfolder.subtitle}
                    scrollRoot={scrollRoot}
                    isHighlighted={subfolder.path === highlightPath}
                    isRenaming={itemMenu.isRenaming('subfolder', subfolder.path)}
                    onSelect={() =>
                      actions.selectSubfolder(
                        subfolder.path,
                        isSearching
                          ? { originFolderPath: collection.path, query: subfolderQuery }
                          : undefined
                      )
                    }
                    onContextMenu={(event) =>
                      itemMenu.openMenu(event, {
                        kind: 'subfolder',
                        path: subfolder.path,
                        name: subfolder.name
                      })
                    }
                    onRenameSubmit={itemMenu.submitRename}
                    onRenameCancel={itemMenu.cancelRename}
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
                  isRenaming={itemMenu.isRenaming('zip', zipFile.path)}
                  onSelect={() => actions.selectZip(zipFile)}
                  onContextMenu={(event) =>
                    itemMenu.openMenu(event, {
                      kind: 'zip',
                      path: zipFile.path,
                      name: zipFile.name,
                      zipFile
                    })
                  }
                  onRenameSubmit={itemMenu.submitRename}
                  onRenameCancel={itemMenu.cancelRename}
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
                  onSelect={actions.selectImage}
                  onContextMenu={(event, targetImage) =>
                    itemMenu.openMenu(event, {
                      kind: 'image',
                      path: targetImage.path,
                      name: targetImage.name
                    })
                  }
                  isRenaming={itemMenu.isRenaming('image', image.path)}
                  onRenameSubmit={itemMenu.submitRename}
                  onRenameCancel={itemMenu.cancelRename}
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

      {itemMenu.menu && <ContextMenu {...itemMenu.menu} onClose={itemMenu.closeMenu} />}
    </div>
  )
}
