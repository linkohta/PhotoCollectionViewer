import type { TabGroup, TabGroupColor } from '../../../shared/types'

export const TAB_GROUP_COLOR_NAMES: Record<TabGroupColor, string> = {
  blue: '青',
  purple: '紫',
  cyan: 'シアン',
  orange: 'オレンジ',
  yellow: '黄',
  pink: 'ピンク',
  green: '緑',
  gray: 'グレー',
  red: '赤'
}

// A group may be left unnamed; its label then shows only its colour.
export const groupDisplayName = (group: TabGroup): string =>
  group.name.trim() || '名前のないグループ'
