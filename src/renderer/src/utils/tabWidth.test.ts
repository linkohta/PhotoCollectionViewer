import { describe, expect, it } from 'vitest'
import { TAB_MAX_WIDTH, TAB_MIN_WIDTH, fitTabWidth } from './tabWidth'

describe('fitTabWidth', () => {
  it('gives the widest tabs while they fit', () => {
    expect(fitTabWidth(1000, 0, 1)).toBe(TAB_MAX_WIDTH)
    expect(fitTabWidth(1000, 0, 4)).toBe(TAB_MAX_WIDTH)
  })

  it('shares the list between the tabs once they no longer fit', () => {
    expect(fitTabWidth(1000, 0, 5)).toBe(200)
    expect(fitTabWidth(1000, 0, 8)).toBe(125)
  })

  it('leaves room for the group labels', () => {
    expect(fitTabWidth(1000, 100, 6)).toBe(150)
  })

  it('rounds down, so the tabs never come to more than the list', () => {
    expect(fitTabWidth(1000, 0, 7)).toBe(142)
    expect(fitTabWidth(1000.5, 0.25, 7)).toBe(142)
  })

  it('stops at the narrowest width, past which the list scrolls', () => {
    expect(fitTabWidth(1000, 0, 12)).toBe(TAB_MIN_WIDTH)
    expect(fitTabWidth(1000, 0, 100)).toBe(TAB_MIN_WIDTH)
    expect(fitTabWidth(100, 300, 2)).toBe(TAB_MIN_WIDTH)
    // Before the list is laid out
    expect(fitTabWidth(0, 0, 3)).toBe(TAB_MIN_WIDTH)
  })

  it('gives the widest width when there are no tabs', () => {
    expect(fitTabWidth(1000, 0, 0)).toBe(TAB_MAX_WIDTH)
  })
})
