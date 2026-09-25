import type { YouTubeVideo } from '../../../preload/index'

export function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const pad = (value: number): string => String(value).padStart(2, '0')
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`
}

const formatDateTime = (iso: string, withTime: boolean): string => {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {})
  })
}

// Second line of a video card: channel name plus when it was published, or
// when an upcoming stream is scheduled to start.
export function describeVideo(video: YouTubeVideo): string {
  const when =
    video.liveStatus === 'upcoming' && video.scheduledStartTime
      ? `${formatDateTime(video.scheduledStartTime, true)} 開始予定`
      : formatDateTime(video.publishedAt, false)
  return [video.channelTitle, when].filter(Boolean).join(' · ')
}

export function toWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`
}
