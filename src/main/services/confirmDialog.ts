import { dialog, type MessageBoxOptions } from 'electron'
import { isConfirmationEnabled, setConfirmationEnabled } from '../store/confirmations'
import type { ConfirmationKind } from '../../preload/types'

// Shows a confirmation dialog unless the user turned it off, with a "don't
// show again" checkbox. The first button must be the confirming one. The
// checkbox only takes effect when the user confirms, so cancelling never
// silently turns the confirmation off.
export async function confirmUnlessDisabled(
  kind: ConfirmationKind,
  options: Omit<MessageBoxOptions, 'checkboxLabel' | 'checkboxChecked'>
): Promise<boolean> {
  if (!isConfirmationEnabled(kind)) return true

  const result = await dialog.showMessageBox({
    ...options,
    checkboxLabel: '今後この確認を表示しない',
    checkboxChecked: false
  })
  const confirmed = result.response === 0
  if (confirmed && result.checkboxChecked) {
    setConfirmationEnabled(kind, false)
  }
  return confirmed
}
