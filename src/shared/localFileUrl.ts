// The custom scheme the renderer loads images and videos through (served by
// main/protocol/localFileProtocol.ts).
export const LOCAL_FILE_SCHEME = 'local-file'

// Turns the URL of a local-file:// request back into the file's path.
//
// `toLocalFileUrl` (utils/files.ts, renderer side) emits Windows paths as
// `local-file:///C:/foo/bar` (drive letter immediately after the triple
// slash). Chromium's URL canonicalizer for custom "standard" privileged
// schemes parses "C:" right after "//" as authority "host:port" syntax,
// silently drops the invalid/empty port along with the colon, and folds the
// bare drive letter into `request.url`'s hostname - e.g. the above becomes
// `local-file://c/foo/bar` (hostname "c", pathname "/foo/bar") by the time
// it reaches the protocol handler. Reattach the colon to the hostname to
// recover a valid path; Windows drive letters are case-insensitive so the
// lowercased hostname works as-is.
export function localFileUrlToPath(requestUrl: string): string {
  const url = new URL(requestUrl)
  const decodedPath = decodeURIComponent(url.pathname)
  if (/^[a-zA-Z]$/.test(url.hostname)) {
    return `${url.hostname}:${decodedPath}`
  }
  return decodedPath
}
