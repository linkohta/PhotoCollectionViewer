// The grid's cards carry the path of their item in this attribute (set by
// CardFrame). The keyboard navigation and the scroll restore find the cards
// through it, so this is the only place that spells it out.
const GRID_ITEM_ATTRIBUTE = 'data-path'

// The props that make an element the card of the item at path.
export const gridItemAttributes = (path: string): Record<typeof GRID_ITEM_ATTRIBUTE, string> => ({
  [GRID_ITEM_ATTRIBUTE]: path
})

export const isGridItem = (element: Element): boolean => element.hasAttribute(GRID_ITEM_ATTRIBUTE)

export const gridItemPath = (element: Element): string =>
  element.getAttribute(GRID_ITEM_ATTRIBUTE) ?? ''

// The card of the item at path under root, if it is shown.
export const findGridItem = (root: ParentNode, path: string): HTMLElement | null =>
  root.querySelector<HTMLElement>(`[${GRID_ITEM_ATTRIBUTE}="${CSS.escape(path)}"]`)

// Every card under root, in document order.
export const findGridItems = (root: ParentNode): HTMLElement[] =>
  Array.from(root.querySelectorAll<HTMLElement>(`[${GRID_ITEM_ATTRIBUTE}]`))
