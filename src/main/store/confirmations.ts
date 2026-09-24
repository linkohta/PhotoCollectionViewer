import { BrowserWindow } from 'electron'
import { readAppStateSlice, writeAppStateSlice } from './appState'
import type { ConfirmationKind, ConfirmationSettings } from '../../preload/types'

export type { ConfirmationKind, ConfirmationSettings }

export function getConfirmations(): ConfirmationSettings {
  return readAppStateSlice('confirmations')
}

export function isConfirmationEnabled(kind: ConfirmationKind): boolean {
  return getConfirmations()[kind]
}

// Also pushes the new settings to every window, since a dialog's
// "don't show again" checkbox changes them without the renderer asking.
export function setConfirmationEnabled(
  kind: ConfirmationKind,
  enabled: boolean
): ConfirmationSettings {
  const updated = { ...getConfirmations(), [kind]: enabled }
  writeAppStateSlice('confirmations', updated)
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send('settings:confirmationsChanged', updated)
  }
  return updated
}
