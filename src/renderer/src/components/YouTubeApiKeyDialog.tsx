import { useState, type FormEvent } from 'react'
import { getIpcErrorMessage } from '../utils/ipcError'

interface YouTubeApiKeyDialogProps {
  hasApiKey: boolean
  onSave: (apiKey: string) => Promise<void>
  onClear: () => Promise<void>
  onClose: () => void
}

export function YouTubeApiKeyDialog({
  hasApiKey,
  onSave,
  onClear,
  onClose
}: YouTubeApiKeyDialogProps): JSX.Element {
  const [apiKey, setApiKey] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const run = async (action: () => Promise<void>): Promise<void> => {
    setSaving(true)
    setError(null)
    try {
      await action()
      onClose()
    } catch (err) {
      setError(getIpcErrorMessage(err, 'APIキーを保存できませんでした'))
    } finally {
      setSaving(false)
    }
  }

  const handleSubmit = (event: FormEvent): void => {
    event.preventDefault()
    if (!apiKey.trim()) return
    void run(() => onSave(apiKey))
  }

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') onClose()
      }}
    >
      <form
        className="modal"
        onSubmit={handleSubmit}
        role="dialog"
        aria-label="YouTube APIキー設定"
      >
        <h2 className="modal-title">YouTube APIキー設定</h2>
        <p className="modal-text">
          Google Cloud Console でプロジェクトを作成し、「YouTube Data API v3」を有効にしてから
          APIキーを発行して貼り付けてください。キーはこのPC上で暗号化して保存され、
          設定のエクスポートには含まれません。
        </p>
        <p className="modal-text">
          状態: {hasApiKey ? '設定済み（新しいキーを入力すると上書きします）' : '未設定'}
        </p>
        <input
          type="password"
          className="text-input"
          value={apiKey}
          onChange={(event) => setApiKey(event.target.value)}
          placeholder="APIキーを入力"
          autoFocus
          autoComplete="off"
          spellCheck={false}
        />
        {error && <p className="modal-error">{error}</p>}
        <div className="modal-actions">
          {hasApiKey && (
            <button
              type="button"
              className="btn danger"
              onClick={() => void run(onClear)}
              disabled={saving}
            >
              キーを削除
            </button>
          )}
          <button type="button" className="btn" onClick={onClose} disabled={saving}>
            キャンセル
          </button>
          <button type="submit" className="btn primary" disabled={saving || !apiKey.trim()}>
            保存
          </button>
        </div>
      </form>
    </div>
  )
}
