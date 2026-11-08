import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  findGridItem,
  findGridItems,
  gridItemAttributes,
  gridItemPath,
  isGridItem
} from './gridItemElements'

// Just enough of an element for the helpers: its attributes.
const elementWith = (attributes: Record<string, string>): Element =>
  ({
    hasAttribute: (name: string) => name in attributes,
    getAttribute: (name: string) => attributes[name] ?? null
  }) as unknown as Element

// A root that remembers the selectors it was asked for.
const recordingRoot = () => {
  const selectors: string[] = []
  const root = {
    querySelector: (selector: string) => (selectors.push(selector), null),
    querySelectorAll: (selector: string) => (selectors.push(selector), [])
  } as unknown as ParentNode
  return { root, selectors }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('grid item elements', () => {
  it('finds a card by the attribute it was given', () => {
    const card = elementWith(gridItemAttributes('C:\\Photos\\a.png'))

    expect(isGridItem(card)).toBe(true)
    expect(gridItemPath(card)).toBe('C:\\Photos\\a.png')
    expect(isGridItem(elementWith({ class: 'btn' }))).toBe(false)
  })

  it('escapes the path in the selector', () => {
    vi.stubGlobal('CSS', { escape: (value: string) => `<escaped ${value}>` })
    const { root, selectors } = recordingRoot()

    findGridItem(root, 'C:\\Photos\\"a".png')
    findGridItems(root)

    const [attribute] = Object.keys(gridItemAttributes('x'))
    expect(selectors).toEqual([`[${attribute}="<escaped C:\\Photos\\"a".png>"]`, `[${attribute}]`])
  })
})
