import { useCallback, useEffect, useRef } from 'react'
import { Sidebar } from './components/Sidebar'
import { TabBar } from './components/TabBar'
import { TabContent } from './components/TabContent'
import { clearImagePreloadCache } from './utils/imagePreload'
import { installViewerKeyboardListener } from './utils/viewerKeyboard'
import { toUserMessage } from './utils/errorMessage'
import { useTabs } from './hooks/useTabs'
import { useSessionPersistence } from './hooks/useSessionPersistence'
import { useFavorites } from './hooks/useFavorites'
import { useFolderNavigation } from './hooks/useFolderNavigation'
import { useActiveTabActions } from './hooks/useActiveTabActions'
import { useConfirmationSettings } from './hooks/useConfirmationSettings'
import './styles/App.css'

export default function App(): JSX.Element {
  const {
    tabs,
    activeTabId,
    activeTab,
    closedTabs,
    updateTab,
    addTab,
    selectTab,
    reorderTabs,
    closeTab,
    restoreClosedTab,
    restoreSession
  } = useTabs()

  useSessionPersistence({ tabs, activeTabId, closedTabs, restoreSession })

  const { favorites, toggleFavorite, refreshFavorites } = useFavorites()
  const navigation = useFolderNavigation({ tabs, activeTabId, updateTab, addTab })
  const { confirmations, setConfirmation } = useConfirmationSettings()

  const mainRef = useRef<HTMLElement>(null)

  const focusMain = useCallback(() => {
    requestAnimationFrame(() => {
      mainRef.current?.focus({ preventScroll: true })
    })
  }, [])

  const tabActions = useActiveTabActions({
    tabId: activeTab.id,
    rootFolderPath: activeTab.rootFolderPath,
    navigation,
    updateTab,
    focusMain,
    refreshFavorites
  })

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
      window.alert(toUserMessage(error, '設定のエクスポートに失敗しました'))
    }
  }, [])

  const handleImportSettings = useCallback(async () => {
    try {
      await window.photoCollection.importSettings()
    } catch (error) {
      window.alert(toUserMessage(error, '設定のインポートに失敗しました'))
    }
  }, [])

  return (
    <div className="app">
      <Sidebar
        favorites={favorites}
        currentFolder={activeTab.collection?.path ?? null}
        onOpenDialog={() => void navigation.handleOpenDialog()}
        onOpenDialogNewTab={() => void navigation.handleOpenDialogNewTab()}
        onSelectFolder={(path) => void navigation.openFolderInActiveTab(path)}
        onOpenFolderInNewTab={(path) => void navigation.handleOpenFolderInNewTab(path)}
        onToggleFavorite={handleToggleFavorite}
        isFavorite={isFavorite}
        canFavorite={!!activeTab.rootFolderPath}
        onExportSettings={() => void handleExportSettings()}
        onImportSettings={() => void handleImportSettings()}
        confirmations={confirmations}
        onChangeConfirmation={(kind, enabled) => void setConfirmation(kind, enabled)}
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
            onOpenDialog={() => void navigation.handleOpenDialog()}
            onOpenFolder={(path) => void navigation.openFolderInActiveTab(path)}
            actions={tabActions}
          />
        </main>
      </div>
    </div>
  )
}
