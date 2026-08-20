import { useEffect, useMemo, useRef, useState } from 'react'
import type { FolderCollection, ImageFile, ZipArchive } from '../../../preload/index'
import { isTypingTarget } from '../utils/imagePreload'
import { registerViewerKeyboardHandler } from '../utils/viewerKeyboard'
import { ContextMenu } from './ContextMenu'
import { SubfolderCard } from './SubfolderCard'
import { ThumbnailCard } from './ThumbnailCard'
import { ZipCard } from './ZipCard'

// Keyed by folder path so returning to a folder (e.g. via "go up" or a
// breadcrumb) restores the scroll position it was left at, instead of
// always snapping back to the top.
const gridScrollPositions = new Map<string, number>()

interface ThumbnailGridProps {
  collection: FolderCollection
  rootFolderPath: string | null
  highlightPath: string | null
  onHighlightChange: (path: string) => void
  onSelect: (index: number) => void
  onSelectSubfolder: (path: string) => void
  onOpenSubfolderInNewTab: (path: string) => void
  onSelectZip: (zipFile: ZipArchive) => void
  onOpenZipInNewTab: (zipFile: ZipArchive) => void
  onGoUp: () => void
  onRenameItem: (path: string, newName: string) => Promise<void>
}

interface NavigableItem {
  path: string
  kind: 'subfolder' | 'zip' | 'image'
  zipFile?: ZipArchive
  imageIndex?: number
}

// Arrow-key/Enter navigation is only meant to move the highlight between the
// grid's own cards (identified by their data-path attribute) - buttons
// elsewhere in the app (sidebar, tab bar, breadcrumbs, toolbar) are plain
// buttons too and must keep handling their own Enter/Space activation.
function blocksGridKeyNavigation(target: EventTarget | null): boolean {
  if (isTypingTarget(target)) return true
  if (!(target instanceof HTMLElement)) return false
  return target.tagName === 'BUTTON' && !target.hasAttribute('data-path')
}

interface ItemMenuState {
  x: number
  y: number
  path: string
  name: string
  kind: 'subfolder' | 'zip' | 'image'
  zipFile?: ZipArchive
}

interface RenamingState {
  kind: 'subfolder' | 'zip' | 'image'
  path: string
}

function joinPath(base: string, segment: string): string {
  const sep = base.includes('\\') ? '\\' : '/'
  const trimmed = base.replace(/[/\\]+$/, '')
  return `${trimmed}${sep}${segment}`
}

function buildBreadcrumb(
  collection: FolderCollection,
  rootFolderPath: string | null
): { label: string; path: string }[] {
  if (!rootFolderPath) return [{ label: collection.name, path: collection.path }]

  const rootNorm = rootFolderPath.replace(/\\/g, '/').toLowerCase()
  const currentNorm = collection.path.replace(/\\/g, '/')
  const relative = currentNorm.toLowerCase().startsWith(rootNorm)
    ? currentNorm.slice(rootFolderPath.length).replace(/^[/\\]/, '')
    : ''

  const crumbs: { label: string; path: string }[] = [
    {
      label: rootFolderPath.split(/[/\\]/).pop() ?? rootFolderPath,
      path: rootFolderPath
    }
  ]

  if (!relative) return crumbs

  const parts = relative.split(/[/\\]/).filter(Boolean)
  let accumulated = rootFolderPath

  for (const part of parts) {
    accumulated = joinPath(accumulated, part)
    crumbs.push({ label: part, path: accumulated })
  }

  return crumbs
}

function buildCountLabel(collection: FolderCollection): string {
  const parts: string[] = []

  if (collection.subfolders.length > 0) {
    parts.push(`${collection.subfolders.length} フォルダ`)
  }
  if (collection.zipFiles.length > 0) {
    parts.push(`${collection.zipFiles.length} ZIP`)
  }
  parts.push(`${collection.images.length} 枚`)

  return parts.join(' · ')
}

