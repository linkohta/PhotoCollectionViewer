import type { FitMode } from '../hooks/useImageTransform'
import { viewerButtonTitle, type ViewerCommand } from '../utils/viewerKeys'

interface ImageViewerToolbarProps {
  fitMode: FitMode
  index: number
  total: number
  imageName: string
  imagePath: string
  showLoadingBadge: boolean
  hideZoomControls?: boolean
  // Runs a button's command, the same way its key does.
  onCommand: (command: ViewerCommand) => void
}

interface ZoomControl {
  command: ViewerCommand
  text: string
  title: string
  // Shown as pressed while the image is in this fit mode.
  activeIn?: FitMode
}

// The buttons that only make sense for an image, not a video.
const ZOOM_CONTROLS: readonly ZoomControl[] = [
  { command: 'fit', text: 'フィット', title: '画面に合わせる', activeIn: 'fit' },
  { command: 'actualSize', text: '原寸', title: '元のサイズで表示', activeIn: 'actual' },
  { command: 'zoomIn', text: '＋', title: '拡大' },
  { command: 'zoomOut', text: '－', title: '縮小' },
  { command: 'rotateClockwise', text: '↻', title: '右回転' },
  { command: 'resetView', text: 'リセット', title: 'リセット' }
]

export function ImageViewerToolbar({
  fitMode,
  index,
  total,
  imageName,
  imagePath,
  showLoadingBadge,
  hideZoomControls,
  onCommand
}: ImageViewerToolbarProps): JSX.Element {
  return (
    <div className="viewer-toolbar">
      <button
        type="button"
        className="btn"
        onClick={() => onCommand('close')}
        title={viewerButtonTitle('一覧に戻る', 'close')}
        tabIndex={-1}
      >
        ← 一覧
      </button>

      <div className="viewer-nav">
        <button
          type="button"
          className="btn"
          onClick={() => onCommand('previous')}
          disabled={total <= 1}
          title={viewerButtonTitle('前の画像', 'previous', '※最初で押すと最後へ')}
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
          onClick={() => onCommand('next')}
          disabled={total <= 1}
          title={viewerButtonTitle('次の画像', 'next', '※最後で押すと最初へ')}
          tabIndex={-1}
        >
          ›
        </button>
      </div>

      {!hideZoomControls && (
        <div className="viewer-controls">
          {ZOOM_CONTROLS.map(({ command, text, title, activeIn }) => (
            <button
              key={command}
              type="button"
              className={activeIn ? `btn ${fitMode === activeIn ? 'active' : ''}` : 'btn'}
              onClick={() => onCommand(command)}
              title={viewerButtonTitle(title, command)}
              tabIndex={-1}
            >
              {text}
            </button>
          ))}
        </div>
      )}

      <button
        type="button"
        className="btn danger"
        onClick={() => onCommand('moveToTrash')}
        title={viewerButtonTitle('ごみ箱へ移動', 'moveToTrash')}
        tabIndex={-1}
      >
        ごみ箱へ移動
      </button>

      <span className="viewer-filename" title={imagePath}>
        {imageName}
        {showLoadingBadge && <span className="viewer-loading-badge"> 読み込み中…</span>}
      </span>
    </div>
  )
}
