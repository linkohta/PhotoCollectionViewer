// When a main-process handler throws, ipcRenderer.invoke rejects with
// "Error invoking remote method '<channel>': Error: <message>". The handlers
// already throw messages meant for the user, so only that wrapper is removed.
const REMOTE_ERROR_PREFIX = /^Error invoking remote method '[^']*': (?:\w*Error: )?/

export function toUserMessage(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) return fallback
  return error.message.replace(REMOTE_ERROR_PREFIX, '') || fallback
}
