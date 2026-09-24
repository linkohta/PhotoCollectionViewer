import { useCallback, useEffect, useState } from 'react'
import type { ConfirmationKind, ConfirmationSettings } from '../../../preload/index'

// Mirrors which confirmation dialogs are enabled. Stays in sync when a
// dialog's "don't show again" checkbox turns one off in the main process.
export function useConfirmationSettings() {
  const [confirmations, setConfirmations] = useState<ConfirmationSettings | null>(null)

  useEffect(() => {
    void window.photoCollection.getConfirmations().then(setConfirmations)
    return window.photoCollection.onConfirmationsChanged(setConfirmations)
  }, [])

  const setConfirmation = useCallback(async (kind: ConfirmationKind, enabled: boolean) => {
    const updated = await window.photoCollection.setConfirmation(kind, enabled)
    setConfirmations(updated)
  }, [])

  return { confirmations, setConfirmation }
}
