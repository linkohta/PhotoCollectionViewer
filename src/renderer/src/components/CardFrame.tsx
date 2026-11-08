import type { MouseEvent, ReactNode, Ref } from 'react'

interface CardFrameProps {
  // The card's own classes, e.g. "subfolder-card zip-card".
  className: string
  path: string
  title: string
  isHighlighted: boolean
  isRenaming: boolean
  onSelect: () => void
  onContextMenu: (event: MouseEvent) => void
  frameRef?: Ref<HTMLElement>
  children: ReactNode
}

// The outside of a grid card. Normally a button that opens the item, which
// the grid's keyboard navigation finds by its data-path. While the item is
// being renamed it is a plain box instead: clicking the name field must not
// open the item, and the card has no data-path or context menu then.
export function CardFrame({
  className,
  path,
  title,
  isHighlighted,
  isRenaming,
  onSelect,
  onContextMenu,
  frameRef,
  children
}: CardFrameProps): JSX.Element {
  if (isRenaming) {
    return (
      <div ref={frameRef as Ref<HTMLDivElement>} className={`${className} renaming`}>
        {children}
      </div>
    )
  }

  return (
    <button
      ref={frameRef as Ref<HTMLButtonElement>}
      type="button"
      className={`${className} ${isHighlighted ? 'highlighted' : ''}`}
      data-path={path}
      onClick={onSelect}
      onContextMenu={onContextMenu}
      title={title}
    >
      {children}
    </button>
  )
}
