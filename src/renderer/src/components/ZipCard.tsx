import type { ZipArchive } from '../../../preload/index'
import { RenameInput } from './RenameInput'
import { formatFileSize } from '../utils/files'

interface ZipCardProps {
  zipFile: ZipArchive
  isHighlighted: boolean
  isRenaming: boolean
  onSelect: () => void
  onContextMenu: (event: React.MouseEvent) => void
  onRenameSubmit: (newName: string) => Promise<void>
  onRenameCancel: () => void
}

export function ZipCard({
  zipFile,
  isHighlighted,
  isRenaming,
  onSelect,
  onContextMenu,
  onRenameSubmit,
  onRenameCancel
}: ZipCardProps): JSX.Element {
  if (isRenaming) {
    return (
      <div className="subfolder-card zip-card renaming">
        <span className="subfolder-icon">🗜</span>
        <span className="zip-info">
          <RenameInput
            initialName={zipFile.name}
            onSubmit={onRenameSubmit}
            onCancel={onRenameCancel}
          />
          <span className="zip-size">{formatFileSize(zipFile.size)}</span>
        </span>
      </div>
    )
  }

  return (
    <button
      type="button"
      className={`subfolder-card zip-card ${isHighlighted ? 'highlighted' : ''}`}
      data-path={zipFile.path}
      onClick={onSelect}
      onContextMenu={onContextMenu}
      title={`${zipFile.path}\n解凍先: ${zipFile.extractPath}`}
    >
      <span className="subfolder-icon">🗜</span>
      <span className="zip-info">
        <span className="subfolder-name">{zipFile.name}</span>
        <span className="zip-size">{formatFileSize(zipFile.size)}</span>
      </span>
    </button>
  )
}
