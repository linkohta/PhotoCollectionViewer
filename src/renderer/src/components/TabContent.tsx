import { ThumbnailGrid } from './ThumbnailGrid'
import { ImageViewer } from './ImageViewer'
import type { FavoriteFolder } from '../../../shared/types'
import type { TabState } from '../types/tab'
import type { TabActions } from '../utils/tabActions'

interface TabContentProps {
  tab: TabState
  favorites: FavoriteFolder[]
  onOpenDialog: () => void
  onOpenFolder: (path: string) => void
  actions: TabActions
}

export function TabContent({
  tab,
  favorites,
  onOpenDialog,
  onOpenFolder,
  actions
}: TabContentProps): JSX.Element {
  const selectedImage =
    tab.collection && tab.selectedIndex !== null
      ? (tab.collection.images[tab.selectedIndex] ?? null)
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
          canGoBack={tab.history.length > 0}
          actions={actions.grid}
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
            onClose={actions.viewer.close}
            onNavigate={actions.viewer.navigate}
            onMoveToTrash={() => actions.viewer.moveToTrash(selectedImage.path)}
          />
        )}
    </div>
  )
}
