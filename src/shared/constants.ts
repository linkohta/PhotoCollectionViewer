// How many closed tabs are kept for Ctrl+Shift+T: the renderer trims its list
// to this, and main trims again when the session is saved.
export const MAX_CLOSED_TABS = 25

// The colours a tab group can have, in the order they are offered (Firefox's
// set). A new group gets the first one that the fewest groups use.
export const TAB_GROUP_COLORS = [
  'blue',
  'purple',
  'cyan',
  'orange',
  'yellow',
  'pink',
  'green',
  'gray',
  'red'
] as const
