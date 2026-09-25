import { session } from 'electron'

// The packaged app loads its UI from file://, so the embedded player's page
// request carries no Referer. YouTube now rejects embeds that don't identify
// the embedding app (player error 153), and for native apps asks for a
// Referer of the form https://<application id>. Only the embed page request
// itself is touched; everything the player loads afterwards uses the embed
// page as its referrer.
const EMBED_REFERER = 'https://com.masterlink.photocollectionviewer/'

const EMBED_URL_PATTERNS = [
  'https://www.youtube-nocookie.com/embed/*',
  'https://www.youtube.com/embed/*'
]

export function installYouTubeEmbedReferer(): void {
  session.defaultSession.webRequest.onBeforeSendHeaders(
    { urls: EMBED_URL_PATTERNS },
    (details, callback) => {
      callback({ requestHeaders: { ...details.requestHeaders, Referer: EMBED_REFERER } })
    }
  )
}
