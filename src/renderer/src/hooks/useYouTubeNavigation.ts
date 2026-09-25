import { useCallback, useRef } from 'react'
import type { YouTubeSource, YouTubeVideoPage } from '../../../preload/index'
import { createYouTubeTab, type TabState, type YouTubeTabState } from '../types/tab'
import { getIpcErrorMessage } from '../utils/ipcError'

interface UseYouTubeNavigationArgs {
  tabs: TabState[]
  activeTabId: string
  updateTab: (tabId: string, updater: (tab: TabState) => TabState) => void
  addTab: (tab?: TabState) => TabState
}

const fetchPage = (source: YouTubeSource, pageToken?: string): Promise<YouTubeVideoPage> =>
  source.type === 'channel'
    ? window.photoCollection.listYouTubeChannelVideos(source.channelId, pageToken)
    : window.photoCollection.searchYouTube(source.query, pageToken)

export function useYouTubeNavigation({
  tabs,
  activeTabId,
  updateTab,
  addTab
}: UseYouTubeNavigationArgs) {
  // First-page requests in flight, so a re-render (or StrictMode's double
  // effect) doesn't spend API quota on the same request twice.
  const inFlightRef = useRef(new WeakSet<YouTubeSource>())

  // Applies `updater` only while the tab still shows `source` - results that
  // arrive after the user switched the tab to something else are dropped.
  const updateYouTube = useCallback(
    (
      tabId: string,
      source: YouTubeSource,
      updater: (tab: TabState, youtube: YouTubeTabState) => TabState
    ) => {
      updateTab(tabId, (tab) =>
        tab.youtube && tab.youtube.source === source ? updater(tab, tab.youtube) : tab
      )
    },
    [updateTab]
  )

  const loadFirstPage = useCallback(
    async (tabId: string, source: YouTubeSource) => {
      if (inFlightRef.current.has(source)) return
      inFlightRef.current.add(source)

      updateYouTube(tabId, source, (tab) => ({ ...tab, loading: true, error: null }))
      try {
        const page = await fetchPage(source)
        updateYouTube(tabId, source, (tab, youtube) => ({
          ...tab,
          loading: false,
          youtube: {
            ...youtube,
            videos: page.videos,
            nextPageToken: page.nextPageToken,
            loaded: true
          }
        }))
      } catch (error) {
        updateYouTube(tabId, source, (tab, youtube) => ({
          ...tab,
          loading: false,
          error: getIpcErrorMessage(error, '動画一覧を取得できませんでした'),
          youtube: { ...youtube, loaded: true }
        }))
      } finally {
        inFlightRef.current.delete(source)
      }
    },
    [updateYouTube]
  )

  const loadMore = useCallback(
    async (tabId: string) => {
      const youtube = tabs.find((tab) => tab.id === tabId)?.youtube
      if (!youtube?.nextPageToken || youtube.loadingMore) return

      const { source, nextPageToken } = youtube
      updateYouTube(tabId, source, (tab, current) => ({
        ...tab,
        youtube: { ...current, loadingMore: true }
      }))

      try {
        const page = await fetchPage(source, nextPageToken)
        updateYouTube(tabId, source, (tab, current) => {
          const known = new Set(current.videos.map((video) => video.id))
          return {
            ...tab,
            youtube: {
              ...current,
              videos: [...current.videos, ...page.videos.filter((video) => !known.has(video.id))],
              nextPageToken: page.nextPageToken,
              loadingMore: false
            }
          }
        })
      } catch (error) {
        updateYouTube(tabId, source, (tab, current) => ({
          ...tab,
          youtube: { ...current, loadingMore: false }
        }))
        window.alert(getIpcErrorMessage(error, '続きを取得できませんでした'))
      }
    },
    [tabs, updateYouTube]
  )

  const reload = useCallback(
    (tabId: string) => {
      const source = tabs.find((tab) => tab.id === tabId)?.youtube?.source
      if (source) void loadFirstPage(tabId, source)
    },
    [tabs, loadFirstPage]
  )

  const openSource = useCallback(
    (source: YouTubeSource, options: { newTab?: boolean } = {}) => {
      if (options.newTab) {
        addTab(createYouTubeTab(source))
        return
      }
      // Replaces whatever the active tab showed. The first page is fetched
      // by the tab content once it mounts (see YouTubeTabContent).
      updateTab(activeTabId, (tab) => ({ ...createYouTubeTab(source), id: tab.id }))
    },
    [activeTabId, addTab, updateTab]
  )

  const setPlayingVideo = useCallback(
    (tabId: string, videoId: string | null) => {
      updateTab(tabId, (tab) =>
        tab.youtube
          ? {
              ...tab,
              youtube: {
                ...tab.youtube,
                playingVideoId: videoId,
                lastPlayedVideoId: videoId ?? tab.youtube.playingVideoId
              }
            }
          : tab
      )
    },
    [updateTab]
  )

  return { openSource, loadFirstPage, loadMore, reload, setPlayingVideo }
}
