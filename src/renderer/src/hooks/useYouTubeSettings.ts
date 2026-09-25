import { useCallback, useEffect, useState } from 'react'
import type { YouTubeSettings } from '../../../preload/index'

// Mirrors the stored YouTube settings (whether an API key is set and the
// registered channels). Each action resolves with the updated settings.
export function useYouTubeSettings() {
  const [settings, setSettings] = useState<YouTubeSettings>({ hasApiKey: false, channels: [] })

  useEffect(() => {
    void window.photoCollection.getYouTubeSettings().then(setSettings)
  }, [])

  const saveApiKey = useCallback(async (apiKey: string) => {
    setSettings(await window.photoCollection.setYouTubeApiKey(apiKey))
  }, [])

  const clearApiKey = useCallback(async () => {
    setSettings(await window.photoCollection.clearYouTubeApiKey())
  }, [])

  const addChannel = useCallback(async (input: string) => {
    setSettings(await window.photoCollection.addYouTubeChannel(input))
  }, [])

  const removeChannel = useCallback(async (channelId: string) => {
    setSettings(await window.photoCollection.removeYouTubeChannel(channelId))
  }, [])

  return { youtubeSettings: settings, saveApiKey, clearApiKey, addChannel, removeChannel }
}
