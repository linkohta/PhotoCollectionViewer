import { describe, expect, it } from 'vitest'
import { localFileUrlToPath, toLocalFileUrl } from './localFileUrl'

// Each URL is what Chromium handed the protocol handler (request.url) for the
// URL toLocalFileUrl built from the path, recorded from the running app. The
// drive letter arrives as a lowercase host.
describe('localFileUrlToPath', () => {
  it.each([
    ['local-file://c/Photos/a%20b/c.jpg', 'c:/Photos/a b/c.jpg'],
    ['local-file://c/Photos/%231/c.jpg', 'c:/Photos/#1/c.jpg'],
    ['local-file://c/Photos/100%25/c.jpg', 'c:/Photos/100%/c.jpg'],
    ['local-file://c/%E5%86%99%E7%9C%9F/%E7%8C%AB%20%E2%91%A0.jpg', 'c:/写真/猫 ①.jpg'],
    [
      "local-file://c/Photos/it's%20(1)%20%5B2%5D%20%7B3%7D%20~!.jpg",
      "c:/Photos/it's (1) [2] {3} ~!.jpg"
    ],
    ['local-file://c/Photos/a%2Bb%3Dc%26d%3Be%2Cf%40g%24h.jpg', 'c:/Photos/a+b=c&d;e,f@g$h.jpg'],
    ['local-file://c/Photos/a%5Eb%60c.jpg', 'c:/Photos/a^b`c.jpg'],
    ['local-file://d/x.jpg', 'd:/x.jpg'],
    ['local-file://d/', 'd:/'],
    // A network share (\\server\share\...): the server name is the host,
    // lowercased like any host.
    ['local-file://server/share/a.jpg', '//server/share/a.jpg'],
    ['local-file://server.local/Share/%E5%86%99%E7%9C%9F.jpg', '//server.local/Share/写真.jpg'],
    ['local-file://localhost/D%24/Photos/a%20b.jpg', '//localhost/D$/Photos/a b.jpg']
  ])('turns %s into %s', (requestUrl, expected) => {
    expect(localFileUrlToPath(requestUrl)).toBe(expected)
  })
})

describe('toLocalFileUrl', () => {
  it('keeps the drive letter and percent-encodes each path segment', () => {
    expect(toLocalFileUrl('C:\\Photos\\a b.jpg')).toBe('local-file:///C:/Photos/a%20b.jpg')
  })

  it('encodes URL-special characters and non-ASCII names', () => {
    expect(toLocalFileUrl('D:\\写真\\#1 100%.png')).toBe(
      'local-file:///D:/%E5%86%99%E7%9C%9F/%231%20100%25.png'
    )
  })

  it('accepts forward slashes and collapses repeated separators', () => {
    expect(toLocalFileUrl('C:/Photos//2024/a.jpg')).toBe('local-file:///C:/Photos/2024/a.jpg')
  })

  it('maps a drive root to a URL ending in a slash', () => {
    expect(toLocalFileUrl('D:\\')).toBe('local-file:///D:/')
  })

  it('encodes paths without a drive letter as rooted URL paths', () => {
    expect(toLocalFileUrl('/home/user/a.jpg')).toBe('local-file:///home/user/a.jpg')
  })

  it('encodes UNC paths with the server name as the first segment', () => {
    expect(toLocalFileUrl('\\\\server\\share\\a.jpg')).toBe('local-file:///server/share/a.jpg')
  })
})
