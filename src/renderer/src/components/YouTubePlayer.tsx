import { useEffect } from 'react'
import { toWatchUrl } from '../utils/youtubeFormat'

interface YouTubePlayerProps {
  videoId: string
  title: string
  onClose: () => void
}

// Official embedded player (privacy-enhanced youtube-nocookie.com domain).
// The Referer it needs in the packaged app is added by the main process
// (services/youtubeEmbed.ts).
export function YouTubePlayer({ videoId, title, onClose }: YouTubePlayerProps): JSX.Element {
  useEffect(() => {
    // Only fires while focus is outside the player iframe - key presses
    // inside it go to the embedded page.
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const embedUrl = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?autoplay=1&rel=0`

  return (
    <div className="viewer youtube-player">
      <div className="viewer-toolbar">
        <button type="button" className="btn" onClick={onClose} title="一覧に戻る (Esc)">
          ← 一覧に戻る
        </button>
        <span className="viewer-filename youtube-player-title" title={title}>
          {title}
        </span>
        <button
          type="button"
          className="btn"
          // Opened in the default browser by the main window's open handler.
          onClick={() => window.open(toWatchUrl(videoId))}
        >
          YouTubeで開く
        </button>
      </div>
      <div className="youtube-player-frame">
        <iframe
          src={embedUrl}
          title={title}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
        />
      </div>
    </div>
  )
}
