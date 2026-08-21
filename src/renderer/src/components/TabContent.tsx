import { ThumbnailGrid } from './ThumbnailGrid'
import { ImageViewer } from './ImageViewer'
import type { FavoriteFolder, ZipArchive } from '../../../preload/index'
import type { TabState } from '../types/tab'

interface TabContentProps {
  tab: TabState
  favorites: FavoriteFolder[]
  onOpenDialog: () => void
  onOpenFolder: (path: string) => void
  onSelectSubfolder: (path: string, searchOrigin?: { originFolderPath: string; query: string }) => void
  onConsumePendingSearchQuery: () => void
  onOpenSubfolderInNewTab: (path: string) => void
  onHighlightChange: (path: string) => void
  onSelectZip: (zipFile: ZipArchive) => void
  onOpenZipInNewTab: (zipFile: ZipArchive) => void
  onGoUp: () => void
  onRenameItem: (path: string, newName: string) => Promise<void>
  onSelectImage: (index: number) => void
  onCloseViewer: () => void
  onNavigate: (direction: -1 | 1) => void
}

export function TabContent({
  tab,
  favorites,
  onOpenDialog,
  onOpenFolder,
  onSelectSubfolder,
  onConsumePendingSearchQuery,
  onOpenSubfolderInNewTab,
  onHighlightChange,
  onSelectZip,
  onOpenZipInNewTab,
  onGoUp,
  onRenameItem,
  onSelectImage,
  onCloseViewer,
  onNavigate
}: TabContentProps): JSX.Element {
  const selectedImage =
    tab.collection && tab.selectedIndex !== null
      ? tab.collection.images[tab.selectedIndex] ?? null
      : null

  return (
    <div className="tab-content">
      {tab.loading && (
        <div className="status-overlay">
          <p>読み込み中...</p>
        </div>
      )}

      {tab.error && (
        <div className="status-overlay error">
          <p>{tab.error}</p>
        </div>
      )}

      {!tab.collection && !tab.loading && !tab.error && (
        <div className="welcome">
          <div className="welcome-card">
            <h1>PhotoCollectionViewer</h1>
            <p>フォルダを開いて、画像コレクションを表示します。</p>
            <button type="button" className="btn primary" onClick={onOpenDialog}>
              フォルダを開く
            </button>
            {favorites.length > 0 && (
              <div className="welcome-favorites">
                <h2>お気に入り</h2>
                <ul>
                  {favorites.map((fav) => (
                    <li key={fav.path}>
                      <button type="button" onClick={() => onOpenFolder(fav.path)}>
                        {fav.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {tab.collection && tab.viewMode === 'grid' && (
        <ThumbnailGrid
          collection={tab.collection}
          rootFolderPath={tab.rootFolderPath}
          highlightPath={tab.highlightPath}
          pendingSearchQuery={tab.pendingSearchQuery}
          onConsumePendingSearchQuery={onConsumePendingSearchQuery}
          onHighlightChange={onHighlightChange}
          onSelect={onSelectImage}
          onSelectSubfolder={onSelectSubfolder}
          onOpenSubfolderInNewTab={onOpenSubfolderInNewTab}
          onSelectZip={onSelectZip}
          onOpenZipInNewTab={onOpenZipInNewTab}
          onGoUp={onGoUp}
          onRenameItem={onRenameItem}
        />
      )}

      {tab.collection &&
        tab.viewMode === 'viewer' &&
        selectedImage &&
        tab.selectedIndex !== null && (
          <ImageViewer
            image={selectedImage}
            allImages={tab.collection.images}
            index={tab.selectedIndex}
            total={tab.collection.images.length}
            onClose={onCloseViewer}
            onNavigate={onNavigate}
          />
        )}
    </div>
  )
}
