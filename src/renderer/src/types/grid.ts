// What a card in the thumbnail grid stands for.
export type GridItemKind = 'subfolder' | 'zip' | 'image'

// Where a subfolder search was made. Opening one of its results remembers
// this, so leaving the result returns to the search instead of to the
// folder's own parent.
export interface SearchOrigin {
  originFolderPath: string
  query: string
}
