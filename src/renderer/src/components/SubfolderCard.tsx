import { useRef } from 'react'
import { useFolderPreview } from '../hooks/useFolderPreview'
import { CardFrame } from './CardFrame'
import { RenameInput } from './RenameInput'

interface SubfolderCardProps {
  path: string
  name: string
  subtitle?: string
  scrollRoot: HTMLElement | null
  isHighlighted: boolean
  isRenaming: boolean
  onSelect: () => void
  onContextMenu: (event: React.MouseEvent) => void
  onRenameSubmit: (newName: string) => Promise<void>
  onRenameCancel: () => void
}

// Explorer-style folder icon: the folder's first image is sandwiched between
// the back panel (with its tab) and the front flap.
function FolderIcon({
  path,
  scrollRoot
}: {
  path: string
  scrollRoot: HTMLElement | null
}): JSX.Element {
  const iconRef = useRef<HTMLDivElement>(null)
  const previewSrc = useFolderPreview(path, iconRef, scrollRoot)

  return (
    <div ref={iconRef} className="subfolder-preview-icon" aria-hidden="true">
      <span className="subfolder-preview-icon-back" />
      {previewSrc && (
        <img className="subfolder-preview-icon-preview" src={previewSrc} alt="" draggable={false} />
      )}
      <span className="subfolder-preview-icon-front" />
    </div>
  )
}

export function SubfolderCard({
  path,
  name,
  subtitle,
  scrollRoot,
  isHighlighted,
  isRenaming,
  onSelect,
  onContextMenu,
  onRenameSubmit,
  onRenameCancel
}: SubfolderCardProps): JSX.Element {
  return (
    <CardFrame
      className="subfolder-card folder-card"
      path={path}
      title={path}
      isHighlighted={isHighlighted}
      isRenaming={isRenaming}
      onSelect={onSelect}
      onContextMenu={onContextMenu}
    >
      <FolderIcon path={path} scrollRoot={scrollRoot} />
      {isRenaming ? (
        <RenameInput initialName={name} onSubmit={onRenameSubmit} onCancel={onRenameCancel} />
      ) : (
        <span className="subfolder-name-group">
          <span className="subfolder-name">{name}</span>
          {subtitle && <span className="subfolder-subtitle">{subtitle}</span>}
        </span>
      )}
    </CardFrame>
  )
}
