import type { YouTubeTabState } from '../types/tab'
import { YouTubeVideoCard } from './YouTubeVideoCard'

interface YouTubeVideoGridProps {
  title: string
  youtube: YouTubeTabState
  loading: boolean
  error: string | null
  highlightVideoId: string | null
  onPlay: (videoId: string) => void
  onLoadMore: () => void
  onReload: () => void
}

export function YouTubeVideoGrid({
  title,
  youtube,
  loading,
  error,
  highlightVideoId,
  onPlay,
  onLoadMore,
  onReload
}: YouTubeVideoGridProps): JSX.Element {
  const liveCount = youtube.videos.filter((video) => video.liveStatus === 'live').length

  return (
    <div className="grid-container">
      <header className="grid-header">
        <div className="grid-header-main">
          <h2 className="youtube-grid-title" title={title}>
            <span className="youtube-mark" aria-hidden="true">
              ▶
            </span>
            {title}
          </h2>
          <div className="grid-header-actions">
            <span className="image-count">
              {youtube.videos.length}件{liveCount > 0 ? `（配信中 ${liveCount}）` : ''}
            </span>
            <button
              type="button"
              className="btn grid-refresh"
              onClick={onReload}
              disabled={loading}
              title="一覧を更新"
            >
              ⟳ 更新
            </button>
          </div>
        </div>
      </header>

      <div className="grid-scroll">
        {error ? (
          <div className="grid-empty youtube-error">
            <p>{error}</p>
            <button type="button" className="btn" onClick={onReload}>
              再試行
            </button>
          </div>
        ) : youtube.loaded && youtube.videos.length === 0 ? (
          <div className="grid-empty">動画が見つかりませんでした</div>
        ) : (
          <>
            <div className="thumbnail-grid youtube-grid">
              {youtube.videos.map((video) => (
                <YouTubeVideoCard
                  key={video.id}
                  video={video}
                  isHighlighted={video.id === highlightVideoId}
                  onPlay={onPlay}
                />
              ))}
            </div>
            {youtube.nextPageToken && (
              <div className="youtube-load-more">
                <button
                  type="button"
                  className="btn"
                  onClick={onLoadMore}
                  disabled={youtube.loadingMore}
                >
                  {youtube.loadingMore ? '読み込み中...' : 'もっと読み込む'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
