import type { FavoriteFolder } from '../../../preload/index'

interface SidebarProps {
  favorites: FavoriteFolder[]
  currentFolder: string | null
  isFavorite: boolean
  canFavorite: boolean
  onOpenDialog: () => void
  onOpenDialogNewTab: () => void
  onSelectFolder: (path: string) => void
  onToggleFavorite: () => void
}

export function Sidebar({
  favorites,
  currentFolder,
  isFavorite,
  canFavorite,
  onOpenDialog,
  onOpenDialogNewTab,
  onSelectFolder,
  onToggleFavorite
}: SidebarProps): JSX.Element {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h1 className="app-title">PhotoCollectionViewer</h1>
        <button type="button" className="btn primary full-width" onClick={onOpenDialog}>
          フォルダを開く
        </button>
        <button type="button" className="btn full-width sidebar-secondary" onClick={onOpenDialogNewTab}>
          新しいタブで開く
        </button>
      </div>

      {canFavorite && (
        <div className="sidebar-section">
          <button
            type="button"
            className={`btn favorite-toggle ${isFavorite ? 'active' : ''}`}
            onClick={onToggleFavorite}
            title={isFavorite ? 'お気に入りから削除' : 'お気に入りに追加'}
          >
            {isFavorite ? '★ お気に入り済み' : '☆ お気に入りに追加'}
          </button>
        </div>
      )}

      <div className="sidebar-section">
        <h2 className="section-title">お気に入りフォルダ</h2>
        {favorites.length === 0 ? (
          <p className="empty-text">お気に入りはまだありません</p>
        ) : (
          <ul className="folder-list">
            {favorites.map((fav) => (
              <li key={fav.path}>
                <button
                  type="button"
                  className={`folder-item ${currentFolder === fav.path ? 'active' : ''}`}
                  onClick={() => onSelectFolder(fav.path)}
                  title={fav.path}
                >
                  <span className="folder-icon">📁</span>
                  <span className="folder-name">{fav.name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {currentFolder && (
        <div className="sidebar-section current-path">
          <h2 className="section-title">現在のコレクション</h2>
          <p className="path-text" title={currentFolder}>
            {currentFolder}
          </p>
        </div>
      )}
    </aside>
  )
}
