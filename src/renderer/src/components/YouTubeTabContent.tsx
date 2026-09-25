import { useEffect } from 'react'
import type { TabState, YouTubeTabState } from '../types/tab'
import { YouTubeVideoGrid } from './YouTubeVideoGrid'
import { YouTubePlayer } from './YouTubePlayer'

interface YouTubeTabContentProps {
  tab: TabState & { youtube: YouTubeTabState }
  onLoadFirstPage: () => void
  onLoadMore: () => void
  onReload: () => void
  onPlay: (videoId: string) => void
  onClosePlayer: () => void
}

export function YouTubeTabContent({
  tab,
  onLoadFirstPage,
  onLoadMore,
  onReload,
  onPlay,
  onClosePlayer
}: YouTubeTabContentProps): JSX.Element {
  const { youtube } = tab

  // Fetched lazily on first display so restored-but-unvisited tabs don't
  // spend API quota at startup.
  useEffect(() => {
    if (!youtube.loaded && !tab.loading) onLoadFirstPage()
  }, [youtube.loaded, tab.loading, onLoadFirstPage])

  const playingVideo = youtube.playingVideoId
    ? youtube.videos.find((video) => video.id === youtube.playingVideoId)
    : undefined

  return (
    <div className="tab-content">
      {tab.loading && (
        <div className="status-overlay">
          <p>読み込み中...</p>
        </div>
      )}

      {/* Kept mounted (just hidden) while playing so the grid's scroll
          position survives going back to the list. */}
      <div className="youtube-grid-layer" hidden={youtube.playingVideoId !== null}>
        <YouTubeVideoGrid
          title={tab.title}
          youtube={youtube}
          loading={tab.loading}
          error={tab.error}
          highlightVideoId={youtube.lastPlayedVideoId}
          onPlay={onPlay}
          onLoadMore={onLoadMore}
          onReload={onReload}
        />
      </div>

      {youtube.playingVideoId && (
        <YouTubePlayer
          videoId={youtube.playingVideoId}
          title={playingVideo?.title ?? tab.title}
          onClose={onClosePlayer}
        />
      )}
    </div>
  )
}
