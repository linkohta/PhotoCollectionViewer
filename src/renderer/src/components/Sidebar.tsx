import { useState } from 'react'
import type {
  ConfirmationKind,
  ConfirmationSettings,
  FavoriteFolder,
  YouTubeSettings,
  YouTubeSource
} from '../../../preload/index'
import { ContextMenu } from './ContextMenu'
import { SidebarYouTubeSection } from './SidebarYouTubeSection'
import { YouTubeApiKeyDialog } from './YouTubeApiKeyDialog'

interface SidebarProps {
  favorites: FavoriteFolder[]
  currentFolder: string | null
  isFavorite: boolean
  canFavorite: boolean
  onOpenDialog: () => void
  onOpenDialogNewTab: () => void
  onSelectFolder: (path: string) => void
  onOpenFolderInNewTab: (path: string) => void
  onToggleFavorite: () => void
  onExportSettings: () => void
  onImportSettings: () => void
  confirmations: ConfirmationSettings | null
  onChangeConfirmation: (kind: ConfirmationKind, enabled: boolean) => void
  youtubeSettings: YouTubeSettings
  activeYouTubeChannelId: string | null
  onOpenYouTube: (source: YouTubeSource, newTab: boolean) => void
  onAddYouTubeChannel: (input: string) => Promise<void>
  onRemoveYouTubeChannel: (channelId: string) => void
  onSaveYouTubeApiKey: (apiKey: string) => Promise<void>
  onClearYouTubeApiKey: () => Promise<void>
}

const CONFIRMATION_LABELS: Record<ConfirmationKind, string> = {
  extractZip: 'ZIPの解凍前に確認する',
  deleteFolder: 'フォルダの削除前に確認する',
  importSettings: '設定のインポート前に確認する'
}

interface FavoriteMenuState {
  x: number
  y: number
  path: string
  name: string
}

export function Sidebar({
  favorites,
  currentFolder,
  isFavorite,
  canFavorite,
  onOpenDialog,
  onOpenDialogNewTab,
  onSelectFolder,
  onOpenFolderInNewTab,
  onToggleFavorite,
  onExportSettings,
  onImportSettings,
  confirmations,
  onChangeConfirmation,
  youtubeSettings,
  activeYouTubeChannelId,
  onOpenYouTube,
  onAddYouTubeChannel,
  onRemoveYouTubeChannel,
  onSaveYouTubeApiKey,
  onClearYouTubeApiKey
}: SidebarProps): JSX.Element {
  const [favoriteMenu, setFavoriteMenu] = useState<FavoriteMenuState | null>(null)
  const [apiKeyDialogOpen, setApiKeyDialogOpen] = useState(false)

  return (
    <>
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1 className="app-title">PhotoCollectionViewer</h1>
          <button type="button" className="btn primary full-width" onClick={onOpenDialog}>
            フォルダを開く
          </button>
          <button
            type="button"
            className="btn full-width sidebar-secondary"
            onClick={onOpenDialogNewTab}
          >
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
                    onContextMenu={(event) => {
                      event.preventDefault()
                      setFavoriteMenu({
                        x: event.clientX,
                        y: event.clientY,
                        path: fav.path,
                        name: fav.name
                      })
                    }}
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

        <SidebarYouTubeSection
          settings={youtubeSettings}
          activeChannelId={activeYouTubeChannelId}
          onOpen={onOpenYouTube}
          onAddChannel={onAddYouTubeChannel}
          onRemoveChannel={onRemoveYouTubeChannel}
          onOpenApiKeyDialog={() => setApiKeyDialogOpen(true)}
        />

        {currentFolder && (
          <div className="sidebar-section current-path">
            <h2 className="section-title">現在のコレクション</h2>
            <p className="path-text" title={currentFolder}>
              {currentFolder}
            </p>
          </div>
        )}

        <div className="sidebar-section sidebar-footer">
          <h2 className="section-title">設定</h2>
          <button
            type="button"
            className="btn full-width sidebar-secondary"
            onClick={onExportSettings}
          >
            設定をエクスポート
          </button>
          <button
            type="button"
            className="btn full-width sidebar-secondary"
            onClick={onImportSettings}
          >
            設定をインポート
          </button>
          <button
            type="button"
            className="btn full-width sidebar-secondary"
            onClick={() => setApiKeyDialogOpen(true)}
          >
            YouTube APIキー設定
          </button>
          {confirmations && (
            <div className="confirmation-options">
              {(Object.keys(CONFIRMATION_LABELS) as ConfirmationKind[]).map((kind) => (
                <label key={kind} className="confirmation-option">
                  <input
                    type="checkbox"
                    checked={confirmations[kind]}
                    onChange={(event) => onChangeConfirmation(kind, event.target.checked)}
                  />
                  {CONFIRMATION_LABELS[kind]}
                </label>
              ))}
            </div>
          )}
        </div>
      </aside>

      {favoriteMenu && (
        <ContextMenu
          x={favoriteMenu.x}
          y={favoriteMenu.y}
          label={favoriteMenu.name}
          onOpenInNewTab={() => onOpenFolderInNewTab(favoriteMenu.path)}
          onClose={() => setFavoriteMenu(null)}
        />
      )}

      {apiKeyDialogOpen && (
        <YouTubeApiKeyDialog
          hasApiKey={youtubeSettings.hasApiKey}
          onSave={onSaveYouTubeApiKey}
          onClear={onClearYouTubeApiKey}
          onClose={() => setApiKeyDialogOpen(false)}
        />
      )}
    </>
  )
}
