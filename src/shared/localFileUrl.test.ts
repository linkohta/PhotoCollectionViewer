import { describe, expect, it } from 'vitest'
import { localFileUrlToPath } from './localFileUrl'

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
    ['local-file://d/', 'd:/']
  ])('turns %s into %s', (requestUrl, expected) => {
    expect(localFileUrlToPath(requestUrl)).toBe(expected)
  })

  // \\server\share\a.jpg arrives with the server name as the host, which is
  // dropped, so files on a network share can't be loaded this way.
  it.fails('keeps the server of a UNC path', () => {
    expect(localFileUrlToPath('local-file://server/share/a.jpg')).toBe('//server/share/a.jpg')
  })
})
