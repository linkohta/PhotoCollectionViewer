import type { TabGroup } from '../../../shared/types'
import type { TabGroupActions } from '../hooks/useTabs'
import type { PopupMenuItem } from '../types/menu'
import type { TabState } from '../types/tab'
import { groupDisplayName } from './tabGroupDisplay'

interface TabMenuDeps {
  // In the order of the tab bar.
  groups: readonly TabGroup[]
  actions: Pick<TabGroupActions, 'addTabToGroup' | 'removeTabFromGroup'>
  // Makes a new group of the tab (and opens its panel).
  createGroup: () => void
  closeTab: () => void
}

const addToGroupText = (group: TabGroup): string =>
  group.name.trim() ? `グループ「${groupDisplayName(group)}」に追加` : '名前のないグループに追加'

// What the context menu of a tab offers: a new group, every other group,
// leaving its group, and closing it.
export const tabMenuItems = (
  tab: TabState,
  { groups, actions, createGroup, closeTab }: TabMenuDeps
): PopupMenuItem[] => [
  { key: 'new-group', text: '新しいグループに追加', onSelect: createGroup },
  ...groups
    .filter((group) => group.id !== tab.groupId)
    .map((group) => ({
      key: `group-${group.id}`,
      text: addToGroupText(group),
      color: group.color,
      onSelect: () => actions.addTabToGroup(tab.id, group.id)
    })),
  ...(tab.groupId === null
    ? []
    : [
        {
          key: 'leave-group',
          text: 'グループから外す',
          onSelect: () => actions.removeTabFromGroup(tab.id)
        }
      ]),
  { key: 'close', text: 'タブを閉じる', onSelect: closeTab }
]
