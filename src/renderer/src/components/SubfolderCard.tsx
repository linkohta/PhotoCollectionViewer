import { useRef } from 'react'
import { useFolderPreview } from '../hooks/useFolderPreview'
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
const FolderIcon = ({
  path,
  scrollRoot
}: {
  path: string
  scrollRoot: HTMLElement | null
}): JSX.Element => {
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
  if (isRenaming) {
    return (
      <div className="subfolder-card folder-card renaming">
        <FolderIcon path={path} scrollRoot={scrollRoot} />
        <RenameInput initialName={name} onSubmit={onRenameSubmit} onCancel={onRenameCancel} />
      </div>
    )
  }

  return (
    <button
      type="button"
      className={`subfolder-card folder-card ${isHighlighted ? 'highlighted' : ''}`}
      data-path={path}
      onClick={onSelect}
      onContextMenu={onContextMenu}
      title={path}
    >
      <FolderIcon path={path} scrollRoot={scrollRoot} />
      <span className="subfolder-name-group">
        <span className="subfolder-name">{name}</span>
        {subtitle && <span className="subfolder-subtitle">{subtitle}</span>}
      </span>
    </button>
  )
}
