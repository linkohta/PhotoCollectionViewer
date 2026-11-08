// The custom scheme the renderer loads images and videos through (served by
// main/protocol/localFileProtocol.ts).
export const LOCAL_FILE_SCHEME = 'local-file'

// The URL the renderer loads a file from: every path segment percent-encoded,
// so names with spaces, "#", "%" or non-ASCII letters survive. A network
// share's server name becomes the first segment.
export function toLocalFileUrl(filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/')

  if (/^[a-zA-Z]:\//.test(normalized)) {
    const drive = normalized.slice(0, 2)
    const encodedRest = normalized
      .slice(3)
      .split('/')
      .filter(Boolean)
      .map(encodeURIComponent)
      .join('/')
    return encodedRest
      ? `${LOCAL_FILE_SCHEME}:///${drive}/${encodedRest}`
      : `${LOCAL_FILE_SCHEME}:///${drive}/`
  }

  const encoded = normalized.split('/').filter(Boolean).map(encodeURIComponent).join('/')
  return `${LOCAL_FILE_SCHEME}:///${encoded}`
}

// Turns the URL of a local-file:// request back into the file's path.
//
// toLocalFileUrl above emits Windows paths as
// `local-file:///C:/foo/bar` (drive letter immediately after the triple
// slash). Chromium's URL canonicalizer for custom "standard" privileged
// schemes parses "C:" right after "//" as authority "host:port" syntax,
// silently drops the invalid/empty port along with the colon, and folds the
// bare drive letter into `request.url`'s hostname - e.g. the above becomes
// `local-file://c/foo/bar` (hostname "c", pathname "/foo/bar") by the time
// it reaches the protocol handler. Reattach the colon to the hostname to
// recover a valid path; Windows drive letters are case-insensitive so the
// lowercased hostname works as-is.
//
// A path on a network share (`\\server\share\a.jpg`) becomes
// `local-file:///server/share/a.jpg` the same way, and arrives with the
// server name as the (lowercased) hostname: put the `//` back in front of it.
// Server names are case-insensitive too.
export function localFileUrlToPath(requestUrl: string): string {
  const url = new URL(requestUrl)
  const decodedPath = decodeURIComponent(url.pathname)
  if (/^[a-zA-Z]$/.test(url.hostname)) {
    return `${url.hostname}:${decodedPath}`
  }
  if (url.hostname) {
    return `//${url.hostname}${decodedPath}`
  }
  return decodedPath
}
