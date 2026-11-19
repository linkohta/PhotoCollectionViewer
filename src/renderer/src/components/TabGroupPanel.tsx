import { useLayoutEffect, useRef, useState } from 'react'
import { TAB_GROUP_COLORS } from '../../../shared/constants'
import type { TabGroup } from '../../../shared/types'
import { useLatestRef } from '../hooks/useLatestRef'
import { usePopupDismiss } from '../hooks/usePopupDismiss'
import type { TabGroupChanges } from '../state/tabGroups'
import { TAB_GROUP_COLOR_NAMES } from '../utils/tabGroupDisplay'

const PANEL_WIDTH = 260
const WINDOW_MARGIN = 8

interface TabGroupPanelProps {
  group: TabGroup
  // A group just made from a tab: the panel offers 完了 and キャンセル (which
  // ungroups the tab again) instead of the group's actions.
  isNew: boolean
  // The group in the tab bar; the panel opens below it.
  getAnchor: () => HTMLElement | undefined
  onChange: (changes: TabGroupChanges) => void
  onAddTab: () => void
  onUngroup: () => void
  // Closes the group's tabs (Ctrl+Shift+T brings them back).
  onCloseGroup: () => void
  // Closes the group's tabs, keeping the group in the sidebar. Offered only
  // when canSave: some tab of it shows a folder.
  onSaveGroup: () => void
  canSave: boolean
  onClose: () => void
}

// Changes to the name and colour apply as they are made.
export function TabGroupPanel({
  group,
  isNew,
  getAnchor,
  onChange,
  onAddTab,
  onUngroup,
  onCloseGroup,
  onSaveGroup,
  canSave,
  onClose
}: TabGroupPanelProps): JSX.Element {
  const panelRef = useRef<HTMLDivElement>(null)
  usePopupDismiss(panelRef, onClose)

  // A group made a moment ago is only in the tab bar once this has rendered,
  // so the panel is placed once it is on the page (before it is painted).
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)
  const getAnchorRef = useLatestRef(getAnchor)
  const onCloseRef = useLatestRef(onClose)
  useLayoutEffect(() => {
    const rect = getAnchorRef.current()?.getBoundingClientRect()
    if (!rect) {
      onCloseRef.current()
      return
    }
    const maxLeft = window.innerWidth - PANEL_WIDTH - WINDOW_MARGIN
    setPosition({
      top: rect.bottom + 4,
      left: Math.max(WINDOW_MARGIN, Math.min(rect.left, maxLeft))
    })
  }, [getAnchorRef, onCloseRef])

  const title = isNew ? 'タブグループを作成' : 'タブグループを管理'

  return (
    <div
      ref={panelRef}
      className="tab-group-panel"
      style={{ width: PANEL_WIDTH, ...(position ?? { opacity: 0 }) }}
      role="dialog"
      aria-label={title}
    >
      <div className="tab-group-panel-title">{title}</div>
      <input
        className="tab-group-panel-name"
        type="text"
        value={group.name}
        placeholder="グループ名"
        aria-label="グループ名"
        autoFocus
        onChange={(event) => onChange({ name: event.target.value })}
        onKeyDown={(event) => {
          if (event.key === 'Enter') onClose()
        }}
      />
      <div className="tab-group-panel-colors" role="radiogroup" aria-label="グループの色">
        {TAB_GROUP_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            className={`tab-group-swatch tab-group-color-${color}${color === group.color ? ' selected' : ''}`}
            role="radio"
            aria-checked={color === group.color}
            aria-label={TAB_GROUP_COLOR_NAMES[color]}
            title={TAB_GROUP_COLOR_NAMES[color]}
            onClick={() => onChange({ color })}
          />
        ))}
      </div>
      {isNew ? (
        <div className="tab-group-panel-buttons">
          <button type="button" className="btn" onClick={onUngroup}>
            キャンセル
          </button>
          <button type="button" className="btn primary" onClick={onClose}>
            完了
          </button>
        </div>
      ) : (
        <div className="tab-group-panel-actions">
          <button type="button" className="context-menu-item" onClick={onAddTab}>
            グループに新しいタブを追加
          </button>
          <button
            type="button"
            className="context-menu-item"
            onClick={onSaveGroup}
            disabled={!canSave}
            title={canSave ? undefined : 'フォルダを開いているタブがないため保存できません'}
          >
            グループを保存して閉じる
          </button>
          <button type="button" className="context-menu-item" onClick={onUngroup}>
            グループを解除
          </button>
          <button type="button" className="context-menu-item danger" onClick={onCloseGroup}>
            グループを閉じる
          </button>
        </div>
      )}
    </div>
  )
}
