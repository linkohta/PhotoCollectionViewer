import { describe, expect, it, vi } from 'vitest'
import type { TabGroup } from '../../../shared/types'
import { createEmptyTab } from '../types/tab'
import { tabMenuItems } from './tabMenu'

const trips: TabGroup = { id: 'G', name: 'Trips', color: 'blue', collapsed: false }
const unnamed: TabGroup = { id: 'H', name: ' ', color: 'red', collapsed: false }

const menuFor = (groupId: string | null) => {
  const deps = {
    groups: [trips, unnamed],
    actions: { addTabToGroup: vi.fn(), removeTabFromGroup: vi.fn() },
    createGroup: vi.fn(),
    closeTab: vi.fn()
  }
  const tab = createEmptyTab(groupId)
  return { ...deps, tab, items: tabMenuItems(tab, deps) }
}

describe('tabMenuItems', () => {
  it('offers a new group and every group for a tab outside any group', () => {
    const { items } = menuFor(null)

    expect(items.map(({ text, color }) => [text, color])).toEqual([
      ['新しいグループに追加', undefined],
      ['グループ「Trips」に追加', 'blue'],
      ['名前のないグループに追加', 'red'],
      ['タブを閉じる', undefined]
    ])
  })

  it('offers the other groups and leaving its own for a tab in a group', () => {
    const { items } = menuFor('G')

    expect(items.map((item) => item.text)).toEqual([
      '新しいグループに追加',
      '名前のないグループに追加',
      'グループから外す',
      'タブを閉じる'
    ])
  })

  it('runs the action of each item for the tab', () => {
    const { items, tab, actions, createGroup, closeTab } = menuFor('G')
    for (const item of items) item.onSelect()

    expect(createGroup).toHaveBeenCalledOnce()
    expect(actions.addTabToGroup).toHaveBeenCalledWith(tab.id, 'H')
    expect(actions.removeTabFromGroup).toHaveBeenCalledWith(tab.id)
    expect(closeTab).toHaveBeenCalledOnce()
  })
})
