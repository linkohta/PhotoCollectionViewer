import type { TabGroupColor } from '../../../shared/types'

// One entry of a PopupMenu. Choosing it runs onSelect and closes the menu.
export interface PopupMenuItem {
  key: string
  text: string
  danger?: boolean
  // Shows a dot of this tab group colour before the text.
  color?: TabGroupColor
  onSelect: () => void
}
