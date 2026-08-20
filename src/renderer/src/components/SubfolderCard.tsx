import { RenameInput } from './RenameInput'

interface SubfolderCardProps {
  path: string
  name: string
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
      <span className="subfolder-name">{name}</span>
    </button>
  )
}
