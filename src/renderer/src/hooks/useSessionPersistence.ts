import { useEffect, useRef, useState } from 'react'
import type { TabSnapshot } from '../../../shared/types'
import { tabToSnapshot, type TabState } from '../types/tab'
import { restoreTabFromSnapshot } from '../utils/restoreTab'

const SAVE_DEBOUNCE_MS = 400

interface UseSessionPersistenceArgs {
  tabs: TabState[]
  activeTabId: string
  closedTabs: TabSnapshot[]
  restoreSession: (tabs: TabState[], activeTabIndex: number, closedTabs: TabSnapshot[]) => void
}

export function useSessionPersistence({
  tabs,
  activeTabId,
  closedTabs,
  restoreSession
}: UseSessionPersistenceArgs): { sessionReady: boolean } {
  const [sessionReady, setSessionReady] = useState(false)

  useEffect(() => {
    let cancelled = false

    const loadSession = async (): Promise<void> => {
      const session = await window.photoCollection.getSession()
      if (cancelled) return

      const restoredTabs = await Promise.all(
        session.tabs.map((snapshot) => restoreTabFromSnapshot(snapshot))
      )
      if (cancelled) return

      restoreSession(restoredTabs, session.activeTabIndex, session.closedTabs)
      setSessionReady(true)
    }

    void loadSession()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const saveTimerRef = useRef<number | null>(null)

  useEffect(() => {
    if (!sessionReady) return

    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current)
    }

    saveTimerRef.current = window.setTimeout(() => {
      const activeTabIndex = Math.max(
        0,
        tabs.findIndex((tab) => tab.id === activeTabId)
      )

      void window.photoCollection.saveSession({
        tabs: tabs.map(tabToSnapshot),
        activeTabIndex,
        closedTabs
      })
    }, SAVE_DEBOUNCE_MS)

    return () => {
      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current)
      }
    }
  }, [tabs, activeTabId, closedTabs, sessionReady])

  return { sessionReady }
}
