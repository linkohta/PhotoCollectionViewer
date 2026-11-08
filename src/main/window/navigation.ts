// Only web pages are handed to the default browser. Other schemes (file:,
// ms-settings:, protocols registered by other apps...) would open local files
// or start other programs.
export function isExternalWebUrl(url: string): boolean {
  try {
    const { protocol } = new URL(url)
    return protocol === 'http:' || protocol === 'https:'
  } catch {
    return false
  }
}

const withoutHash = (url: string): string => url.split('#')[0] ?? url

// The app is a single page that never navigates itself, but Chromium starts a
// navigation when a file is dropped onto the window (or the page sets
// location.href), which replaces the whole app with that file. Only reloading
// the page itself (location.reload(), as the dev server's hot reload does) is
// let through.
export function isNavigationAllowed(currentUrl: string, targetUrl: string): boolean {
  return withoutHash(currentUrl) === withoutHash(targetUrl)
}
