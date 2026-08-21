import { useCallback, useEffect, useRef } from 'react'
import { Sidebar } from './components/Sidebar'
import { TabBar } from './components/TabBar'
import { TabContent } from './components/TabContent'
import { clearImagePreloadCache } from './utils/imagePreload'
import { installViewerKeyboardListener } from './utils/viewerKeyboard'
import { useTabs } from './hooks/useTabs'
import { useSessionPersistence } from './hooks/useSessionPersistence'
import { useFavorites } from './hooks/useFavorites'
import { useFolderNavigation } from './hooks/useFolderNavigation'
import './styles/App.css'

export default function App(): JSX.Element {
  const {
    tabs,
    setTabs,
    activeTabId,
    setActiveTabId,
    activeTab,
    closedTabs,
    setClosedTabs,
    updateTab,
    addTab,
    selectTab,
    reorderTabs,
    closeTab,
    restoreClosedTab
  } = useTabs()

  useSessionPersistence({
    tabs,
    activeTabId,
    closedTabs,
    setTabs,
    setActiveTabId,
    setClosedTabs
  })

  const { favorites, toggleFavorite, refreshFavorites } = useFavorites()
  const navigation = useFolderNavigation({ tabs, activeTabId, updateTab, addTab })

  const handleRenameItem = useCallback(
    async (path: string, newName: string) => {
      await navigation.handleRenameItem(activeTab.id, path, newName)
      await refreshFavorites()
    },
    [navigation, activeTab.id, refreshFavorites]
  )

  const mainRef = useRef<HTMLElement>(null)

  const focusMain = useCallback(() => {
    requestAnimationFrame(() => {
      mainRef.current?.focus({ preventScroll: true })
    })
  }, [])

  useEffect(() => installViewerKeyboardListener(), [])

  useEffect(() => {
    if (activeTab.viewMode === 'viewer') {
      focusMain()
    }
  }, [activeTab.id, activeTab.viewMode, focusMain])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 't') {
        event.preventDefault()
        void restoreClosedTab()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [restoreClosedTab])

  const handleSelectTab = useCallback(
    (tabId: string) => {
      clearImagePreloadCache()
      selectTab(tabId)
      focusMain()
    },
    [selectTab, focusMain]
  )

  const handleSelectImage = useCallback(
    (index: number) => {
      navigation.handleSelectImage(activeTab.id, index)
      focusMain()
    },
    [navigation, activeTab.id, focusMain]
  )

  const handleHighlightChange = useCallback(
    (path: string) => {
      updateTab(activeTab.id, (tab) => ({ ...tab, highlightPath: path }))
    },
    [updateTab, activeTab.id]
  )

  const handleToggleFavorite = useCallback(() => {
    if (!activeTab.rootFolderPath) return
    void toggleFavorite(activeTab.rootFolderPath)
  }, [activeTab.rootFolderPath, toggleFavorite])

  const isFavorite = activeTab.rootFolderPath
    ? favorites.some((f) => f.path === activeTab.rootFolderPath)
    : false

  const handleExportSettings = useCallback(async () => {
    try {
      const exported = await window.photoCollection.exportSettings()
      if (exported) {
        window.alert('設定をエクスポートしました。')
      }
    } catch (error) {
      window.alert(error instanceof Error ? error.message : '設定のエクスポートに失敗しました')
    }
  }, [])

  const handleImportSettings = useCallback(async () => {
    try {
      await window.photoCollection.importSettings()
    } catch (error) {
      window.alert(error instanceof Error ? error.message : '設定のインポートに失敗しました')
    }
  }, [])

  return (
    <div className="app">
      <Sidebar
        favorites={favorites}
        currentFolder={activeTab.collection?.path ?? null}
        onOpenDialog={navigation.handleOpenDialog}
        onOpenDialogNewTab={navigation.handleOpenDialogNewTab}
        onSelectFolder={navigation.openFolderInActiveTab}
        onOpenFolderInNewTab={(path) => void navigation.handleOpenFolderInNewTab(path)}
        onToggleFavorite={handleToggleFavorite}
        isFavorite={isFavorite}
        canFavorite={!!activeTab.rootFolderPath}
        onExportSettings={() => void handleExportSettings()}
        onImportSettings={() => void handleImportSettings()}
      />

      <div className="main-area">
        <TabBar
          tabs={tabs}
          activeTabId={activeTabId}
          canRestore={closedTabs.length > 0}
          onSelectTab={handleSelectTab}
          onCloseTab={closeTab}
          onNewTab={() => addTab()}
          onRestoreClosedTab={() => void restoreClosedTab()}
          onReorderTabs={reorderTabs}
        />

        <main ref={mainRef} className="main-content" tabIndex={-1}>
          <TabContent
            key={activeTab.id}
            tab={activeTab}
            favorites={favorites}
            onOpenDialog={navigation.handleOpenDialog}
            onOpenFolder={navigation.openFolderInActiveTab}
            onSelectSubfolder={(path, searchOrigin) =>
              void navigation.handleSelectSubfolder(activeTab.id, path, searchOrigin)
            }
            onConsumePendingSearchQuery={() =>
              updateTab(activeTab.id, (tab) => ({ ...tab, pendingSearchQuery: null }))
            }
            onOpenSubfolderInNewTab={(path) =>
              void navigation.handleOpenSubfolderInNewTab(path, activeTab.rootFolderPath)
            }
            onHighlightChange={handleHighlightChange}
            onSelectZip={(zipFile) => void navigation.handleSelectZip(activeTab.id, zipFile)}
            onOpenZipInNewTab={(zipFile) =>
              void navigation.handleOpenZipInNewTab(zipFile, activeTab.rootFolderPath)
            }
            onGoUp={() => void navigation.handleGoUp(activeTab.id)}
            onRenameItem={handleRenameItem}
            onSelectImage={handleSelectImage}
            onCloseViewer={() => void navigation.handleCloseViewer(activeTab.id)}
            onNavigate={(direction) => navigation.handleNavigate(activeTab.id, direction)}
          />
        </main>
      </div>
    </div>
  )
}
