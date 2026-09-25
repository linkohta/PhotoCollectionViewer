import { net } from 'electron'
import { getApiKey } from '../store/youtube'
import type {
  YouTubeChannel,
  YouTubeLiveStatus,
  YouTubeVideo,
  YouTubeVideoPage
} from '../../preload/types'

// YouTube Data API v3. Calls are made from the main process so the API key
// never reaches the renderer and CORS / referrer restrictions don't apply.
// Quota costs per call: channels/playlistItems/videos = 1 unit, search = 100.
const API_BASE = 'https://www.googleapis.com/youtube/v3'
const PAGE_SIZE = 24

type Params = Record<string, string | undefined>

interface ApiErrorBody {
  error?: { message?: string; errors?: { reason?: string }[] }
}

interface Thumbnails {
  default?: { url: string }
  medium?: { url: string }
  high?: { url: string }
}

interface ChannelListResponse {
  items?: { id: string; snippet: { title: string; thumbnails?: Thumbnails } }[]
}

interface PlaylistItemsResponse {
  nextPageToken?: string
  items?: { contentDetails: { videoId: string } }[]
}

interface SearchResponse {
  nextPageToken?: string
  items?: { id: { videoId?: string } }[]
}

interface VideoResource {
  id: string
  snippet: {
    title: string
    channelId: string
    channelTitle: string
    publishedAt: string
    thumbnails?: Thumbnails
    liveBroadcastContent?: string
  }
  contentDetails?: { duration?: string }
  liveStreamingDetails?: { scheduledStartTime?: string }
}

interface VideosResponse {
  items?: VideoResource[]
}

const describeApiError = (status: number, body: ApiErrorBody | null): string => {
  const reason = body?.error?.errors?.[0]?.reason
  switch (reason) {
    case 'quotaExceeded':
    case 'dailyLimitExceeded':
      return 'YouTube APIの1日の利用上限（クォータ）に達しました。時間をおいて再度お試しください。'
    case 'keyInvalid':
    case 'badRequest':
      if (body?.error?.message?.includes('API key')) {
        return 'YouTube APIキーが無効です。設定を確認してください。'
      }
      break
    case 'accessNotConfigured':
      return 'このAPIキーでは YouTube Data API v3 が有効になっていません。Google Cloud Console で有効にしてください。'
    case 'playlistNotFound':
      return 'このチャンネルの動画一覧を取得できませんでした。'
  }
  if (body?.error?.message?.includes('API key not valid')) {
    return 'YouTube APIキーが無効です。設定を確認してください。'
  }
  return `YouTube APIでエラーが発生しました (HTTP ${status})`
}

const callApi = async <T>(endpoint: string, params: Params): Promise<T> => {
  const apiKey = getApiKey()
  if (!apiKey) {
    throw new Error(
      'YouTube APIキーが設定されていません。サイドバーの「設定」から登録してください。'
    )
  }

  const url = new URL(`${API_BASE}/${endpoint}`)
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, value)
  }
  url.searchParams.set('key', apiKey)

  let response: Response
  try {
    response = await net.fetch(url.toString())
  } catch {
    throw new Error('YouTube APIに接続できませんでした。ネットワーク接続を確認してください。')
  }

  const body = (await response.json().catch(() => null)) as unknown
  if (!response.ok) {
    throw new Error(describeApiError(response.status, body as ApiErrorBody | null))
  }
  return body as T
}

const pickThumbnail = (thumbnails: Thumbnails | undefined): string | null =>
  thumbnails?.medium?.url ?? thumbnails?.high?.url ?? thumbnails?.default?.url ?? null

// ISO 8601 duration ("PT1H2M3S") to seconds. Live streams report "P0D".
const parseDuration = (value: string | undefined): number | null => {
  if (!value) return null
  const match = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(value)
  if (!match) return null
  const [days = 0, hours = 0, minutes = 0, seconds = 0] = match
    .slice(1)
    .map((part) => Number(part ?? 0))
  const total = days * 86400 + hours * 3600 + minutes * 60 + seconds
  return total > 0 ? total : null
}

const toLiveStatus = (value: string | undefined): YouTubeLiveStatus =>
  value === 'live' || value === 'upcoming' ? value : 'none'

