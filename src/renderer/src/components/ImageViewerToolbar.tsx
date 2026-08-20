import type { FitMode } from '../hooks/useImageTransform'

interface ImageViewerToolbarProps {
  fitMode: FitMode
  index: number
  total: number
  imageName: string
  imagePath: string
  showLoadingBadge: boolean
  onClose: () => void
  onNavigate: (direction: -1 | 1) => void
  onFit: () => void
  onZoomIn: () => void
  onZoomOut: () => void
  onRotate: () => void
  onReset: () => void
}

export function ImageViewerToolbar({
  fitMode,
  index,
  total,
  imageName,
  imagePath,
  showLoadingBadge,
  onClose,
  onNavigate,
  onFit,
  onZoomIn,
  onZoomOut,
  onRotate,
  onReset
}: ImageViewerToolbarProps): JSX.Element {
  return (
    <div className="viewer-toolbar">
      <button
        type="button"
        className="btn"
        onClick={onClose}
        title="一覧に戻る (Esc)"
        tabIndex={-1}
      >
        ← 一覧
      </button>

      <div className="viewer-nav">
        <button
          type="button"
          className="btn"
          onClick={() => onNavigate(-1)}
          disabled={total <= 1}
          title="前の画像 (←) ※最初で押すと最後へ"
          tabIndex={-1}
        >
          ‹
        </button>
        <span className="viewer-counter">
          {index + 1} / {total}
        </span>
        <button
          type="button"
          className="btn"
          onClick={() => onNavigate(1)}
          disabled={total <= 1}
          title="次の画像 (→) ※最後で押すと最初へ"
          tabIndex={-1}
        >
          ›
        </button>
      </div>

      <div className="viewer-controls">
        <button
          type="button"
          className={`btn ${fitMode === 'fit' ? 'active' : ''}`}
          onClick={onFit}
          title="画面に合わせる (F)"
          tabIndex={-1}
        >
          フィット
        </button>
        <button type="button" className="btn" onClick={onZoomIn} title="拡大 (+)" tabIndex={-1}>
          ＋
        </button>
        <button type="button" className="btn" onClick={onZoomOut} title="縮小 (-)" tabIndex={-1}>
          －
        </button>
        <button type="button" className="btn" onClick={onRotate} title="右回転 (R)" tabIndex={-1}>
          ↻
        </button>
        <button type="button" className="btn" onClick={onReset} title="リセット (0)" tabIndex={-1}>
          リセット
        </button>
      </div>

      <span className="viewer-filename" title={imagePath}>
        {imageName}
        {showLoadingBadge && <span className="viewer-loading-badge"> 読み込み中…</span>}
      </span>
    </div>
  )
}
