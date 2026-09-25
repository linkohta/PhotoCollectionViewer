import { useState, type FormEvent, type KeyboardEvent } from 'react'
import type { YouTubeSettings, YouTubeSource } from '../../../preload/index'
import { getIpcErrorMessage } from '../utils/ipcError'
import { ContextMenu } from './ContextMenu'

interface SidebarYouTubeSectionProps {
  settings: YouTubeSettings
  activeChannelId: string | null
  onOpen: (source: YouTubeSource, newTab: boolean) => void
  onAddChannel: (input: string) => Promise<void>
  onRemoveChannel: (channelId: string) => void
  onOpenApiKeyDialog: () => void
}

interface ChannelMenuState {
  x: number
  y: number
  channelId: string
  title: string
}

export function SidebarYouTubeSection({
  settings,
  activeChannelId,
  onOpen,
  onAddChannel,
  onRemoveChannel,
  onOpenApiKeyDialog
}: SidebarYouTubeSectionProps): JSX.Element {
  const [query, setQuery] = useState('')
  const [channelInput, setChannelInput] = useState('')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [channelMenu, setChannelMenu] = useState<ChannelMenuState | null>(null)

  // Enter searches in the active tab, Ctrl+Enter in a new tab.
  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key !== 'Enter' || event.nativeEvent.isComposing) return
    event.preventDefault()
    const trimmed = query.trim()
    if (!trimmed) return
    onOpen({ type: 'search', query: trimmed }, event.ctrlKey)
  }

  const handleAddChannel = async (event: FormEvent): Promise<void> => {
    event.preventDefault()
    if (!channelInput.trim() || adding) return
    setAdding(true)
    setAddError(null)
    try {
      await onAddChannel(channelInput)
      setChannelInput('')
    } catch (error) {
      setAddError(getIpcErrorMessage(error, 'チャンネルを追加できませんでした'))
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="sidebar-section">
      <h2 className="section-title">YouTube</h2>

      {!settings.hasApiKey ? (
        <div className="youtube-setup">
          <p className="empty-text">APIキーを設定すると、動画や配信を一覧表示できます</p>
          <button
            type="button"
            className="btn full-width sidebar-secondary"
            onClick={onOpenApiKeyDialog}
          >
            APIキーを設定
          </button>
        </div>
      ) : (
        <>
          <input
            type="search"
            className="text-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="動画を検索（Ctrl+Enterで新しいタブ）"
          />

          <form className="youtube-add-channel" onSubmit={(event) => void handleAddChannel(event)}>
            <input
              type="text"
              className="text-input"
              value={channelInput}
              onChange={(event) => setChannelInput(event.target.value)}
              placeholder="チャンネルURL / @ハンドル"
              disabled={adding}
            />
            <button type="submit" className="btn" disabled={adding || !channelInput.trim()}>
              {adding ? '…' : '追加'}
            </button>
          </form>
          {addError && <p className="youtube-add-error">{addError}</p>}

          {settings.channels.length === 0 ? (
            <p className="empty-text">登録チャンネルはまだありません</p>
          ) : (
            <ul className="folder-list">
              {settings.channels.map((channel) => (
                <li key={channel.id}>
                  <button
                    type="button"
                    className={`folder-item ${activeChannelId === channel.id ? 'active' : ''}`}
                    onClick={() =>
                      onOpen(
                        { type: 'channel', channelId: channel.id, title: channel.title },
                        false
                      )
                    }
                    onContextMenu={(event) => {
                      event.preventDefault()
                      setChannelMenu({
                        x: event.clientX,
                        y: event.clientY,
                        channelId: channel.id,
                        title: channel.title
                      })
                    }}
                    title={channel.title}
                  >
                    {channel.thumbnailUrl ? (
                      <img className="youtube-channel-icon" src={channel.thumbnailUrl} alt="" />
                    ) : (
                      <span className="folder-icon">▶</span>
                    )}
                    <span className="folder-name">{channel.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {channelMenu && (
        <ContextMenu
          x={channelMenu.x}
          y={channelMenu.y}
          label={channelMenu.title}
          onOpenInNewTab={() =>
            onOpen(
              { type: 'channel', channelId: channelMenu.channelId, title: channelMenu.title },
              true
            )
          }
          onDelete={() => onRemoveChannel(channelMenu.channelId)}
          deleteLabel="登録解除"
          onClose={() => setChannelMenu(null)}
        />
      )}
    </div>
  )
}