// Fetches full details for the given IDs (one call, up to 50), keeping the
// order of `ids` and dropping videos that are private or deleted.
const fetchVideos = async (ids: string[]): Promise<YouTubeVideo[]> => {
  if (ids.length === 0) return []

  const response = await callApi<VideosResponse>('videos', {
    part: 'snippet,contentDetails,liveStreamingDetails',
    id: ids.join(','),
    maxResults: String(ids.length)
  })

  const byId = new Map((response.items ?? []).map((item) => [item.id, item]))
  return ids.flatMap((id) => {
    const item = byId.get(id)
    if (!item) return []
    return [
      {
        id,
        title: item.snippet.title,
        channelId: item.snippet.channelId,
        channelTitle: item.snippet.channelTitle,
        thumbnailUrl: pickThumbnail(item.snippet.thumbnails),
        publishedAt: item.snippet.publishedAt,
        durationSeconds: parseDuration(item.contentDetails?.duration),
        liveStatus: toLiveStatus(item.snippet.liveBroadcastContent),
        scheduledStartTime: item.liveStreamingDetails?.scheduledStartTime ?? null
      }
    ]
  })
}

type ChannelLookup = { id: string } | { forHandle: string } | { forUsername: string }

// Accepts a channel URL (/channel/UC…, /@handle, /user/name, /c/name),
// "@handle", a bare channel ID ("UC…") or a bare handle.
const parseChannelInput = (input: string): ChannelLookup | null => {
  const trimmed = input.trim()
  if (!trimmed) return null
  if (/^UC[\w-]{22}$/.test(trimmed)) return { id: trimmed }
  if (trimmed.startsWith('@')) return { forHandle: trimmed }

  const looksLikeUrl = /^(https?:\/\/)?([\w-]+\.)*youtube\.com\//i.test(trimmed)
  if (!looksLikeUrl) return { forHandle: `@${trimmed}` }

  let url: URL
  try {
    url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`)
  } catch {
    return null
  }

  const [first, second] = url.pathname.split('/').filter(Boolean).map(decodeURIComponent)
  if (!first) return null
  if (first.startsWith('@')) return { forHandle: first }
  if (first === 'channel' && second) return { id: second }
  if (first === 'user' && second) return { forUsername: second }
  // Legacy /c/ custom URLs have no API lookup; most now match a handle.
  if (first === 'c' && second) return { forHandle: `@${second}` }
  return null
}

export async function resolveChannel(input: string): Promise<YouTubeChannel> {
  const lookup = parseChannelInput(input)
  if (!lookup) {
    throw new Error('チャンネルのURL・@ハンドル・チャンネルIDを入力してください')
  }

  const response = await callApi<ChannelListResponse>('channels', { part: 'snippet', ...lookup })
  const channel = response.items?.[0]
  if (!channel) {
    throw new Error('チャンネルが見つかりませんでした')
  }

  return {
    id: channel.id,
    title: channel.snippet.title,
    thumbnailUrl: pickThumbnail(channel.snippet.thumbnails),
    addedAt: Date.now()
  }
}

// Uses the channel's uploads playlist ("UC…" → "UU…") instead of search.list
// to keep quota use at 2 units per page. Live and upcoming streams are part
// of the uploads playlist and are flagged via liveBroadcastContent.
export async function listChannelVideos(
  channelId: string,
  pageToken?: string
): Promise<YouTubeVideoPage> {
  const uploadsPlaylistId = channelId.replace(/^UC/, 'UU')
  const response = await callApi<PlaylistItemsResponse>('playlistItems', {
    part: 'contentDetails',
    playlistId: uploadsPlaylistId,
    maxResults: String(PAGE_SIZE),
    pageToken
  })

  const ids = (response.items ?? []).map((item) => item.contentDetails.videoId)
  return { videos: await fetchVideos(ids), nextPageToken: response.nextPageToken ?? null }
}

export async function searchVideos(query: string, pageToken?: string): Promise<YouTubeVideoPage> {
  const trimmed = query.trim()
  if (!trimmed) return { videos: [], nextPageToken: null }

  const response = await callApi<SearchResponse>('search', {
    part: 'id',
    type: 'video',
    q: trimmed,
    maxResults: String(PAGE_SIZE),
    pageToken
  })

  const ids = (response.items ?? []).flatMap((item) => (item.id.videoId ? [item.id.videoId] : []))
  return { videos: await fetchVideos(ids), nextPageToken: response.nextPageToken ?? null }
}
