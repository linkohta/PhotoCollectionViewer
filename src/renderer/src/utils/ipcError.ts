// Errors thrown in an ipcMain.handle handler reach the renderer wrapped as
// "Error invoking remote method 'channel': Error: <message>". Returns just
// the original message for display.
export function getIpcErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) return fallback
  const match = /^Error invoking remote method '[^']*': (?:\w*Error: )?([\s\S]*)$/.exec(
    error.message
  )
  return (match ? match[1] : error.message) || fallback
}
