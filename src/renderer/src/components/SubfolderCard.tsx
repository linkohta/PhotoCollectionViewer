import { RenameInput } from './RenameInput'

interface SubfolderCardProps {
  path: string
  name: string
  subtitle?: string
  isHighlighted: boolean
  isRenaming: boolean
  onSelect: () => void
  onContextMenu: (event: React.MouseEvent) => void
  onRenameSubmit: (newName: string) => Promise<void>
  onRenameCancel: () => void
}

export function SubfolderCard({
  path,
  name,
  subtitle,
  isHighlighted,
  isRenaming,
  onSelect,
  onContextMenu,
  onRenameSubmit,
  onRenameCancel
}: SubfolderCardProps): JSX.Element {
  if (isRenaming) {
    return (
      <div className="subfolder-card renaming">
        <span className="subfolder-icon">📁</span>
        <RenameInput initialName={name} onSubmit={onRenameSubmit} onCancel={onRenameCancel} />
      </div>
    )
  }

  return (
    <button
      type="button"
      className={`subfolder-card ${isHighlighted ? 'highlighted' : ''}`}
      data-path={path}
      onClick={onSelect}
      onContextMenu={onContextMenu}
      title={path}
    >
      <span className="subfolder-icon">📁</span>
      <span className="subfolder-name-group">
        <span className="subfolder-name">{name}</span>
        {subtitle && <span className="subfolder-subtitle">{subtitle}</span>}
      </span>
    </button>
  )
}
