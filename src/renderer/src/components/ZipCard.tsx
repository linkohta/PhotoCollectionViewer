import type { ZipArchive } from '../../../shared/types'
import { CardFrame } from './CardFrame'
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
  return (
    <CardFrame
      className="subfolder-card zip-card"
      path={zipFile.path}
      title={`${zipFile.path}\n解凍先: ${zipFile.extractPath}`}
      isHighlighted={isHighlighted}
      isRenaming={isRenaming}
      onSelect={onSelect}
      onContextMenu={onContextMenu}
    >
      <span className="subfolder-icon">🗜</span>
      <span className="zip-info">
        {isRenaming ? (
          <RenameInput
            initialName={zipFile.name}
            onSubmit={onRenameSubmit}
            onCancel={onRenameCancel}
          />
        ) : (
          <span className="subfolder-name">{zipFile.name}</span>
        )}
        <span className="zip-size">{formatFileSize(zipFile.size)}</span>
      </span>
    </CardFrame>
  )
}
