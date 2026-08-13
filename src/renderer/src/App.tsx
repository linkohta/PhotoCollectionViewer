import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Sidebar } from './components/Sidebar'
import { TabBar } from './components/TabBar'
import { TabContent } from './components/TabContent'
import { clearImagePreloadCache } from './utils/imagePreload'
import { installViewerKeyboardListener } from './utils/viewerKeyboard'
import type { ZipArchive } from '../../preload/index'
import {
  createEmptyTab,
  getTabTitle,
  hasRestorableContent,
  restoreTabFromSnapshot,
  tabToSnapshot,
  type TabSnapshot,
  type TabState
} from './types/tab'
import './styles/App.css'

export default function App(): JSX.Element {
  const initialTab = useMemo(() => createEmptyTab(), [])
  const [tabs, setTabs] = useState<TabState[]>([initialTab])
  const [activeTabId, setActiveTabId] = useState<string>(initialTab.id)
  const [closedTabs, setClosedTabs] = useState<TabSnapshot[]>([])
  const [sessionReady, setSessionReady] = useState(false)
  const [favorites, setFavorites] = useState<
    import('../../preload/index').FavoriteFolder[]
  >([])

  const activeTab = useMemo(
    () => tabs.find((tab) => tab.id === activeTabId) ?? tabs[0]!,
    [tabs, activeTabId]
  )

  const loadFavorites = useCallback(async () => {
    const list = await window.photoCollection.getFavorites()
    setFavorites(list)
  }, [])

  const mainRef = useRef<HTMLElement>(null)

  const focusMain = useCallback(() => {
    requestAnimationFrame(() => {
      mainRef.current?.focus({ preventScroll: true })
    })
  }, [])

  useEffect(() => {
    void loadFavorites()
  }, [loadFavorites])

  useEffect(() => installViewerKeyboardListener(), [])

  useEffect(() => {
    if (activeTab.viewMode === 'viewer') {
      focusMain()
    }
  }, [activeTab.id, activeTab.viewMode, focusMain])

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

        const safeIndex = Math.min(
          Math.max(session.activeTabIndex, 0),
          restoredTabs.length - 1
        )

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
    }, 400)

    return () => {
      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current)
      }
    }
  }, [tabs, activeTabId, closedTabs, sessionReady])

  const updateTab = useCallback((tabId: string, updater: (tab: TabState) => TabState) => {
    setTabs((current) => current.map((tab) => (tab.id === tabId ? updater(tab) : tab)))
  }, [])

  const handleNewTab = useCallback(() => {
    const tab = createEmptyTab()
    setTabs((current) => [...current, tab])
    setActiveTabId(tab.id)
  }, [])

  const handleSelectTab = useCallback(
    (tabId: string) => {
      clearImagePreloadCache()
      setActiveTabId(tabId)
      focusMain()
    },
    [focusMain]
  )

  const handleReorderTabs = useCallback(
    (sourceId: string, targetId: string, insertAfter: boolean) => {
      setTabs((current) => {
        const fromIndex = current.findIndex((tab) => tab.id === sourceId)
        const toIndex = current.findIndex((tab) => tab.id === targetId)
        if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
          return current
        }

        const next = [...current]
        const [moved] = next.splice(fromIndex, 1)
        const adjustedToIndex = next.findIndex((tab) => tab.id === targetId)
        const insertAt = insertAfter ? adjustedToIndex + 1 : adjustedToIndex
        next.splice(insertAt, 0, moved!)
        return next
      })
    },
    []
  )

  const handleCloseTab = useCallback(
    (tabId: string) => {
      setTabs((current) => {
        const closingTab = current.find((tab) => tab.id === tabId)
        if (closingTab && hasRestorableContent(closingTab)) {
          setClosedTabs((closed) => [tabToSnapshot(closingTab), ...closed].slice(0, 25))
        }

        if (current.length === 1) {
          const replacement = createEmptyTab()
          setActiveTabId(replacement.id)
          return [replacement]
        }

        const index = current.findIndex((tab) => tab.id === tabId)
        const next = current.filter((tab) => tab.id !== tabId)

        if (tabId === activeTabId) {
          const nextIndex = Math.min(index, next.length - 1)
          setActiveTabId(next[nextIndex]!.id)
        }

        return next
      })
    },
    [activeTabId]
  )

  const handleRestoreClosedTab = useCallback(async () => {
    if (closedTabs.length === 0) return

    const [snapshot, ...rest] = closedTabs
    if (!snapshot) return

    setClosedTabs(rest)
    const tab = await restoreTabFromSnapshot(snapshot)
    setTabs((current) => [...current, tab])
    setActiveTabId(tab.id)
  }, [closedTabs])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 't') {
        event.preventDefault()
        void handleRestoreClosedTab()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleRestoreClosedTab])

  const browseFolder = useCallback(
    async (
      tabId: string,
      folderPath: string,
      rootPath: string,
      options: { resetRoot?: boolean; fromSubfolder?: boolean } = {}
    ) => {
      updateTab(tabId, (tab) => ({
        ...tab,
        loading: true,
        error: null,
        selectedIndex: null,
        viewMode: 'grid',
        returnToParentOnCloseViewer: false
      }))

      const nextRoot = options.resetRoot ? folderPath : rootPath

      try {
        const result = await window.photoCollection.scanFolder(folderPath, nextRoot)

        const shouldAutoOpenViewer =
          options.fromSubfolder &&
          result.subfolders.length === 0 &&
          result.zipFiles.length === 0 &&
          result.images.length > 0

        updateTab(tabId, (tab) => ({
          ...tab,
          loading: false,
          rootFolderPath: options.resetRoot ? folderPath : tab.rootFolderPath ?? nextRoot,
          collection: result,
          title: getTabTitle(result, options.resetRoot ? folderPath : tab.rootFolderPath ?? nextRoot),
          selectedIndex: shouldAutoOpenViewer ? 0 : null,
          viewMode: shouldAutoOpenViewer ? 'viewer' : 'grid',
          returnToParentOnCloseViewer: shouldAutoOpenViewer
        }))
      } catch {
        updateTab(tabId, (tab) => ({
          ...tab,
          loading: false,
          error: 'フォルダを読み込めませんでした',
          collection: null
        }))
      }
    },
    [updateTab]
  )

  const openFolderInTab = useCallback(
    async (tabId: string, folderPath: string) => {
      await browseFolder(tabId, folderPath, folderPath, { resetRoot: true })
    },
    [browseFolder]
  )

  const openFolderInActiveTab = useCallback(
    async (folderPath: string) => {
      await openFolderInTab(activeTabId, folderPath)
    },
    [activeTabId, openFolderInTab]
  )

  const handleOpenFolderInNewTab = useCallback(
    async (folderPath: string) => {
      const tab = createEmptyTab()
      setTabs((current) => [...current, tab])
      setActiveTabId(tab.id)
      await openFolderInTab(tab.id, folderPath)
    },
    [openFolderInTab]
  )

  const handleOpenDialog = useCallback(async () => {
    const folderPath = await window.photoCollection.openFolderDialog()
    if (folderPath) {
      await openFolderInActiveTab(folderPath)
    }
  }, [openFolderInActiveTab])

  const handleOpenDialogNewTab = useCallback(async () => {
    const folderPath = await window.photoCollection.openFolderDialog()
    if (!folderPath) return

    const tab = createEmptyTab()
    setTabs((current) => [...current, tab])
    setActiveTabId(tab.id)
    await openFolderInTab(tab.id, folderPath)
  }, [openFolderInTab])

  const openSubfolderInTab = useCallback(
    async (tabId: string, subfolderPath: string, rootFolderPath: string) => {
      await browseFolder(tabId, subfolderPath, rootFolderPath, { fromSubfolder: true })
    },
    [browseFolder]
  )

  const handleSelectSubfolder = useCallback(
    async (tabId: string, subfolderPath: string) => {
      const tab = tabs.find((item) => item.id === tabId)
      if (!tab?.rootFolderPath) return
      await openSubfolderInTab(tabId, subfolderPath, tab.rootFolderPath)
    },
    [tabs, openSubfolderInTab]
  )

  const handleOpenSubfolderInNewTab = useCallback(
    async (subfolderPath: string, rootFolderPath: string | null) => {
      const tab = createEmptyTab()
      const rootPath = rootFolderPath ?? subfolderPath
      setTabs((current) => [...current, tab])
      setActiveTabId(tab.id)
      await browseFolder(tab.id, subfolderPath, rootPath, {
        fromSubfolder: true,
        resetRoot: rootFolderPath == null
      })
    },
    [browseFolder]
  )

  const openZipInTab = useCallback(
    async (tabId: string, zipFile: ZipArchive, rootFolderPath: string) => {
      const confirmed = await window.photoCollection.confirmExtractZip(
        zipFile.name,
        zipFile.extractPath,
        zipFile.isExtracted
      )
      if (!confirmed) return

      updateTab(tabId, (tab) => ({
        ...tab,
        loading: true,
        error: null
      }))

      try {
        const folderPath = await window.photoCollection.extractZip(zipFile.path)
        await browseFolder(tabId, folderPath, rootFolderPath, { fromSubfolder: true })
      } catch {
        updateTab(tabId, (tab) => ({
          ...tab,
          loading: false,
          error: 'ZIPファイルを解凍できませんでした'
        }))
      }
    },
    [browseFolder, updateTab]
  )

  const handleSelectZip = useCallback(
    async (tabId: string, zipFile: ZipArchive) => {
      const tab = tabs.find((item) => item.id === tabId)
      if (!tab?.rootFolderPath) return
      await openZipInTab(tabId, zipFile, tab.rootFolderPath)
    },
    [tabs, openZipInTab]
  )

  const handleOpenZipInNewTab = useCallback(
    async (zipFile: ZipArchive, rootFolderPath: string | null) => {
      if (!rootFolderPath) return

      const tab = createEmptyTab()
      setTabs((current) => [...current, tab])
      setActiveTabId(tab.id)
      await openZipInTab(tab.id, zipFile, rootFolderPath)
    },
    [openZipInTab]
  )

  const handleGoUp = useCallback(
    async (tabId: string) => {
      const tab = tabs.find((item) => item.id === tabId)
      if (!tab?.collection?.parentPath || !tab.rootFolderPath) return
      await browseFolder(tabId, tab.collection.parentPath, tab.rootFolderPath)
    },
    [tabs, browseFolder]
  )

  const handleToggleFavorite = useCallback(async () => {
    if (!activeTab.rootFolderPath) return

    const isFavorite = favorites.some((f) => f.path === activeTab.rootFolderPath)
    const updated = isFavorite
      ? await window.photoCollection.removeFavorite(activeTab.rootFolderPath)
      : await window.photoCollection.addFavorite(activeTab.rootFolderPath)
    setFavorites(updated)
  }, [activeTab.rootFolderPath, favorites])

  const handleSelectImage = useCallback(
    (tabId: string, index: number) => {
      updateTab(tabId, (tab) => ({
        ...tab,
        selectedIndex: index,
        viewMode: 'viewer',
        returnToParentOnCloseViewer: false
      }))
      focusMain()
    },
    [updateTab, focusMain]
  )

  const handleCloseViewer = useCallback(
    async (tabId: string) => {
      const tab = tabs.find((item) => item.id === tabId)
      if (!tab) return

      if (
        tab.returnToParentOnCloseViewer &&
        tab.collection?.parentPath &&
        tab.rootFolderPath
      ) {
        await browseFolder(tabId, tab.collection.parentPath, tab.rootFolderPath)
        return
      }

      updateTab(tabId, (current) => ({
        ...current,
        viewMode: 'grid',
        returnToParentOnCloseViewer: false
      }))
    },
    [tabs, browseFolder, updateTab]
  )

  const handleNavigate = useCallback(
    (tabId: string, direction: -1 | 1) => {
      updateTab(tabId, (tab) => {
        if (!tab.collection || tab.selectedIndex === null) return tab

        const total = tab.collection.images.length
        if (total === 0) return tab

        const next = (tab.selectedIndex + direction + total) % total
        return { ...tab, selectedIndex: next }
      })
    },
    [updateTab]
  )

  const isFavorite = activeTab.rootFolderPath
    ? favorites.some((f) => f.path === activeTab.rootFolderPath)
    : false

  return (
    <div className="app">
      <Sidebar
        favorites={favorites}
        currentFolder={activeTab.collection?.path ?? null}
        onOpenDialog={handleOpenDialog}
        onOpenDialogNewTab={handleOpenDialogNewTab}
        onSelectFolder={openFolderInActiveTab}
        onOpenFolderInNewTab={(path) => void handleOpenFolderInNewTab(path)}
        onToggleFavorite={handleToggleFavorite}
        isFavorite={isFavorite}
        canFavorite={!!activeTab.rootFolderPath}
      />

      <div className="main-area">
        <TabBar
          tabs={tabs}
          activeTabId={activeTabId}
          canRestore={closedTabs.length > 0}
          onSelectTab={handleSelectTab}
          onCloseTab={handleCloseTab}
          onNewTab={handleNewTab}
          onRestoreClosedTab={() => void handleRestoreClosedTab()}
          onReorderTabs={handleReorderTabs}
        />

        <main ref={mainRef} className="main-content" tabIndex={-1}>
          <TabContent
            key={activeTab.id}
            tab={activeTab}
            favorites={favorites}
            onOpenDialog={handleOpenDialog}
            onOpenFolder={openFolderInActiveTab}
            onSelectSubfolder={(path) => void handleSelectSubfolder(activeTab.id, path)}
            onOpenSubfolderInNewTab={(path) =>
              void handleOpenSubfolderInNewTab(path, activeTab.rootFolderPath)
            }
            onSelectZip={(zipFile) => void handleSelectZip(activeTab.id, zipFile)}
            onOpenZipInNewTab={(zipFile) => void handleOpenZipInNewTab(zipFile, activeTab.rootFolderPath)}
            onGoUp={() => void handleGoUp(activeTab.id)}
            onSelectImage={(index) => handleSelectImage(activeTab.id, index)}
            onCloseViewer={() => void handleCloseViewer(activeTab.id)}
            onNavigate={(direction) => handleNavigate(activeTab.id, direction)}
          />
        </main>
      </div>
    </div>
  )
}