export function ThumbnailGrid({
  collection,
  rootFolderPath,
  highlightPath,
  onHighlightChange,
  onSelect,
  onSelectSubfolder,
  onOpenSubfolderInNewTab,
  onSelectZip,
  onOpenZipInNewTab,
  onGoUp,
  onRenameItem
}: ThumbnailGridProps): JSX.Element {
  const [itemMenu, setItemMenu] = useState<ItemMenuState | null>(null)
  const [renaming, setRenaming] = useState<RenamingState | null>(null)
  const [scrollRoot, setScrollRoot] = useState<HTMLDivElement | null>(null)
  const restoredPathRef = useRef<string | null>(null)

  useEffect(() => {
    if (!scrollRoot || restoredPathRef.current === collection.path) return
    restoredPathRef.current = collection.path

    if (highlightPath) {
      const target = scrollRoot.querySelector(`[data-path="${CSS.escape(highlightPath)}"]`)
      if (target) {
        target.scrollIntoView({ block: 'center' })
        return
      }
    }

    scrollRoot.scrollTop = gridScrollPositions.get(collection.path) ?? 0
  }, [scrollRoot, collection.path, highlightPath])

  // Keeps the highlighted card in view as the user moves the highlight with
  // arrow keys, without re-triggering the initial mount/restore effect above.
  useEffect(() => {
    if (!scrollRoot || !highlightPath || restoredPathRef.current !== collection.path) return
    const target = scrollRoot.querySelector(`[data-path="${CSS.escape(highlightPath)}"]`)
    target?.scrollIntoView({ block: 'nearest' })
  }, [scrollRoot, collection.path, highlightPath])

  const navigableItems = useMemo<NavigableItem[]>(
    () => [
      ...collection.subfolders.map((subfolder) => ({ path: subfolder.path, kind: 'subfolder' as const })),
      ...collection.zipFiles.map((zipFile) => ({ path: zipFile.path, kind: 'zip' as const, zipFile })),
      ...collection.images.map((image, imageIndex) => ({
        path: image.path,
        kind: 'image' as const,
        imageIndex
      }))
    ],
    [collection]
  )

  // Finds the item whose card sits in the next/previous visual row, closest
  // horizontally to the current card - unlike flat list order, this follows
  // the actual multi-column layout (subfolders/zip/images each wrap into
  // their own row count depending on the window width).
  const findRowNeighborPath = (direction: 1 | -1): string | null => {
    if (!scrollRoot || !highlightPath) return null
    const currentEl = scrollRoot.querySelector(`[data-path="${CSS.escape(highlightPath)}"]`)
    if (!currentEl) return null

    const currentRect = currentEl.getBoundingClientRect()
    const centerX = currentRect.left + currentRect.width / 2

    const candidates = Array.from(scrollRoot.querySelectorAll<HTMLElement>('[data-path]'))
      .filter((el) => el !== currentEl)
      .map((el) => ({ path: el.dataset.path ?? '', rect: el.getBoundingClientRect() }))
      .filter(({ rect }) =>
        direction === 1 ? rect.top > currentRect.top + 1 : rect.top < currentRect.top - 1
      )
    if (candidates.length === 0) return null

    const nearestRowTop = candidates.reduce(
      (best, c) => (direction === 1 ? Math.min(best, c.rect.top) : Math.max(best, c.rect.top)),
      direction === 1 ? Infinity : -Infinity
    )
    const sameRow = candidates.filter((c) => Math.abs(c.rect.top - nearestRowTop) <= 4)
    sameRow.sort(
      (a, b) =>
        Math.abs(a.rect.left + a.rect.width / 2 - centerX) -
        Math.abs(b.rect.left + b.rect.width / 2 - centerX)
    )
    return sameRow[0]?.path ?? null
  }

  useEffect(() => {
    return registerViewerKeyboardHandler((event) => {
      if (blocksGridKeyNavigation(event.target) || navigableItems.length === 0) return

      const currentIndex = highlightPath
        ? navigableItems.findIndex((item) => item.path === highlightPath)
        : -1

      switch (event.key) {
        case 'ArrowRight': {
          event.preventDefault()
          const next = navigableItems[(currentIndex + 1) % navigableItems.length]
          onHighlightChange(next.path)
          break
        }
        case 'ArrowLeft': {
          event.preventDefault()
          const prevIndex = currentIndex <= 0 ? navigableItems.length - 1 : currentIndex - 1
          onHighlightChange(navigableItems[prevIndex].path)
          break
        }
        case 'ArrowDown': {
          event.preventDefault()
          if (currentIndex < 0) {
            onHighlightChange(navigableItems[0].path)
            break
          }
          const next = findRowNeighborPath(1)
          if (next) onHighlightChange(next)
          break
        }
        case 'ArrowUp': {
          event.preventDefault()
          if (currentIndex < 0) {
            onHighlightChange(navigableItems[navigableItems.length - 1].path)
            break
          }
          const prev = findRowNeighborPath(-1)
          if (prev) onHighlightChange(prev)
          break
        }
        case 'Enter': {
          if (currentIndex < 0) return
          event.preventDefault()
          const item = navigableItems[currentIndex]
          if (item.kind === 'subfolder') {
            onSelectSubfolder(item.path)
          } else if (item.kind === 'zip' && item.zipFile) {
            onSelectZip(item.zipFile)
          } else if (item.kind === 'image' && item.imageIndex !== undefined) {
            onSelect(item.imageIndex)
          }
          break
        }
        default:
          break
      }
    })
  }, [
    navigableItems,
    highlightPath,
    scrollRoot,
    onHighlightChange,
    onSelectSubfolder,
    onSelectZip,
    onSelect
  ])

  const handleGridScroll = (event: React.UIEvent<HTMLDivElement>): void => {
    gridScrollPositions.set(collection.path, event.currentTarget.scrollTop)
  }

  const handleRenameSubmit = async (newName: string): Promise<void> => {
    if (!renaming) return
    await onRenameItem(renaming.path, newName)
    setRenaming(null)
  }

  const openItemMenu = (
    event: { clientX: number; clientY: number; preventDefault: () => void },
    path: string,
    name: string,
    kind: ItemMenuState['kind'],
    zipFile?: ZipArchive
  ): void => {
    event.preventDefault()
    setItemMenu({ x: event.clientX, y: event.clientY, path, name, kind, zipFile })
  }

  const breadcrumbs = buildBreadcrumb(collection, rootFolderPath)
  const isEmpty =
    collection.subfolders.length === 0 &&
    collection.zipFiles.length === 0 &&
    collection.images.length === 0
  const hasSectionsAboveImages = collection.subfolders.length > 0 || collection.zipFiles.length > 0

  return (
    <div className="grid-container">
      <header className="grid-header">
        <div className="grid-header-main">
          <nav className="breadcrumb" aria-label="フォルダパス">
            {collection.parentPath && (
              <button type="button" className="btn breadcrumb-up" onClick={onGoUp} title="上のフォルダへ">
                ↑
              </button>
            )}
            {breadcrumbs.map((crumb, index) => (
              <span key={crumb.path} className="breadcrumb-item">
                {index > 0 && <span className="breadcrumb-sep">›</span>}
                <button
                  type="button"
                  className={`breadcrumb-link ${index === breadcrumbs.length - 1 ? 'current' : ''}`}
                  onClick={() => onSelectSubfolder(crumb.path)}
                  disabled={index === breadcrumbs.length - 1}
                  title={crumb.label}
                >
                  {crumb.label}
                </button>
              </span>
            ))}
          </nav>
          <span className="image-count">{buildCountLabel(collection)}</span>
        </div>
      </header>

      <div ref={setScrollRoot} className="grid-scroll" onScroll={handleGridScroll}>
        {collection.subfolders.length > 0 && (
          <section className="subfolder-section">
            <h3 className="section-label">サブフォルダ</h3>
            <div className="subfolder-grid">
              {collection.subfolders.map((subfolder) => (
                <SubfolderCard
                  key={subfolder.path}
                  path={subfolder.path}
                  name={subfolder.name}
                  isHighlighted={subfolder.path === highlightPath}
                  isRenaming={renaming?.kind === 'subfolder' && renaming.path === subfolder.path}
                  onSelect={() => onSelectSubfolder(subfolder.path)}
                  onContextMenu={(event) => openItemMenu(event, subfolder.path, subfolder.name, 'subfolder')}
                  onRenameSubmit={handleRenameSubmit}
                  onRenameCancel={() => setRenaming(null)}
                />
              ))}
            </div>
          </section>
        )}

        {collection.zipFiles.length > 0 && (
          <section className="subfolder-section">
            <h3 className="section-label">ZIPファイル</h3>
            <div className="subfolder-grid">
              {collection.zipFiles.map((zipFile) => (
                <ZipCard
                  key={zipFile.path}
                  zipFile={zipFile}
                  isHighlighted={zipFile.path === highlightPath}
                  isRenaming={renaming?.kind === 'zip' && renaming.path === zipFile.path}
                  onSelect={() => onSelectZip(zipFile)}
                  onContextMenu={(event) => openItemMenu(event, zipFile.path, zipFile.name, 'zip', zipFile)}
                  onRenameSubmit={handleRenameSubmit}
                  onRenameCancel={() => setRenaming(null)}
                />
              ))}
            </div>
          </section>
        )}

        {collection.images.length > 0 && (
          <section className="thumbnail-section">
            {hasSectionsAboveImages && <h3 className="section-label">画像</h3>}
            <div className="thumbnail-grid">
              {collection.images.map((image: ImageFile, index) => (
                <ThumbnailCard
                  key={image.path}
                  image={image}
                  index={index}
                  scrollRoot={scrollRoot}
                  isHighlighted={image.path === highlightPath}
                  onSelect={onSelect}
                  onContextMenu={(event, targetImage) =>
                    openItemMenu(event, targetImage.path, targetImage.name, 'image')
                  }
                  isRenaming={renaming?.kind === 'image' && renaming.path === image.path}
                  onRenameSubmit={handleRenameSubmit}
                  onRenameCancel={() => setRenaming(null)}
                />
              ))}
            </div>
          </section>
        )}

        {isEmpty && (
          <div className="grid-empty">
            <p>このフォルダにサブフォルダ・ZIP・画像はありません</p>
          </div>
        )}
      </div>

      {itemMenu && (
        <ContextMenu
          x={itemMenu.x}
          y={itemMenu.y}
          label={itemMenu.name}
          onOpenInNewTab={
            itemMenu.kind === 'image'
              ? undefined
              : () =>
                  itemMenu.kind === 'zip' && itemMenu.zipFile
                    ? onOpenZipInNewTab(itemMenu.zipFile)
                    : onOpenSubfolderInNewTab(itemMenu.path)
          }
          onRename={() => setRenaming({ kind: itemMenu.kind, path: itemMenu.path })}
          onClose={() => setItemMenu(null)}
        />
      )}
    </div>
  )
}
