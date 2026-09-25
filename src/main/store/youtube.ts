import { safeStorage } from 'electron'
import { readAppStateSlice, writeAppStateSlice, type YouTubeState } from './appState'
import type { YouTubeChannel, YouTubeSettings } from '../../preload/types'

function readStore(): YouTubeState {
  return readAppStateSlice('youtube')
}

function writeStore(state: YouTubeState): void {
  writeAppStateSlice('youtube', state)
}

function toSettings(state: YouTubeState): YouTubeSettings {
  return { hasApiKey: state.encryptedApiKey !== null, channels: state.channels }
}

export function getYouTubeSettings(): YouTubeSettings {
  return toSettings(readStore())
}

// Stored encrypted with safeStorage (DPAPI on Windows) so app-state.json
// never holds the key in plain text. An empty key clears it.
export function setApiKey(apiKey: string): YouTubeSettings {
  const trimmed = apiKey.trim()
  if (!trimmed) return clearApiKey()

  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('この環境ではAPIキーを暗号化して保存できません')
  }

  const state = readStore()
  const encryptedApiKey = safeStorage.encryptString(trimmed).toString('base64')
  const updated = { ...state, encryptedApiKey }
  writeStore(updated)
  return toSettings(updated)
}

export function clearApiKey(): YouTubeSettings {
  const updated = { ...readStore(), encryptedApiKey: null }
  writeStore(updated)
  return toSettings(updated)
}

// Main-process only - never exposed over IPC.
export function getApiKey(): string | null {
  const { encryptedApiKey } = readStore()
  if (!encryptedApiKey) return null

  try {
    return safeStorage.decryptString(Buffer.from(encryptedApiKey, 'base64'))
  } catch {
    // e.g. app-state.json copied from another PC or Windows user
    return null
  }
}

export function addChannel(channel: YouTubeChannel): YouTubeSettings {
  const state = readStore()
  if (state.channels.some((c) => c.id === channel.id)) {
    return toSettings(state)
  }

  const updated = { ...state, channels: [channel, ...state.channels] }
  writeStore(updated)
  return toSettings(updated)
}

export function removeChannel(channelId: string): YouTubeSettings {
  const state = readStore()
  const updated = { ...state, channels: state.channels.filter((c) => c.id !== channelId) }
  writeStore(updated)
  return toSettings(updated)
}
