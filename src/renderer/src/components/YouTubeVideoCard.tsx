import type { YouTubeVideo } from '../../../preload/index'
import { describeVideo, formatDuration } from '../utils/youtubeFormat'

interface YouTubeVideoCardProps {
  video: YouTubeVideo
  isHighlighted: boolean
  onPlay: (videoId: string) => void
}

export function YouTubeVideoCard({
  video,
  isHighlighted,
  onPlay
}: YouTubeVideoCardProps): JSX.Element {
  return (
    <button
      type="button"
      className={`thumbnail-card youtube-card ${isHighlighted ? 'highlighted' : ''}`}
      onClick={() => onPlay(video.id)}
      title={video.title}
    >
      <div className="thumbnail-image-wrap youtube-thumb">
        {video.thumbnailUrl ? (
          <img
            src={video.thumbnailUrl}
            alt={video.title}
            className="thumbnail-image"
            loading="lazy"
          />
        ) : (
          <div className="thumbnail-fallback">🎬</div>
        )}
        {video.liveStatus === 'live' && <span className="youtube-badge live">● LIVE</span>}
        {video.liveStatus === 'upcoming' && (
          <span className="youtube-badge upcoming">配信予定</span>
        )}
        {video.liveStatus === 'none' && video.durationSeconds !== null && (
          <span className="youtube-badge duration">{formatDuration(video.durationSeconds)}</span>
        )}
      </div>
      <div className="thumbnail-info">
        <span className="thumbnail-name youtube-title">{video.title}</span>
        <span className="thumbnail-size">{describeVideo(video)}</span>
      </div>
    </button>
  )
}
