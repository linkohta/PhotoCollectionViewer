import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import {
  restoreTabFromSnapshot,
  tabToSnapshot,
  type TabSnapshot,
  type TabState
} from '../types/tab'

const SAVE_DEBOUNCE_MS = 400

interface UseSessionPersistenceArgs {
  tabs: TabState[]
  activeTabId: string
  closedTabs: TabSnapshot[]
  setTabs: Dispatch<SetStateAction<TabState[]>>
  setActiveTabId: Dispatch<SetStateAction<string>>
  setClosedTabs: Dispatch<SetStateAction<TabSnapshot[]>>
}

export function useSessionPersistence({
  tabs,
  activeTabId,
  closedTabs,
  setTabs,
  setActiveTabId,
  setClosedTabs
}: UseSessionPersistenceArgs): { sessionReady: boolean } {
  const [sessionReady, setSessionReady] = useState(false)

  useEffect(() => {
    let cancelled = false

    const loadSession = async (): Promise<void> => {
      const session = await window.photoCollection.getSession()
      if (cancelled) return

      if (session.tabs.length > 0) {
        const restoredTabs = await Promise.all(
          session.tabs.map((snapshot) => restoreTabFromSnapshot(snapshot))
        )
        if (cancelled) return

        const safeIndex = Math.min(Math.max(session.activeTabIndex, 0), restoredTabs.length - 1)

        setTabs(restoredTabs)
        setActiveTabId(restoredTabs[safeIndex]!.id)
      }

      setClosedTabs(session.closedTabs)
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
