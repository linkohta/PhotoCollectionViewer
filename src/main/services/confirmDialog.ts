import { dialog, type MessageBoxOptions } from 'electron'
import { isConfirmationEnabled, setConfirmationEnabled } from '../store/confirmations'
import type { ConfirmationKind } from '../../shared/types'

// What a confirmation dialog says. Its buttons are always the confirming one
// (confirmLabel) followed by キャンセル.
export interface ConfirmationPrompt {
  type: 'question' | 'warning'
  title: string
  message: string
  detail: string
  confirmLabel: string
  // Focuses キャンセル instead of the confirming button, for actions that are
  // hard to undo.
  defaultToCancel?: boolean
}

const CONFIRM_BUTTON = 0
const CANCEL_BUTTON = 1

const toMessageBoxOptions = (prompt: ConfirmationPrompt): MessageBoxOptions => ({
  type: prompt.type,
  buttons: [prompt.confirmLabel, 'キャンセル'],
  defaultId: prompt.defaultToCancel ? CANCEL_BUTTON : CONFIRM_BUTTON,
  cancelId: CANCEL_BUTTON,
  noLink: true,
  title: prompt.title,
  message: prompt.message,
  detail: prompt.detail,
  checkboxLabel: '今後この確認を表示しない',
  checkboxChecked: false
})

// Shows a confirmation dialog unless the user turned it off, with a "don't
// show again" checkbox. The checkbox only takes effect when the user
// confirms, so cancelling never silently turns the confirmation off.
export async function confirmUnlessDisabled(
  kind: ConfirmationKind,
  prompt: ConfirmationPrompt
): Promise<boolean> {
  if (!isConfirmationEnabled(kind)) return true

  const result = await dialog.showMessageBox(toMessageBoxOptions(prompt))
  const confirmed = result.response === CONFIRM_BUTTON
  if (confirmed && result.checkboxChecked) {
    setConfirmationEnabled(kind, false)
  }
  return confirmed
}
